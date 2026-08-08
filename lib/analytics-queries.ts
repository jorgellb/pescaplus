import { Prisma } from '@prisma/client'

/**
 * Las consultas del panel de analítica.
 *
 * Van en SQL y no por el ORM por dos razones concretas: los **únicos** necesitan
 * `count(distinct …)`, que Prisma no expresa junto a otras agregaciones sin
 * traerse las filas; y los **percentiles** necesitan
 * `percentile_cont`, que no existe en el ORM. Traerse los eventos a Node para
 * contarlos ahí funcionaría con mil filas y se caería con un millón.
 *
 * Todo se agrupa por día de **Madrid**, no UTC. Con UTC, en verano las dos
 * primeras horas de cada noche se cuentan en el día anterior, y las horas puntas
 * de un sitio de pesca —el amanecer— se descolocan.
 */

export interface Resumen {
  visitas: number
  visitantes: number
  sesiones: number
  segundosMedia: number
  rebotePct: number
  afiliados: number
  ctrPct: number
}

export interface SerieDia {
  dia: string
  visitas: number
  visitantes: number
  afiliados: number
}

export interface FilaPagina {
  path: string
  visitas: number
  visitantes: number
  segundos: number
  scroll: number
  afiliados: number
}

export interface AnaliticaCompleta {
  dias: number
  resumen: Resumen
  serie: SerieDia[]
  paginas: FilaPagina[]
  canales: { canal: string; visitas: number; visitantes: number }[]
  referrers: { ref: string; visitas: number }[]
  dispositivos: { device: string; visitas: number }[]
  herramientas: { name: string; usos: number; visitantes: number }[]
  vitals: { name: string; p75: number; muestras: number }[]
  busquedas: { termino: string; veces: number; sinResultado: number }[]
  horas: { hora: number; visitas: number }[]
}

const MADRID = "AT TIME ZONE 'UTC' AT TIME ZONE 'Europe/Madrid'"

