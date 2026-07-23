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

  if [ "${#missing[@]}" -gt 0 ]; then
    echo "Faltando: ${missing[*]}" >&2
    exit 1
  fi
}
