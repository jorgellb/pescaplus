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
export function pgConfig(url = process.env.DATABASE_URL) {
  if (!url) throw new Error('DATABASE_URL no definida.')
  const ca = process.env.DATABASE_CA_CERT?.replace(/\\n/g, '\n')
  const isLocal = /@(localhost|127\.0\.0\.1)/.test(url)
  return {
    // Se quita sslmode de la URL para que gane el objeto `ssl` de aquí.
    connectionString: url.replace(/([?&])ssl(mode)?=[^&]*/gi, '$1').replace(/[?&]$/, ''),
    ssl: isLocal ? undefined : ca ? { ca } : { rejectUnauthorized: false },
    connectionTimeoutMillis: 15000,
  }
}
