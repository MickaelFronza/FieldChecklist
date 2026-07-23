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

TRAEFIK_NETWORK="${TRAEFIK_NETWORK:-traefik-public}"
TRAEFIK_CERT_RESOLVER="${TRAEFIK_CERT_RESOLVER:-cloudflare}"
TRAEFIK_ENTRYPOINT="${TRAEFIK_ENTRYPOINT:-websecure}"

if ! docker network inspect "$TRAEFIK_NETWORK" >/dev/null 2>&1; then
  echo "Rede '$TRAEFIK_NETWORK' não existe. Confirme que o Traefik já está no ar e que a" >&2
  echo "rede dele tem esse nome (ou ajuste TRAEFIK_NETWORK em infra/.env pro nome real)." >&2
  exit 1
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

# console (9001) so acessivel via proxy interno do backend, nunca publico
MINIO_CONSOLE_URL=http://minio:9001
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

echo "==> Subindo backend, worker e frontend"
dc up -d --build backend worker frontend

echo "==> Aguardando o backend responder"
for i in $(seq 1 30); do
  dc exec -T backend node -e "fetch('http://localhost:3000/health').then((r) => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))" && break
  sleep 2
done

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
