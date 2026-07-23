#!/bin/bash
# Desativa um cliente do Field Checklist instalado por install-client.sh.
# Por padrão só PARA os containers (reversível: reinstalar não é possível
# enquanto a pasta existir, mas os dados continuam no disco). Passe --purge
# pra apagar de vez: containers, dados (mariadb/redis/minio), registros DNS
# na Cloudflare e a pasta do cliente.
#
# Uso: ./deprovision-client.sh <slug> [--purge]
# Ex.:  ./deprovision-client.sh cliente1
#       ./deprovision-client.sh cliente1 --purge

set -euo pipefail

if [ $# -lt 1 ]; then
  echo "Uso: $0 <slug> [--purge]" >&2
  exit 1
fi

SLUG="$1"
PURGE=false
if [ "${2:-}" = "--purge" ]; then
  PURGE=true
fi

REPO_ROOT="$(cd "$(dirname "$0")" && pwd)"
CLIENT_DIR="$REPO_ROOT/clients/$SLUG"

if [ ! -d "$CLIENT_DIR" ]; then
  echo "Cliente '$SLUG' não encontrado em $CLIENT_DIR." >&2
  exit 1
fi

# shellcheck disable=SC1091
source "$CLIENT_DIR/.env"

dc() {
  docker compose -p "$SLUG" --env-file "$CLIENT_DIR/.env" -f "$CLIENT_DIR/docker-compose.yml" "$@"
}

echo "==> Parando containers do cliente '$SLUG'"
dc down

if [ "$PURGE" = false ]; then
  echo ""
  echo "==> Containers parados. Dados e config preservados em:"
  echo "    $CLIENT_DIR"
  echo "    $REPO_ROOT/clients-data/$SLUG"
  echo "    Pra reinstalar do zero: ./deprovision-client.sh $SLUG --purge, depois ./install-client.sh <subdominio>"
  exit 0
fi

echo "==> --purge: removendo DNS, dados e config do cliente '$SLUG'"

GLOBAL_ENV="$REPO_ROOT/infra/.env"
if [ -f "$GLOBAL_ENV" ]; then
  # shellcheck disable=SC1091
  source "$GLOBAL_ENV"
fi

if [ -n "${CLOUDFLARE_API_TOKEN:-}" ] && [ -n "${CLOUDFLARE_ZONE_ID:-}" ]; then
  echo "==> Removendo registros DNS na Cloudflare ($FRONTEND_DOMAIN, $BACKEND_DOMAIN, $STORAGE_DOMAIN)"
  for HOST in "$FRONTEND_DOMAIN" "$BACKEND_DOMAIN" "$STORAGE_DOMAIN"; do
    RECORD_ID=$(curl -s -X GET "https://api.cloudflare.com/client/v4/zones/$CLOUDFLARE_ZONE_ID/dns_records?name=$HOST" \
      -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
      -H "Content-Type: application/json" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
    if [ -n "$RECORD_ID" ]; then
      curl -s -X DELETE "https://api.cloudflare.com/client/v4/zones/$CLOUDFLARE_ZONE_ID/dns_records/$RECORD_ID" \
        -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" >/dev/null
      echo "    removido: $HOST"
    else
      echo "    aviso: registro de $HOST não encontrado (já pode ter sido removido)"
    fi
  done
else
  echo "    aviso: infra/.env sem Cloudflare configurado - DNS não foi removido, confira manualmente"
fi

echo "==> Removendo dados e config locais"
rm -rf "$CLIENT_DIR"
rm -rf "$REPO_ROOT/clients-data/$SLUG"

echo "==> Cliente '$SLUG' totalmente removido"
