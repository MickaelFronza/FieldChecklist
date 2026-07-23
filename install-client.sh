#!/bin/bash
# Instala um cliente novo do Field Checklist atrás de um Traefik que JÁ ESTÁ
# rodando: cadastra os subdomínios na Cloudflare, sobe a stack isolada do
# cliente (mariadb + redis + minio + backend + worker + frontend) com as
# labels certas pro Traefik emitir o certificado sozinho, roda as migrations
# e cria o usuário admin (via ADMIN_EMAIL/ADMIN_PASSWORD, o bootstrap já
# existente do backend - não precisa de nenhum endpoint de registro).
#
# Cada cliente ganha 3 subdomínios:
#   $subdominio             -> painel web (frontend)
#   $slug-api.<resto>       -> backend/API
#   $slug-storage.<resto>   -> MinIO (fotos dos checklists - o navegador do
#                              gestor busca a foto direto daqui via link
#                              pré-assinado, não passa pelo backend)
# ("$slug-api"/"$slug-storage" em vez de "api.$subdominio"/"storage.$subdominio":
# o certificado Universal SSL grátis da Cloudflare (*.dominio.com) cobre só
# um nível de subdomínio - dois níveis exigem Advanced Certificate Manager,
# que é pago.)
#
# Pré-requisito: um Traefik já rodando numa rede Docker (infra/.env ->
# TRAEFIK_NETWORK) com um certResolver configurado (infra/.env ->
# TRAEFIK_CERT_RESOLVER) - se os nomes não baterem com o Traefik que você já
# tem, ajuste essas variáveis (e TRAEFIK_ENTRYPOINT) antes de instalar o
# primeiro cliente.
#
# Uso: ./install-client.sh <subdominio>
# Ex.:  ./install-client.sh cliente1.seudominio.com.br

set -euo pipefail

