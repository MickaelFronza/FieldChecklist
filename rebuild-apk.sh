#!/bin/bash
# Reconstroi so o APK do app mobile de um cliente JA INSTALADO (ex.: depois de
# uma atualizacao do codigo do app) - nao mexe na stack web (mariadb/redis/
# minio/backend/worker), so gera um instalavel novo, atualiza APK_DOWNLOAD_URL
# no .env do cliente e reconstroi o frontend (que embute essa URL no build).
#
# Uso: ./rebuild-apk.sh <slug-do-cliente>
# Ex.:  ./rebuild-apk.sh fieldcheck

set -euo pipefail

if [ $# -ne 1 ]; then
  echo "Uso: $0 <slug-do-cliente>" >&2
  exit 1
fi

SLUG="$1"
REPO_ROOT="$(cd "$(dirname "$0")" && pwd)"
CLIENT_DIR="$REPO_ROOT/clients/$SLUG"

if [ ! -f "$CLIENT_DIR/.env" ]; then
  echo "Cliente '$SLUG' nao encontrado em $CLIENT_DIR" >&2
  exit 1
fi

# shellcheck disable=SC1091
source "$CLIENT_DIR/.env"
# shellcheck disable=SC1091
source "$REPO_ROOT/infra/.env"

if [ -z "${EXPO_TOKEN:-}" ]; then
  echo "EXPO_TOKEN nao configurado em infra/.env - rode ./install-client.sh uma vez (ele pergunta e salva) ou adicione manualmente." >&2
  exit 1
fi

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

echo "==> Gerando novo build do APK pro cliente '$SLUG' (perfil EAS: $SLUG, pacote: $APP_PACKAGE)"
echo "    Isso pode demorar bastante (fila gratuita do EAS) - aguardando..."
node "$REPO_ROOT/infra/lib/eas-add-profile.js" "$SLUG" "https://$BACKEND_DOMAIN/api/v1" "https://$BACKEND_DOMAIN" "$APP_NAME" "$APP_PACKAGE"

EAS_BUILD_JSON="$CLIENT_DIR/eas-build.json"
EAS_BUILD_LOG="$CLIENT_DIR/eas-build.log"
APK_DOWNLOAD_URL=""
if (cd "$MOBILE_DIR" && EXPO_TOKEN="$EXPO_TOKEN" npx eas-cli build --profile "$SLUG" --platform android --non-interactive --wait --json >"$EAS_BUILD_JSON" 2>"$EAS_BUILD_LOG"); then
  APK_DOWNLOAD_URL=$(node "$REPO_ROOT/infra/lib/eas-extract-apk-url.js" "$EAS_BUILD_JSON" 2>>"$EAS_BUILD_LOG") \
    || echo "    aviso: build terminou mas não consegui extrair a URL do APK - confira $EAS_BUILD_LOG" >&2
else
  echo "    aviso: build do EAS falhou ao rodar - confira $EAS_BUILD_LOG" >&2
fi

# eas.json e' compartilhado por todos os clientes (checkout unico no
# servidor) - o profile gerado acima foi so pra este build, restaura pra nao
# ir acumulando um profile por cliente no arquivo versionado
git -C "$REPO_ROOT" checkout -- mobile/eas.json 2>/dev/null || true

if [ -z "$APK_DOWNLOAD_URL" ]; then
  echo "Não consegui gerar o link do APK - nada foi alterado no cliente." >&2
  exit 1
fi

sed -i "s|^APK_DOWNLOAD_URL=.*|APK_DOWNLOAD_URL=$APK_DOWNLOAD_URL|" "$CLIENT_DIR/.env"
echo "    APK pronto: $APK_DOWNLOAD_URL"

echo "==> Reconstruindo o frontend (pra embutir o novo link)"
docker compose -p "$SLUG" --env-file "$CLIENT_DIR/.env" -f "$CLIENT_DIR/docker-compose.yml" up -d --build frontend

echo ""
echo "==> Concluído. Novo APK do cliente '$SLUG': $APK_DOWNLOAD_URL"
