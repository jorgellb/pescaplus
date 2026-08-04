/**
 * Configuración de conexión a Postgres para los scripts, igual que lib/prisma.ts.
 *
 * Vive aparte porque es de seguridad y se estaba copiando en cada script: tres
 * copias de una configuración de TLS son tres sitios donde se puede quedar
 * desactualizada una.
 *
 * Aiven firma sus certificados con su PROPIA CA, así que el `verify-full` que
 * node-postgres aplica ante `sslmode=require` rechaza la conexión con
 * "self-signed certificate in certificate chain". Con DATABASE_CA_CERT se
 * verifica de verdad; sin ella se conecta por TLS sin verificar el certificado.
 */

/**
 * El certificado admite dos formas: el PEM con «\n» literales (lo habitual en un
 * `.env`) o el PEM entero en base64. La segunda existe porque hay parsers que se
 * comen las barras invertidas — el de Dockerfile, sin ir más lejos — y dejan un
 * certificado ilegible sin avisar. La versión completa, que además reconstruye
 * un PEM ya destrozado, está en `lib/db-ca.ts`; aquí basta con aceptar las dos
 * formas para que estos scripts funcionen con el mismo valor que la app.
 */
function caCert() {
  const bruto = process.env.DATABASE_CA_CERT?.trim()
  if (!bruto) return undefined
  if (bruto.includes('-----BEGIN')) return bruto.replace(/\\n/g, '\n')
  return Buffer.from(bruto, 'base64').toString('utf8')
}

export function pgConfig(url = process.env.DATABASE_URL) {
  if (!url) throw new Error('DATABASE_URL no definida.')
  const ca = caCert()
  const isLocal = /@(localhost|127\.0\.0\.1)/.test(url)
  return {
    // Se quita sslmode de la URL para que gane el objeto `ssl` de aquí.
    connectionString: url.replace(/([?&])ssl(mode)?=[^&]*/gi, '$1').replace(/[?&]$/, ''),
    ssl: isLocal ? undefined : ca ? { ca } : { rejectUnauthorized: false },
    connectionTimeoutMillis: 15000,
  }
}
