import { X509Certificate } from 'node:crypto'

/**
 * Normaliza el certificado de la CA que llega en `DATABASE_CA_CERT`.
 *
 * Existe por un fallo que costó un despliegue entero. Aiven firma con su PROPIA
 * CA, así que sin este certificado la conexión se rechaza con «self-signed
 * certificate in certificate chain». El PEM es multilínea, pero una variable de
 * entorno es una sola línea, así que se guarda con `\n` literales... y ahí está
 * la trampa: **el parser de Dockerfile se come las barras invertidas**.
 *
 *     ENV X=inicio\nfinal      →      X = "inicionfinal"
 *
 * Coolify (y cualquier plataforma que inyecte las variables de construcción
 * reescribiendo el Dockerfile) hace justo eso. Cada `\n` del PEM se convierte en
 * una `n` pegada al base64, el certificado deja de ser válido, Node lo descarta
 * en silencio y verifica contra el almacén del sistema — que no conoce a Aiven.
 * El error que se ve al final no menciona nada de esto.
 *
 * Se aceptan cuatro formas, en este orden:
 *
 *  1. PEM con saltos de línea reales (lo que sale de un fichero).
 *  2. PEM con `\n` literales (lo normal en un `.env`).
 *  3. PEM con los saltos destrozados por un parser (se reconstruye).
 *  4. El PEM entero en base64 — **la más segura**, porque no lleva barras
 *     invertidas y por tanto ningún parser puede estropearla. Es la recomendada
 *     para variables de construcción.
 *
 * Siempre se comprueba que el resultado sea un certificado que Node sepa leer.
 * Si ninguna forma cuadra se avisa y se devuelve `undefined`: quien llama
 * conecta por TLS sin verificar, que es peor que verificar pero muchísimo mejor
 * que tirar la construcción entera con un error que no dice qué pasa.
 */

const BLOQUE_PEM = /-----BEGIN CERTIFICATE-----([\s\S]*?)-----END CERTIFICATE-----/g

/** Ancho de línea del base64 en un PEM. Lo fija el RFC 7468 y openssl lo respeta. */
const ANCHO = 64

/**
 * Reconstruye el cuerpo de un bloque al que le han comido las barras.
 *
 * Tras el destrozo, el cuerpo es `n` + 64 caracteres + `n` + 64 + … + `n`. No se
 * pueden borrar las `n` a lo bruto porque la `n` también es un carácter válido
 * del base64: hay que quitar solo las que caen en la posición del salto.
 * Devuelve `null` si el patrón no encaja, para no inventarse un certificado.
 */
function repairBody(body: string): string[] | null {
  if (!body.startsWith('n')) return null
  let resto = body.slice(1)
  const lineas: string[] = []
  while (resto.length > ANCHO) {
    if (resto[ANCHO] !== 'n') return null
    lineas.push(resto.slice(0, ANCHO))
    resto = resto.slice(ANCHO + 1)
  }
  if (resto.endsWith('n')) resto = resto.slice(0, -1)
  if (resto) lineas.push(resto)
  return lineas.length ? lineas : null
}

function repairMangled(pem: string): string | null {
  let fallo = false
  const reparado = pem.replace(BLOQUE_PEM, (original, cuerpo: string) => {
    const lineas = repairBody(cuerpo)
    if (!lineas) {
      fallo = true
      return original
    }
    return `-----BEGIN CERTIFICATE-----\n${lineas.join('\n')}\n-----END CERTIFICATE-----`
  })
  return fallo ? null : reparado
}

function esCertificadoLegible(pem: string): boolean {
  try {
    new X509Certificate(pem)
    return true
  } catch {
    return false
  }
}

export function normalizeCaCert(bruto: string | undefined): string | undefined {
  const valor = bruto?.trim()
  if (!valor) return undefined

  const candidatos: (string | null)[] = []
  if (valor.includes('-----BEGIN')) {
    if (valor.includes('\n')) candidatos.push(valor)
    if (valor.includes('\\n')) candidatos.push(valor.replace(/\\n/g, '\n'))
    candidatos.push(repairMangled(valor))
  } else {
    // Sin cabecera PEM solo cabe que venga en base64.
    try {
      candidatos.push(Buffer.from(valor, 'base64').toString('utf8'))
    } catch {
      /* valor que no es base64: lo descartan las comprobaciones de abajo */
    }
  }

  for (const candidato of candidatos) {
    if (candidato && esCertificadoLegible(candidato)) return candidato
  }

  console.warn(
    '[db] DATABASE_CA_CERT tiene un valor que no es un certificado legible; se conectará ' +
      'por TLS SIN verificar. Causa más probable: la plataforma inyectó la variable ' +
      'reescribiendo el Dockerfile y el parser se comió los «\\n». Solución: guardarla en ' +
      'base64 (`base64 -w0 ca.pem`), que no lleva barras invertidas.',
  )
  return undefined
}
