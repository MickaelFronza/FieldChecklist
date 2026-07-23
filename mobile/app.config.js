// Dynamic config (em vez de app.json estatico) pra permitir nome/slug/pacote
// por build de cliente via env vars do EAS Build (ver eas.json) - cada
// cliente gera seu proprio instalavel com a URL do servidor travada em
// EXPO_PUBLIC_API_URL, sem nenhuma configuracao possivel depois de instalado.
module.exports = {
  expo: {
    name: process.env.APP_NAME || 'Field Checklist',
    slug: process.env.APP_SLUG || 'field-checklist',
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
    ],
  },
};