if [ $# -ne 1 ]; then
  echo "Uso: $0 <subdominio>" >&2
  echo "Ex.: $0 cliente1.seudominio.com.br" >&2
  exit 1
fi

SUBDOMAIN="$1"
SLUG=$(echo "$SUBDOMAIN" | cut -d. -f1 | tr 'A-Z' 'a-z' | tr -cd 'a-z0-9-')
if [ -z "$SLUG" ]; then
  echo "Não foi possível derivar um identificador de cliente a partir de '$SUBDOMAIN'." >&2
  exit 1
fi

REPO_ROOT="$(cd "$(dirname "$0")" && pwd)"
CLIENT_DIR="$REPO_ROOT/clients/$SLUG"
FRONTEND_DOMAIN="$SUBDOMAIN"
DOMAIN_ROOT="${SUBDOMAIN#*.}"
BACKEND_DOMAIN="$SLUG-api.$DOMAIN_ROOT"
STORAGE_DOMAIN="$SLUG-storage.$DOMAIN_ROOT"

if [ -d "$CLIENT_DIR" ]; then
  echo "Cliente '$SLUG' já existe em $CLIENT_DIR. Use ./deprovision-client.sh $SLUG antes de reinstalar." >&2
  exit 1
fi

# shellcheck disable=SC1091
source "$REPO_ROOT/infra/lib/check-deps.sh"
check_dependencies

# --- config global (gerada na primeira instalação, reaproveitada depois) ---
GLOBAL_ENV="$REPO_ROOT/infra/.env"
if [ -f "$GLOBAL_ENV" ]; then
  # shellcheck disable=SC1091
  source "$GLOBAL_ENV"
else
  echo "==> Primeira instalação: gerando infra/.env"
  cp "$REPO_ROOT/infra/.env.example" "$GLOBAL_ENV"
  # shellcheck disable=SC1091
  source "$GLOBAL_ENV"
fi

if [ -z "${CLOUDFLARE_API_TOKEN:-}" ]; then
  read -rs -p "Token da API da Cloudflare (Zone:DNS:Edit, não aparece ao digitar): " CLOUDFLARE_API_TOKEN
  echo
  sed -i "s/^CLOUDFLARE_API_TOKEN=.*/CLOUDFLARE_API_TOKEN=$CLOUDFLARE_API_TOKEN/" "$GLOBAL_ENV"
fi
if [ -z "${CLOUDFLARE_ZONE_ID:-}" ]; then
  read -r -p "Zone ID do domínio na Cloudflare: " CLOUDFLARE_ZONE_ID
  sed -i "s/^CLOUDFLARE_ZONE_ID=.*/CLOUDFLARE_ZONE_ID=$CLOUDFLARE_ZONE_ID/" "$GLOBAL_ENV"
fi
if [ -z "${SERVER_PUBLIC_IP:-}" ]; then
  echo "==> Detectando IP público do servidor..."
  SERVER_PUBLIC_IP=$(curl -fsS https://ifconfig.me || curl -fsS https://api.ipify.org)
  echo "    IP detectado: $SERVER_PUBLIC_IP"
  sed -i "s/^SERVER_PUBLIC_IP=.*/SERVER_PUBLIC_IP=$SERVER_PUBLIC_IP/" "$GLOBAL_ENV"
fi
if [ -z "${EXPO_TOKEN:-}" ]; then
  read -rs -p "Access Token do Expo/EAS (Account Settings -> Access Tokens em expo.dev, não aparece ao digitar): " EXPO_TOKEN
  echo
  sed -i "s/^EXPO_TOKEN=.*/EXPO_TOKEN=$EXPO_TOKEN/" "$GLOBAL_ENV"
fi

TRAEFIK_NETWORK="${TRAEFIK_NETWORK:-traefik-public}"
TRAEFIK_CERT_RESOLVER="${TRAEFIK_CERT_RESOLVER:-cloudflare}"
TRAEFIK_ENTRYPOINT="${TRAEFIK_ENTRYPOINT:-websecure}"

# se a rede configurada nao existe, tenta descobrir sozinho a partir de um
# container rodando com "traefik" no nome, em vez de simplesmente falhar -
# evita ter que sair rodando `docker inspect` manualmente a cada servidor
# novo com um Traefik configurado diferente do padrao assumido aqui
if ! docker network inspect "$TRAEFIK_NETWORK" >/dev/null 2>&1; then
  echo "==> Rede '$TRAEFIK_NETWORK' não existe - tentando detectar automaticamente"
  TRAEFIK_CONTAINER=$(docker ps --format '{{.Names}}' | grep -i traefik | head -1 || true)

  if [ -n "$TRAEFIK_CONTAINER" ]; then
    echo "    Container do Traefik encontrado: $TRAEFIK_CONTAINER"

    # "docker inspect --format" sempre acrescenta uma quebra de linha final
    # por conta propria, alem da que o template ja gera pra cada rede - filtra
    # linhas vazias pra nao contar uma "rede fantasma" quando so tem uma real
    CANDIDATE_NETWORKS=()
    while IFS= read -r NET; do
      [ -n "$NET" ] && CANDIDATE_NETWORKS+=("$NET")
    done < <(docker inspect "$TRAEFIK_CONTAINER" --format '{{range $k,$v := .NetworkSettings.Networks}}{{$k}}{{"\n"}}{{end}}')

    if [ "${#CANDIDATE_NETWORKS[@]}" -eq 1 ]; then
      TRAEFIK_NETWORK="${CANDIDATE_NETWORKS[0]}"
      echo "    Rede detectada: $TRAEFIK_NETWORK"
    elif [ "${#CANDIDATE_NETWORKS[@]}" -gt 1 ]; then
      echo "    O container está em mais de uma rede: ${CANDIDATE_NETWORKS[*]}"
      read -r -p "    Qual delas é a rede pública do Traefik? " TRAEFIK_NETWORK
    fi

    # tenta ler o certResolver e o entrypoint HTTPS da propria linha de
    # comando do Traefik (so funciona se ele for configurado via --flags,
    # nao via arquivo de config - se nao achar, fica no valor padrao/atual).
    # usa grep -E (POSIX, sem depender de locale) em vez de -P: -P (PCRE)
    # falha com "supports only unibyte and UTF-8 locales" em servidores sem
    # locale UTF-8 configurado - o que aconteceu bem aqui no teste local.
    TRAEFIK_CMD=$(docker inspect "$TRAEFIK_CONTAINER" --format '{{join .Config.Cmd " "}}' 2>/dev/null || true)

    RESOLVER_MATCH=$(echo "$TRAEFIK_CMD" | grep -oE -- '--certificatesresolvers\.[^.]+\.' | head -1 || true)
    DETECTED_RESOLVER="${RESOLVER_MATCH#--certificatesresolvers.}"
    DETECTED_RESOLVER="${DETECTED_RESOLVER%.}"

    ENTRYPOINT_MATCH=$(echo "$TRAEFIK_CMD" | grep -oE -- '--entrypoints\.[^.]+\.address=:443' | head -1 || true)
    DETECTED_ENTRYPOINT="${ENTRYPOINT_MATCH#--entrypoints.}"
    DETECTED_ENTRYPOINT="${DETECTED_ENTRYPOINT%.address=:443}"

    [ -n "$DETECTED_RESOLVER" ] && TRAEFIK_CERT_RESOLVER="$DETECTED_RESOLVER" && echo "    certResolver detectado: $TRAEFIK_CERT_RESOLVER"
    [ -n "$DETECTED_ENTRYPOINT" ] && TRAEFIK_ENTRYPOINT="$DETECTED_ENTRYPOINT" && echo "    entrypoint HTTPS detectado: $TRAEFIK_ENTRYPOINT"
  fi

  if ! docker network inspect "$TRAEFIK_NETWORK" >/dev/null 2>&1; then
    echo "    Não consegui detectar sozinho. Redes Docker disponíveis:"
    docker network ls --format '      {{.Name}}'
    read -r -p "    Nome da rede do Traefik: " TRAEFIK_NETWORK
  fi

  if ! docker network inspect "$TRAEFIK_NETWORK" >/dev/null 2>&1; then
    echo "Rede '$TRAEFIK_NETWORK' ainda não existe. Confira o nome e rode de novo." >&2
    exit 1
  fi

  # salva o que foi detectado/digitado pra nao perguntar de novo no proximo cliente
  sed -i "s/^TRAEFIK_NETWORK=.*/TRAEFIK_NETWORK=$TRAEFIK_NETWORK/" "$GLOBAL_ENV"
  sed -i "s/^TRAEFIK_CERT_RESOLVER=.*/TRAEFIK_CERT_RESOLVER=$TRAEFIK_CERT_RESOLVER/" "$GLOBAL_ENV"
  sed -i "s/^TRAEFIK_ENTRYPOINT=.*/TRAEFIK_ENTRYPOINT=$TRAEFIK_ENTRYPOINT/" "$GLOBAL_ENV"
  echo "    Config salva em infra/.env pros próximos clientes"
fi

# --- 1. DNS na Cloudflare ---
# proxied:true de propósito - passa pela Cloudflare (DDoS/WAF) em vez de
# expor o IP real do servidor direto. Não quebra o certificado: o Traefik usa
# desafio DNS-01 (não HTTP-01), que não liga pra proxy nenhum, só confere um
# registro TXT.
echo "==> Cadastrando DNS na Cloudflare ($FRONTEND_DOMAIN, $BACKEND_DOMAIN, $STORAGE_DOMAIN)"
for HOST in "$FRONTEND_DOMAIN" "$BACKEND_DOMAIN" "$STORAGE_DOMAIN"; do
  curl -s -X POST "https://api.cloudflare.com/client/v4/zones/$CLOUDFLARE_ZONE_ID/dns_records" \
    -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
    -H "Content-Type: application/json" \
    --data "{\"type\":\"A\",\"name\":\"$HOST\",\"content\":\"$SERVER_PUBLIC_IP\",\"ttl\":1,\"proxied\":true}" \
    | grep -q '"success":true' && echo "    $HOST -> $SERVER_PUBLIC_IP" \
    || echo "    aviso: falha ao criar registro de $HOST (pode já existir - confira na Cloudflare)"
done

# --- 2. Stack isolada do cliente ---
echo "==> Provisionando cliente '$SLUG'"
echo "    Painel:  https://$FRONTEND_DOMAIN"
echo "    API:     https://$BACKEND_DOMAIN"
echo "    Storage: https://$STORAGE_DOMAIN"
mkdir -p "$CLIENT_DIR"
mkdir -p "$REPO_ROOT/clients-data/$SLUG"/{mariadb,redis,minio}
cp "$REPO_ROOT/infra/client-template/docker-compose.yml" "$CLIENT_DIR/docker-compose.yml"

DB_PASSWORD=$(openssl rand -hex 16)
DB_ROOT_PASSWORD=$(openssl rand -hex 16)
REDIS_PASSWORD=$(openssl rand -hex 16)
JWT_SECRET=$(openssl rand -base64 48 | tr -d '\n')
JWT_REFRESH_SECRET=$(openssl rand -base64 48 | tr -d '\n')
MINIO_ROOT_USER=$(openssl rand -hex 8)
MINIO_ROOT_PASSWORD=$(openssl rand -hex 16)
ADMIN_EMAIL="admin@$SUBDOMAIN"
ADMIN_PASSWORD=$(openssl rand -base64 12 | tr -d '\n')

cat > "$CLIENT_DIR/.env" <<EOF
# Gerado por install-client.sh em $(date -u +%Y-%m-%dT%H:%M:%SZ) - não editar
# manualmente sem necessidade (reinstalar sobrescreve isso).
REPO_ROOT=$REPO_ROOT
CLIENT_SLUG=$SLUG
VOLUMES=$REPO_ROOT/clients-data/$SLUG
FRONTEND_DOMAIN=$FRONTEND_DOMAIN
BACKEND_DOMAIN=$BACKEND_DOMAIN
STORAGE_DOMAIN=$STORAGE_DOMAIN
TRAEFIK_NETWORK=$TRAEFIK_NETWORK
TRAEFIK_CERT_RESOLVER=$TRAEFIK_CERT_RESOLVER
TRAEFIK_ENTRYPOINT=$TRAEFIK_ENTRYPOINT
APK_DOWNLOAD_URL=

NODE_ENV=production
PORT=3000
# Cloudflare + Traefik = 2 proxies confiáveis na frente do backend (ver
# src/app.ts) - sem isso o rate limit e a checagem de região do login viam
# sempre o IP de um dos proxies, nunca o do cliente real.
TRUST_PROXY_HOPS=2
CORS_ORIGIN=https://$FRONTEND_DOMAIN

DB_HOST=mariadb
DB_PORT=3306
DB_NAME=$SLUG
DB_USER=$SLUG
DB_PASSWORD=$DB_PASSWORD
DB_ROOT_PASSWORD=$DB_ROOT_PASSWORD

REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=$REDIS_PASSWORD

JWT_SECRET=$JWT_SECRET
JWT_EXPIRES_IN=8h
JWT_REFRESH_SECRET=$JWT_REFRESH_SECRET
JWT_REFRESH_EXPIRES_IN=30d
JWT_REFRESH_EXPIRES_IN_WEB=90d

BCRYPT_SALT_ROUNDS=10

ADMIN_EMAIL=$ADMIN_EMAIL
ADMIN_PASSWORD=$ADMIN_PASSWORD

# console (9001) nao fica publico - so em 127.0.0.1 no servidor, acessivel
# via "ssh -L 9001:localhost:9001"
# upload continua direto na rede interna (rapido); o link pre-assinado que o
# navegador usa e montado com o dominio publico do storage
S3_ENDPOINT=http://minio:9000
S3_PUBLIC_ENDPOINT=https://$STORAGE_DOMAIN
S3_REGION=us-east-1
S3_BUCKET=field-checklist-photos
S3_ACCESS_KEY=$MINIO_ROOT_USER
S3_SECRET_KEY=$MINIO_ROOT_PASSWORD
S3_FORCE_PATH_STYLE=true
MINIO_ROOT_USER=$MINIO_ROOT_USER
MINIO_ROOT_PASSWORD=$MINIO_ROOT_PASSWORD

LATE_CHECKLIST_ALERT_TIME=08:30
EOF

dc() {
  docker compose -p "$SLUG" --env-file "$CLIENT_DIR/.env" -f "$CLIENT_DIR/docker-compose.yml" "$@"
}

echo "==> Subindo containers (build pode demorar alguns minutos na primeira vez)"
dc up -d --build mariadb redis minio

echo "==> Aguardando o banco e o MinIO ficarem prontos"
for i in $(seq 1 30); do
  dc exec -T mariadb healthcheck.sh --connect --innodb_initialized >/dev/null 2>&1 && break
  sleep 2
done

echo "==> Rodando migrations e seed inicial (cria o usuário admin)"
# "run --rm" (não "exec"): sobe um container descartável só pra isso, sem
# passar pelo boot normal do backend - o boot já tenta consultar tabelas que
# só existem depois da migration.
dc run --rm backend npm run migrate
dc run --rm backend npm run seed

echo "==> Subindo backend e worker"
dc up -d --build backend worker

echo "==> Aguardando o backend responder"
for i in $(seq 1 30); do
  dc exec -T backend node -e "fetch('http://localhost:3000/health').then((r) => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))" && break
  sleep 2
done

# --- 3. APK do app mobile (build no EAS, específico deste cliente) ---
# o app mobile trava a URL da API no próprio instalável (EXPO_PUBLIC_API_URL),
# então cada cliente precisa do seu build - não dá pra reaproveitar o de
# outro. Roda ANTES do frontend (que precisa da URL do APK como build arg),
# mas DEPOIS de backend/worker já estarem no ar (não trava a stack web
# esperando isso). A fila gratuita do EAS pode levar bem mais que alguns
# minutos - é esperado.
MOBILE_DIR="$REPO_ROOT/mobile"
if [ ! -d "$MOBILE_DIR/node_modules" ]; then
  echo "==> Instalando dependências do app mobile (primeira vez neste servidor)"
  npm install --prefix "$MOBILE_DIR"
fi

PACKAGE_SLUG=$(echo "$SLUG" | tr -d '-')
case "$PACKAGE_SLUG" in
  [0-9]*) PACKAGE_SLUG="c$PACKAGE_SLUG" ;;
esac
APP_PACKAGE="com.fieldcheck.$PACKAGE_SLUG"
APP_NAME="Checklist $(echo "$SLUG" | sed -E 's/(^|-)([a-z])/\1\U\2/g; s/-/ /g')"

echo "==> Gerando build do APK pro cliente '$SLUG' (perfil EAS: $SLUG, pacote: $APP_PACKAGE)"
echo "    Isso pode demorar bastante (fila gratuita do EAS) - aguardando..."
node "$REPO_ROOT/infra/lib/eas-add-profile.js" "$SLUG" "https://$BACKEND_DOMAIN/api/v1" "https://$BACKEND_DOMAIN" "$APP_NAME" "$APP_PACKAGE"

APK_DOWNLOAD_URL=""
EAS_BUILD_JSON="$CLIENT_DIR/eas-build.json"
EAS_BUILD_LOG="$CLIENT_DIR/eas-build.log"
if (cd "$MOBILE_DIR" && EXPO_TOKEN="$EXPO_TOKEN" npx eas-cli build --profile "$SLUG" --platform android --non-interactive --wait --json >"$EAS_BUILD_JSON" 2>"$EAS_BUILD_LOG"); then
  APK_DOWNLOAD_URL=$(node "$REPO_ROOT/infra/lib/eas-extract-apk-url.js" "$EAS_BUILD_JSON" 2>>"$EAS_BUILD_LOG") \
    || echo "    aviso: build terminou mas não consegui extrair a URL do APK - confira $EAS_BUILD_LOG" >&2
else
  echo "    aviso: build do EAS falhou ao rodar - confira $EAS_BUILD_LOG" >&2
fi

# eas.json e' compartilhado por todos os clientes (checkout unico no
# servidor) - o profile gerado acima foi so pra este build, restaura pra nao
# ir acumulando um profile por cliente instalado no arquivo versionado
git -C "$REPO_ROOT" checkout -- mobile/eas.json 2>/dev/null || true

if [ -n "$APK_DOWNLOAD_URL" ]; then
  sed -i "s|^APK_DOWNLOAD_URL=.*|APK_DOWNLOAD_URL=$APK_DOWNLOAD_URL|" "$CLIENT_DIR/.env"
  echo "    APK pronto: $APK_DOWNLOAD_URL"
else
  echo "    Instalação segue sem link de APK - ajuste APK_DOWNLOAD_URL em $CLIENT_DIR/.env manualmente quando tiver um build, depois rode: "
  echo "    docker compose -p $SLUG -f $CLIENT_DIR/docker-compose.yml up -d --build frontend"
fi

echo "==> Subindo frontend"
dc up -d --build frontend

echo ""
echo "==> Cliente '$SLUG' instalado"
echo "    Painel:  https://$FRONTEND_DOMAIN"
echo "    API:     https://$BACKEND_DOMAIN"
echo "    Storage: https://$STORAGE_DOMAIN"
echo "    Login admin: $ADMIN_EMAIL"
echo "    Senha admin: $ADMIN_PASSWORD"
echo "    (guarde essa senha agora - só fica salva como hash no banco desse cliente)"
echo ""
echo "    Config completa em: $CLIENT_DIR/.env"
echo "    Pode levar 1-2 minutos pro certificado TLS ser emitido pelo Traefik antes dos domínios responderem."
