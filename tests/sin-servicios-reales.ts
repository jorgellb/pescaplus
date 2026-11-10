/**
 * Se ejecuta antes de cada fichero de pruebas: borra las claves de la base de
 * datos y de los servicios externos para que TODO use su versión en memoria.
 *
 * Por qué existe: la base de datos de `.env` es la de PRODUCCIÓN. Las pruebas
 * daban por hecho que no habría `DATABASE_URL` ("No DATABASE_URL in tests →
 * memory backend"), pero eso dependía de quién las lanzara. El 2026-11-10 un
 * hook las ejecutó con el `.env` cargado y dejaron en producción 14 usuarios
 * @x.es, 49 quedadas, 14 operadores verificados, 18 chárters, 79 capturas en
 * Tarifa y 3 reseñas, visibles en la web.
 *
 * Las pruebas que necesiten una clave la ponen ellas con `vi.stubEnv`, que se
 * aplica después de esto.
 */
const CLAVES_CON_EFECTOS_REALES = [
  'DATABASE_URL',
  'DATABASE_CA_CERT',
  'DIRECT_URL',
  'RESEND_API_KEY',
  'RESEND_FROM',
  'STRIPE_SECRET_KEY',
  'STRIPE_WEBHOOK_SECRET',
  'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY',
  'BLOB_READ_WRITE_TOKEN',
  'ALIEXPRESS_APP_KEY',
  'ALIEXPRESS_APP_SECRET',
  'ALIEXPRESS_APP_TOKEN',
  'GROQ_API_KEY',
  'OPENROUTER_API_KEY',
  'NVIDIA_API_KEY',
  'AEMET_API_KEY',
  'CRON_SECRET',
]

for (const clave of CLAVES_CON_EFECTOS_REALES) delete process.env[clave]
