/**
 * Decode the handful of HTML entities that leak in from scraped AliExpress copy
 * (e.g. "L&aacute;nea"). Applied at read time so even rows already stored in the
 * database render as clean Spanish without needing a re-seed. Only well-known
 * named entities and numeric references are decoded — unknown "&word;" is left
 * untouched so ordinary text (e.g. "AT&T") is never mangled.
 */
const NAMED: Record<string, string> = {
  aacute: 'á', eacute: 'é', iacute: 'í', oacute: 'ó', uacute: 'ú',
  Aacute: 'Á', Eacute: 'É', Iacute: 'Í', Oacute: 'Ó', Uacute: 'Ú',
  ntilde: 'ñ', Ntilde: 'Ñ', uuml: 'ü', Uuml: 'Ü', ordm: 'º', ordf: 'ª',
  deg: '°', nbsp: ' ', quot: '"', apos: "'", amp: '&',
}

export function decodeEntities(input: string): string {
  if (!input || input.indexOf('&') === -1) return input
  return input
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&([a-zA-Z][a-zA-Z0-9]+);/g, (m, name) => (name in NAMED ? NAMED[name] : m))
}
