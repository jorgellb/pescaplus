import { setDefaultResultOrder } from 'node:dns'

/**
 * Ajustes que solo valen en Node. Vive aparte de `instrumentation.ts` porque el
 * bundler compila ese fichero también para Edge, y ahí `node:dns` no existe:
 * una guarda de runtime no basta, el import hay que sacarlo del grafo.
 *
 * Preferir IPv4: varias fuentes de la carta (`rest.emodnet-bathymetry.eu`,
 * `ows.emodnet-bathymetry.eu`, `marine-api.open-meteo.com`) publican AAAA
 * además de A. Donde no hay ruta IPv6 viva, `fetch` prueba primero la IPv6 y
 * muere con `TypeError: fetch failed` (causa: AggregateError).
 *
 * El síntoma despistaba mucho: la sonda decía "no disponible" en el primer clic
 * y acertaba en el segundo, y el parte perdía la ola y la temperatura del agua
 * sin explicación, mientras `api.open-meteo.com` —que no publica AAAA— iba
 * siempre a la primera. Esa asimetría fue la pista.
 */
setDefaultResultOrder('ipv4first')
