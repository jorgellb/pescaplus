import { describe, it, expect, vi } from 'vitest'
import type { Prisma } from '@prisma/client'

/*
 * Los clics de afiliado del panel cuentan solo a visitantes que han visto alguna
 * página. En octubre-noviembre de 2026, 2.280 de 2.312 clics venían de
 * visitantes sin una sola página vista: robots. Contarlos hacía creer que la
 * web enviaba mucho tráfico a la tienda y que esta no convertía.
 */

const consultas: string[] = []
vi.mock('@/lib/prisma', () => ({
  prisma: {
    $queryRaw: vi.fn(async (sql: Prisma.Sql) => {
      consultas.push(sql.sql)
      return []
    }),
  },
}))

const SOLO_CON_PAGINAS = /type = 'afiliado' AND visitor IN \(SELECT visitor FROM "Event" WHERE type = 'pageview'/

describe('analiticaCompleta: clics de afiliado', () => {
  it('toda cuenta de clics de afiliado exige páginas vistas del visitante', async () => {
    const { analiticaCompleta } = await import('@/lib/analytics-queries')
    const r = await analiticaCompleta(30)

    const conAfiliados = consultas.filter((q) => q.includes("'afiliado'") && /AS afiliados/.test(q))
    expect(conAfiliados.length).toBeGreaterThanOrEqual(3)
    for (const q of conAfiliados) expect(q).toMatch(SOLO_CON_PAGINAS)
    expect(r.resumen.afiliados).toBe(0)
  })
})
