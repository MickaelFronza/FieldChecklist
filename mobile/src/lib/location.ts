import * as Location from 'expo-location';

export interface Coordinates {
  lat: number;
  lng: number;
}

// Best-effort: nunca lanca, nunca bloqueia o fluxo do checklist. Se a
// permissao for negada ou o GPS estiver indisponivel (comum em campo),
// retorna null e o checklist segue normalmente sem localizacao.
export async function getCurrentLocation(): Promise<Coordinates | null> {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') return null;

    const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
    return { lat: position.coords.latitude, lng: position.coords.longitude };
  } catch {
    return null;
  }
}