export async function analiticaCompleta(dias = 30): Promise<AnaliticaCompleta> {
  const { prisma } = await import('@/lib/prisma')
  const desde = new Date(Date.now() - dias * 86_400_000)
  const n = (v: unknown) => Number(v ?? 0)

  /*
   * Una sola pasada para las cifras de cabecera. Se hacen con FILTER en vez de
   * con varias consultas porque así la tabla se recorre una vez: con seis
   * consultas separadas, cada una volvía a barrer el mismo rango de fechas.
   */
  const [cab] = await prisma.$queryRaw<
    { visitas: bigint; visitantes: bigint; sesiones: bigint; afiliados: bigint }[]
  >(Prisma.sql`
    SELECT
      count(*) FILTER (WHERE type = 'pageview')                    AS visitas,
      count(DISTINCT visitor) FILTER (WHERE type = 'pageview')     AS visitantes,
      count(DISTINCT session) FILTER (WHERE type = 'pageview')     AS sesiones,
      count(*) FILTER (WHERE type = 'afiliado')                    AS afiliados
    FROM "Event" WHERE "createdAt" >= ${desde}
  `)

  const [perm] = await prisma.$queryRaw<{ media: number | null; rebotes: bigint; total: bigint }[]>(Prisma.sql`
    SELECT
      avg(value)                                   AS media,
      count(*) FILTER (WHERE value < 10)           AS rebotes,
      count(*)                                     AS total
    FROM "Event" WHERE type = 'salida' AND "createdAt" >= ${desde}
  `)

  const serieBruta = await prisma.$queryRaw<{ dia: string; visitas: bigint; visitantes: bigint; afiliados: bigint }[]>(
    Prisma.sql`
      SELECT to_char(("createdAt" ${Prisma.raw(MADRID)})::date, 'YYYY-MM-DD') AS dia,
             count(*) FILTER (WHERE type = 'pageview')                AS visitas,
             count(DISTINCT visitor) FILTER (WHERE type = 'pageview') AS visitantes,
             count(*) FILTER (WHERE type = 'afiliado')                AS afiliados
      FROM "Event" WHERE "createdAt" >= ${desde}
      GROUP BY 1 ORDER BY 1
    `,
  )

  /*
   * Las páginas cruzan tres tipos de evento: la vista, la salida —que trae
   * tiempo y scroll— y el clic de afiliado. Se unen por `path` con LEFT JOIN
   * para que una página sin clics siga apareciendo: si se cayera de la lista,
   * desaparecería justo la información útil, que es qué se lee y NO convierte.
   */
  const paginas = await prisma.$queryRaw<
    { path: string; visitas: bigint; visitantes: bigint; segundos: number | null; scroll: number | null; afiliados: bigint }[]
  >(Prisma.sql`
    WITH v AS (
      SELECT path, count(*) AS visitas, count(DISTINCT visitor) AS visitantes
      FROM "Event" WHERE type = 'pageview' AND "createdAt" >= ${desde} GROUP BY path
    ), s AS (
      SELECT path, avg(value) AS segundos, avg((meta->>'scroll')::numeric) AS scroll
      FROM "Event" WHERE type = 'salida' AND "createdAt" >= ${desde} GROUP BY path
    ), a AS (
      SELECT path, count(*) AS afiliados
      FROM "Event" WHERE type = 'afiliado' AND "createdAt" >= ${desde} GROUP BY path
    )
    SELECT v.path, v.visitas, v.visitantes, s.segundos, s.scroll, COALESCE(a.afiliados, 0) AS afiliados
    FROM v LEFT JOIN s ON s.path = v.path LEFT JOIN a ON a.path = v.path
    ORDER BY v.visitas DESC LIMIT 40
  `)

  const canales = await prisma.$queryRaw<{ canal: string; visitas: bigint; visitantes: bigint }[]>(Prisma.sql`
    SELECT canal, count(*) AS visitas, count(DISTINCT visitor) AS visitantes
    FROM "Event" WHERE type = 'pageview' AND "createdAt" >= ${desde} AND canal <> 'interno'
    GROUP BY canal ORDER BY visitas DESC
  `)

  const referrers = await prisma.$queryRaw<{ ref: string; visitas: bigint }[]>(Prisma.sql`
    SELECT ref, count(*) AS visitas FROM "Event"
    WHERE type = 'pageview' AND "createdAt" >= ${desde} AND ref <> ''
    GROUP BY ref ORDER BY visitas DESC LIMIT 20
  `)

  const dispositivos = await prisma.$queryRaw<{ device: string; visitas: bigint }[]>(Prisma.sql`
    SELECT device, count(*) AS visitas FROM "Event"
    WHERE type = 'pageview' AND "createdAt" >= ${desde} GROUP BY device ORDER BY visitas DESC
  `)

  const herramientas = await prisma.$queryRaw<{ name: string; usos: bigint; visitantes: bigint }[]>(Prisma.sql`
    SELECT name, count(*) AS usos, count(DISTINCT visitor) AS visitantes
    FROM "Event" WHERE type = 'herramienta' AND "createdAt" >= ${desde}
    GROUP BY name ORDER BY usos DESC LIMIT 25
  `)

  /*
   * p75 y no la media: es el umbral que usa Google para Core Web Vitals, y una
   * media esconde justo lo que importa —cuatro móviles lentos se diluyen entre
   * cien escritorios rápidos y el problema no aparece nunca—.
   */
  const vitals = await prisma.$queryRaw<{ name: string; p75: number; muestras: bigint }[]>(Prisma.sql`
    SELECT name, percentile_cont(0.75) WITHIN GROUP (ORDER BY value) AS p75, count(*) AS muestras
    FROM "Event" WHERE type = 'vital' AND "createdAt" >= ${desde} AND value IS NOT NULL
    GROUP BY name ORDER BY name
  `)

  const busquedas = await prisma.$queryRaw<{ termino: string; veces: bigint; sinresultado: bigint }[]>(Prisma.sql`
    SELECT name AS termino, count(*) AS veces,
           count(*) FILTER (WHERE value = 0) AS sinresultado
    FROM "Event" WHERE type = 'busqueda' AND "createdAt" >= ${desde} AND name <> ''
    GROUP BY name ORDER BY veces DESC LIMIT 30
  `)

  const horas = await prisma.$queryRaw<{ hora: number; visitas: bigint }[]>(Prisma.sql`
    SELECT extract(hour FROM ("createdAt" ${Prisma.raw(MADRID)}))::int AS hora, count(*) AS visitas
    FROM "Event" WHERE type = 'pageview' AND "createdAt" >= ${desde}
    GROUP BY 1 ORDER BY 1
  `)

  const visitas = n(cab?.visitas)
  const totalSalidas = n(perm?.total)

  return {
    dias,
    resumen: {
      visitas,
      visitantes: n(cab?.visitantes),
      sesiones: n(cab?.sesiones),
      segundosMedia: Math.round(n(perm?.media)),
      rebotePct: totalSalidas ? Math.round((n(perm?.rebotes) / totalSalidas) * 100) : 0,
      afiliados: n(cab?.afiliados),
      // El CTR se calcula sobre VISITAS, no sobre visitantes: es «de cada cien
      // páginas vistas, cuántas acabaron en un clic hacia la tienda».
      ctrPct: visitas ? Math.round((n(cab?.afiliados) / visitas) * 1000) / 10 : 0,
    },
    serie: serieBruta.map((r) => ({ dia: r.dia, visitas: n(r.visitas), visitantes: n(r.visitantes), afiliados: n(r.afiliados) })),
    paginas: paginas.map((r) => ({
      path: r.path,
      visitas: n(r.visitas),
      visitantes: n(r.visitantes),
      segundos: Math.round(n(r.segundos)),
      scroll: Math.round(n(r.scroll)),
      afiliados: n(r.afiliados),
    })),
    canales: canales.map((r) => ({ canal: r.canal || 'directo', visitas: n(r.visitas), visitantes: n(r.visitantes) })),
    referrers: referrers.map((r) => ({ ref: r.ref, visitas: n(r.visitas) })),
    dispositivos: dispositivos.map((r) => ({ device: r.device || '—', visitas: n(r.visitas) })),
    herramientas: herramientas.map((r) => ({ name: r.name, usos: n(r.usos), visitantes: n(r.visitantes) })),
    vitals: vitals.map((r) => ({ name: r.name, p75: Math.round(n(r.p75) * 1000) / 1000, muestras: n(r.muestras) })),
    busquedas: busquedas.map((r) => ({ termino: r.termino, veces: n(r.veces), sinResultado: n(r.sinresultado) })),
    horas: horas.map((r) => ({ hora: n(r.hora), visitas: n(r.visitas) })),
  }
}

