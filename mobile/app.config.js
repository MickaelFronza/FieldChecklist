// Dynamic config (em vez de app.json estatico) pra permitir nome/pacote por
// build de cliente via env vars do EAS Build (ver eas.json) - cada cliente
// gera seu proprio instalavel com a URL do servidor travada em
// EXPO_PUBLIC_API_URL, sem nenhuma configuracao possivel depois de instalado.
// slug/owner/projectId ficam fixos (nao variam por cliente) - todos os
// clientes sao builds do MESMO projeto EAS, o EAS exige que o slug bata com
// o do projeto vinculado a esse projectId (https://expo.fyi/eas-project-id).
module.exports = {
  expo: {
    name: process.env.APP_NAME || 'Field Checklist',
    slug: 'fieldchack',
    owner: 'hfronza-org',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/icon.png',
    userInterfaceStyle: 'light',
    ios: {
      supportsTablet: true,
    },
    android: {
      package: process.env.APP_PACKAGE || 'com.fieldcheck.operador',
      adaptiveIcon: {
        backgroundColor: '#E6F4FE',
        foregroundImage: './assets/android-icon-foreground.png',
        backgroundImage: './assets/android-icon-background.png',
        monochromeImage: './assets/android-icon-monochrome.png',
      },
      predictiveBackGestureEnabled: false,
      permissions: ['CAMERA', 'VIBRATE', 'ACCESS_COARSE_LOCATION', 'ACCESS_FINE_LOCATION'],
    },
    web: {
      favicon: './assets/favicon.png',
    },
    plugins: [
      'expo-sqlite',
      'expo-secure-store',
      [
        'expo-camera',
        {
          cameraPermission: 'O Field Checklist usa a câmera para tirar a foto obrigatória de cada item do checklist.',
        },
      ],
      ['expo-background-fetch', {}],
      [
        'expo-location',
        {
          locationWhenInUsePermission: 'O Field Checklist usa a localização para registrar onde o checklist foi aberto.',
        },
      ],
      [
        'expo-splash-screen',
        {
          backgroundColor: '#E8F5E9',
          image: './assets/splash-icon.png',
          imageWidth: 220,
        },
      ],
    ],
    extra: {
      eas: {
        projectId: '38b10274-27c9-4463-9894-52169efb163a',
      },
    },
  },
};
