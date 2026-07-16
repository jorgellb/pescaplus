/**
 * Recreational sea-fishing regulation pointers by autonomous community.
 *
 * DELIBERATELY conservative: we link to the official body and state only what
 * is stable (a regional licence is required; sizes/quotas are regulated). We do
 * NOT hardcode quotas, minimum sizes or municipal beach bans — those change by
 * season and town hall, and a wrong number here gets someone fined. Every card
 * carries the revision date and tells the user to confirm at the source.
 */
export interface RegionRegulation {
  region: string
  authority: string
  licenseUrl: string
}

/** When this table was last reviewed by us — shown on every card. */
export const REGULATIONS_REVIEWED = 'julio de 2026'

export const REGION_REGULATIONS: RegionRegulation[] = [
  { region: 'Andalucía', authority: 'Junta de Andalucía', licenseUrl: 'https://www.juntadeandalucia.es/organismos/agriculturapescaaguaydesarrollorural.html' },
  { region: 'Galicia', authority: 'Xunta de Galicia (Consellería do Mar)', licenseUrl: 'https://mar.xunta.gal' },
  { region: 'Asturias', authority: 'Principado de Asturias', licenseUrl: 'https://www.asturias.es' },
  { region: 'Cantabria', authority: 'Gobierno de Cantabria', licenseUrl: 'https://www.cantabria.es' },
  { region: 'País Vasco', authority: 'Gobierno Vasco', licenseUrl: 'https://www.euskadi.eus' },
  { region: 'Murcia', authority: 'Región de Murcia', licenseUrl: 'https://www.carm.es' },
  { region: 'Comunidad Valenciana', authority: 'Generalitat Valenciana', licenseUrl: 'https://agroambient.gva.es' },
  { region: 'Cataluña', authority: 'Generalitat de Catalunya', licenseUrl: 'https://agricultura.gencat.cat' },
  { region: 'Baleares', authority: 'Govern de les Illes Balears', licenseUrl: 'https://www.caib.es' },
  { region: 'Canarias', authority: 'Gobierno de Canarias', licenseUrl: 'https://www.gobiernodecanarias.org' },
  { region: 'Ceuta', authority: 'Ciudad Autónoma de Ceuta', licenseUrl: 'https://www.ceuta.es' },
  { region: 'Melilla', authority: 'Ciudad Autónoma de Melilla', licenseUrl: 'https://www.melilla.es' },
]

/** National reference for minimum sizes in recreational sea fishing. */
export const NATIONAL_SIZES_URL = 'https://www.mapa.gob.es/es/pesca/temas/'

export function getRegulation(region: string): RegionRegulation | undefined {
  return REGION_REGULATIONS.find((r) => r.region === region)
}