export interface Embudo {
  dias: number
  entradas: { path: string; visitas: number; convierten: number; pctConversion: number; paginasMedia: number }[]
  salidas: { path: string; veces: number }[]
  transiciones: { desde: string; hacia: string; veces: number }[]
  profundidad: { tramo: string; visitas: number }[]
  pasos: { mediana: number; media: number; muestras: number }
}

/**
 * El recorrido completo, no solo el último clic.
 *
 * Se agrupa por `visitor` y NO por `session`, y es a propósito: los clics de
 * afiliado se registran en `/go/[id]`, que es una redirección de servidor sin
 * JavaScript, así que no conoce el id de sesión que genera el navegador. Si se
 * agrupara por sesión, el recorrido y la conversión no se podrían unir nunca —
 * habría páginas por un lado y clics por otro—. `visitor` está en los dos y,
 * como el hash lleva la fecha dentro, equivale a «un visitante en un día»: una
 * unidad más estable que la sesión de 30 minutos, que se parte sola cuando
 * alguien deja el móvil en el bolsillo durante la travesía.
 *
 * La alternativa era una cookie de sesión legible por el servidor, y se
 * descartó: rompería la promesa de cero cookies que sostiene el resto.
 */
export async function embudo(dias = 30): Promise<Embudo> {
  const { prisma } = await import('@/lib/prisma')
  const desde = new Date(Date.now() - dias * 86_400_000)
  const n = (v: unknown) => Number(v ?? 0)

  /*
   * Base común: cada página vista numerada dentro de su visitante, y una marca
   * de si ese visitante acabó pulsando hacia la tienda. Numerar aquí una sola
   * vez evita repetir la misma ventana en cada consulta de abajo.
   */
  const comun = Prisma.sql`
    WITH vistas AS (
      SELECT visitor, path, "createdAt",
             row_number() OVER (PARTITION BY visitor ORDER BY "createdAt")      AS paso,
             count(*)     OVER (PARTITION BY visitor)                           AS total,
             row_number() OVER (PARTITION BY visitor ORDER BY "createdAt" DESC) AS desdeElFinal
      FROM "Event" WHERE type = 'pageview' AND "createdAt" >= ${desde} AND visitor <> ''
    ), convierten AS (
      SELECT DISTINCT visitor FROM "Event"
      WHERE type = 'afiliado' AND "createdAt" >= ${desde} AND visitor <> ''
    )
  `

  const entradas = await prisma.$queryRaw<
    { path: string; visitas: bigint; convierten: bigint; paginasmedia: number }[]
  >(Prisma.sql`
    ${comun}
    SELECT v.path,
           count(*)                                          AS visitas,
           count(c.visitor)                                  AS convierten,
           avg(v.total)                                      AS paginasmedia
    FROM vistas v LEFT JOIN convierten c ON c.visitor = v.visitor
    WHERE v.paso = 1
    GROUP BY v.path ORDER BY visitas DESC LIMIT 25
  `)

  /*
   * Dónde se van los que NO compran. La última página de quien sí convirtió no
   * dice nada —se fue a la tienda, que es lo que se buscaba—; mezclarlas haría
   * que las páginas que mejor funcionan parecieran puntos de fuga.
   */
  const salidas = await prisma.$queryRaw<{ path: string; veces: bigint }[]>(Prisma.sql`
    ${comun}
    SELECT v.path, count(*) AS veces
    FROM vistas v LEFT JOIN convierten c ON c.visitor = v.visitor
    WHERE v.desdeElFinal = 1 AND v.total > 1 AND c.visitor IS NULL
    GROUP BY v.path ORDER BY veces DESC LIMIT 20
  `)

  const transiciones = await prisma.$queryRaw<{ desde: string; hacia: string; veces: bigint }[]>(Prisma.sql`
    ${comun}
    SELECT a.path AS desde, b.path AS hacia, count(*) AS veces
    FROM vistas a JOIN vistas b ON b.visitor = a.visitor AND b.paso = a.paso + 1
    WHERE a.path <> b.path
    GROUP BY 1, 2 ORDER BY veces DESC LIMIT 25
  `)

  const profundidad = await prisma.$queryRaw<{ tramo: string; visitas: bigint }[]>(Prisma.sql`
    ${comun}
    SELECT CASE WHEN total = 1 THEN '1 página'
                WHEN total = 2 THEN '2 páginas'
                WHEN total BETWEEN 3 AND 5 THEN '3-5 páginas'
                ELSE '6 o más' END AS tramo,
           count(DISTINCT visitor) AS visitas
    FROM vistas GROUP BY 1
    ORDER BY min(total)
  `)

  /*
   * Cuántas páginas ve alguien ANTES de pulsar. La mediana y no la media: un
   * único visitante obsesivo con cuarenta páginas desplaza la media y hace creer
   * que hace falta mucho recorrido para vender.
   */
  const [pasos] = await prisma.$queryRaw<{ mediana: number | null; media: number | null; muestras: bigint }[]>(Prisma.sql`
    WITH clic AS (
      SELECT visitor, min("createdAt") AS momento FROM "Event"
      WHERE type = 'afiliado' AND "createdAt" >= ${desde} AND visitor <> '' GROUP BY visitor
    ), previas AS (
      SELECT c.visitor, count(e.id) AS n
      FROM clic c JOIN "Event" e
        ON e.visitor = c.visitor AND e.type = 'pageview'
       AND e."createdAt" >= ${desde} AND e."createdAt" <= c.momento
      GROUP BY c.visitor
    )
    SELECT percentile_cont(0.5) WITHIN GROUP (ORDER BY n) AS mediana,
           avg(n) AS media, count(*) AS muestras
    FROM previas
  `)

  return {
    dias,
    entradas: entradas.map((r) => ({
      path: r.path,
      visitas: n(r.visitas),
      convierten: n(r.convierten),
      pctConversion: n(r.visitas) ? Math.round((n(r.convierten) / n(r.visitas)) * 1000) / 10 : 0,
      paginasMedia: Math.round(n(r.paginasmedia) * 10) / 10,
    })),
    salidas: salidas.map((r) => ({ path: r.path, veces: n(r.veces) })),
    transiciones: transiciones.map((r) => ({ desde: r.desde, hacia: r.hacia, veces: n(r.veces) })),
    profundidad: profundidad.map((r) => ({ tramo: r.tramo, visitas: n(r.visitas) })),
    pasos: {
      mediana: Math.round(n(pasos?.mediana) * 10) / 10,
      media: Math.round(n(pasos?.media) * 10) / 10,
      muestras: n(pasos?.muestras),
    },
  }
}
