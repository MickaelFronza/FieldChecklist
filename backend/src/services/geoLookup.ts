import geoip from 'geoip-lite';

// IPs privados/locais (dev, LAN) nao resolvem no geoip-lite - null significa
// "nao verificavel", e quem chama deve tratar isso como nao-bloqueante
export function lookupRegion(ip: string): string | null {
  const cleanIp = ip.replace('::ffff:', '');
  const result = geoip.lookup(cleanIp);
  if (!result) return null;
  return `${result.country}-${result.region}`;
}
