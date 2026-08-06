import 'dotenv/config'
import { Pool, type PoolConfig } from 'pg'
import { createWriteStream, createReadStream, mkdirSync, writeFileSync } from 'node:fs'
import { createGzip, createGunzip } from 'node:zlib'
import { pipeline } from 'node:stream/promises'
import { Readable } from 'node:stream'
import { join } from 'node:path'
import { execSync } from 'node:child_process'
import { normalizeCaCert } from '@/lib/db-ca'

/**
 * Copia de seguridad de la base de datos.
 *
 *   npx tsx scripts/backup.ts              a copias/AAAA-MM-DD-HHMM/
 *   npx tsx scripts/backup.ts /otra/ruta   a donde tú digas
 *
 * NO usa pg_dump a propósito: no está instalado y su versión tiene que coincidir
 * con la del servidor, que es la forma más habitual de descubrir que tu copia no
 * servía. Esto solo necesita el cliente `pg` que ya usa la aplicación.
 *
 * Guarda únicamente DATOS, y basta: el esquema vive en prisma/schema.prisma y
 * está en git, así que restaurar es `prisma db push` + volver a meter estas
 * filas. El manifiesto anota el commit exacto para saber qué esquema toca.
 *
 * Una fila por línea (NDJSON) y comprimido. Así una tabla de 200.000 filas no
 * tiene que caber entera en memoria ni para escribirla ni para leerla.
 *
 * Lo que esto NO cubre —y hay que hacer aparte— está en BACKUP.md.
 */

function sslConfig(): PoolConfig['ssl'] {
  const ca = normalizeCaCert(process.env.DATABASE_CA_CERT)
  if (ca) return { ca, rejectUnauthorized: true }
  // Sin CA no se puede verificar a Aiven; se avisa y se sigue, porque una copia
  // hecha sin verificar el certificado sigue siendo mejor que no tener copia.
  console.warn('AVISO: sin DATABASE_CA_CERT no se verifica el certificado del servidor.')
  return { rejectUnauthorized: false }
}

/** Marca de tiempo local, que es la que uno busca al mirar la carpeta. */
function sello(): string {
  const d = new Date()
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}`
}

function commitActual(): string {
  try {
    return execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim()
  } catch {
    return 'desconocido'
  }
}

/** Descomprime y cuenta filas de verdad, para comprobar lo escrito. */
async function contarFilas(fichero: string): Promise<number> {
  let n = 0
  let resto = ''
  const gunzip = createGunzip()
  createReadStream(fichero).pipe(gunzip)
  for await (const trozo of gunzip) {
    const texto = resto + (trozo as Buffer).toString('utf8')
    const lineas = texto.split('\n')
    resto = lineas.pop() ?? ''
    n += lineas.length
  }
  return n + (resto.trim() ? 1 : 0)
}

async function main() {
  const url = process.env.DATABASE_URL
  if (!url) throw new Error('Falta DATABASE_URL.')

  // Igual que lib/prisma.ts: `sslmode=require` en la URL hace que node-postgres
  // aplique su propio verify-full contra el almacén del sistema y rechace la CA
  // propia de Aiven, pisando nuestra configuración. Se quita.
  const limpia = url.replace(/([?&])ssl(mode)?=[^&]*/gi, '$1').replace(/[?&]$/, '')
  const pool = new Pool({ connectionString: limpia, ssl: sslConfig(), max: 2 })

  const destino = process.argv[2] || join(process.cwd(), 'copias', sello())
  mkdirSync(destino, { recursive: true })

  // `spatial_ref_sys` son 8.500 filas que trae PostGIS consigo: se recrean al
  // instalar la extensión y copiarlas solo engorda el fichero.
  const DE_EXTENSIONES = ['spatial_ref_sys', 'geography_columns', 'geometry_columns']
  const { rows: todas } = await pool.query<{ table_name: string }>(
    `SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
      ORDER BY table_name`,
  )
  const tablas = todas.filter((t) => !DE_EXTENSIONES.includes(t.table_name))
  console.log(`${tablas.length} tablas → ${destino}\n`)

  const resumen: Record<string, number> = {}
  let filasTotales = 0

  for (const { table_name: tabla } of tablas) {
    // Las columnas de PostGIS no se pueden serializar tal cual: salen como un
    // hexadecimal interno que luego no hay quien reinserte. ST_AsEWKT conserva
    // el SRID y vuelve a entrar con un cast.
    const { rows: cols } = await pool.query<{ column_name: string; udt_name: string }>(
      `SELECT column_name, udt_name FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = $1 ORDER BY ordinal_position`,
      [tabla],
    )
    const seleccion = cols
      .map((c) =>
        c.udt_name === 'geometry' || c.udt_name === 'geography'
          ? `ST_AsEWKT("${c.column_name}") AS "${c.column_name}"`
          : `"${c.column_name}"`,
      )
      .join(', ')

    const { rows } = await pool.query(`SELECT ${seleccion} FROM "${tabla}"`)
    const fichero = join(destino, `${tabla}.ndjson.gz`)
    await pipeline(
      Readable.from(rows.map((r) => JSON.stringify(r) + '\n')),
      createGzip({ level: 9 }),
      createWriteStream(fichero),
    )

    resumen[tabla] = rows.length
    filasTotales += rows.length
    console.log(`  ${tabla.padEnd(22)} ${String(rows.length).padStart(7)} filas`)
  }

  const manifiesto = {
    creado: new Date().toISOString(),
    commit: commitActual(),
    esquema: 'prisma/schema.prisma en ese commit',
    tablas: resumen,
    filasTotales,
    noIncluido: [
      'Las fotos subidas por los patrones: viven en el volumen /app/datos/fotos del servidor.',
      'Las variables de entorno: están en Coolify, y algunas son secretos.',
      'El código: ya está en GitHub.',
    ],
  }
  writeFileSync(join(destino, 'manifiesto.json'), JSON.stringify(manifiesto, null, 2) + '\n')

  await pool.end()

  /*
   * Releer lo escrito. Una copia que nunca se ha abierto no es una copia: es un
   * fichero. Esto la descomprime entera y cuenta las filas de verdad; si no
   * cuadran con lo que se creyó escribir, el script falla y te enteras HOY, no
   * el día que la necesites.
   */
  console.log('\nVerificando…')
  for (const [tabla, esperadas] of Object.entries(resumen)) {
    const leidas = await contarFilas(join(destino, `${tabla}.ndjson.gz`))
    if (leidas !== esperadas) {
      throw new Error(`${tabla}: se escribieron ${esperadas} filas pero se leen ${leidas}.`)
    }
  }
  console.log(`  ${tablas.length} ficheros releídos y cuadran.`)

  console.log(`\n${filasTotales} filas en ${tablas.length} tablas.`)
  console.log(`Manifiesto: ${join(destino, 'manifiesto.json')}`)
  console.log('\nOJO: esto es SOLO la base de datos. Lee BACKUP.md para el resto.')
}

main().catch((e) => {
  // Sin este exit(1) un fallo a mitad dejaría una copia incompleta con
  // apariencia de correcta, que es peor que no tener ninguna.
  console.error('LA COPIA HA FALLADO:', e instanceof Error ? e.message : e)
  process.exit(1)
})
