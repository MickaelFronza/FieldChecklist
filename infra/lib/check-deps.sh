#!/bin/bash
# Confere as ferramentas que install-client.sh/deprovision-client.sh precisam
# antes de começar, pra falhar rápido e com uma mensagem clara em vez de no
# meio da instalação.

check_dependencies() {
  local missing=()

  command -v docker >/dev/null 2>&1 || missing+=("docker")
  docker compose version >/dev/null 2>&1 || missing+=("docker compose (plugin v2)")
  command -v openssl >/dev/null 2>&1 || missing+=("openssl")
  command -v curl >/dev/null 2>&1 || missing+=("curl")
  # node/npm rodam direto no host (nao em container) so pra buildar o APK do
  # app mobile via EAS - nada relacionado a stack web, que continua so em Docker
  command -v node >/dev/null 2>&1 || missing+=("node (v20+, ex.: via nodejs.org ou nvm)")
  command -v npm >/dev/null 2>&1 || missing+=("npm")

  if [ "${#missing[@]}" -gt 0 ]; then
    echo "Faltando: ${missing[*]}" >&2
    exit 1
  fi
}
