#!/usr/bin/env node
// Adiciona (ou substitui) um profile de build do EAS em mobile/eas.json pro
// cliente informado - cada cliente precisa do proprio profile porque o
// APP_NAME/APP_PACKAGE/EXPO_PUBLIC_API_URL ficam gravados no APK na hora do
// build (nao da pra reaproveitar o de outro cliente). Chamado pelo
// install-client.sh; o profile e' removido de volta (git checkout) depois do
// build pra mobile/eas.json nao acumular um profile por cliente instalado.
const fs = require('fs');
const path = require('path');

const [, , slug, apiUrl, socketUrl, appName, appPackage] = process.argv;
if (!slug || !apiUrl || !socketUrl || !appName || !appPackage) {
  console.error('uso: eas-add-profile.js <slug> <apiUrl> <socketUrl> <appName> <appPackage>');
  process.exit(1);
}

const easJsonPath = path.join(__dirname, '..', '..', 'mobile', 'eas.json');
const easJson = JSON.parse(fs.readFileSync(easJsonPath, 'utf8'));

easJson.build[slug] = {
  distribution: 'internal',
  android: { buildType: 'apk' },
  env: {
    EXPO_PUBLIC_API_URL: apiUrl,
    EXPO_PUBLIC_SOCKET_URL: socketUrl,
    APP_NAME: appName,
    APP_PACKAGE: appPackage,
  },
};

fs.writeFileSync(easJsonPath, JSON.stringify(easJson, null, 2) + '\n');
