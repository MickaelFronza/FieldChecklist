#!/usr/bin/env node
// Le a saida JSON de "eas build --json" (salva em arquivo pelo
// install-client.sh) e imprime so a URL do APK, ou falha com uma mensagem
// clara se o build nao tiver terminado com sucesso.
const fs = require('fs');

const [, , jsonPath] = process.argv;
if (!jsonPath) {
  console.error('uso: eas-extract-apk-url.js <caminho-do-json>');
  process.exit(1);
}

const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
const build = Array.isArray(data) ? data[0] : data;

if (!build) {
  console.error('saida do eas build vazia/inesperada');
  process.exit(1);
}
if (build.status !== 'FINISHED') {
  console.error(`build do EAS terminou com status "${build.status}" (esperado "FINISHED") - confira em https://expo.dev/accounts/${build.project?.ownerAccount?.name}/projects/${build.project?.slug}/builds/${build.id}`);
  process.exit(1);
}

const url = build.artifacts?.buildUrl;
if (!url) {
  console.error('build terminou "FINISHED" mas nao achei artifacts.buildUrl na saida');
  process.exit(1);
}

console.log(url);
