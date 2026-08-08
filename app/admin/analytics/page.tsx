'use client'

import { useEffect, useState } from 'react'
import type { AnaliticaCompleta, Embudo } from '@/lib/analytics-queries'

/**
 * Panel de analítica.
 *
 * Antes enseñaba una sola cosa: los clics de afiliado. O sea, la última milla,
 * sin nada de lo que la produce. Ahora enseña el embudo entero — de dónde llega
 * la gente, qué lee, cuánto se queda, qué herramienta usa y qué páginas acaban
 * en un clic hacia la tienda.
 *
 * Se maqueta con tablas y barras dentro de las celdas, no con gráficos: en un
 * panel de trabajo la pregunta casi siempre es «cuál es la cifra exacta y cómo
 * se compara con la de al lado», y una tabla responde a las dos a la vez.
 */

const VENTANAS = [
  { d: 1, t: 'Hoy' },
  { d: 7, t: '7 días' },
  { d: 30, t: '30 días' },
  { d: 90, t: '90 días' },
]

/** Umbrales oficiales de Core Web Vitals, medidos sobre el p75. */
const UMBRALES: Record<string, [number, number, string]> = {
  LCP: [2500, 4000, 'ms'],
  INP: [200, 500, 'ms'],
  CLS: [0.1, 0.25, ''],
}

function Cifra({ etiqueta, valor, sufijo, nota }: { etiqueta: string; valor: string | number; sufijo?: string; nota?: string }) {
  return (
    <div className="border border-ink/[0.07] rounded-xl bg-paper p-4">
      <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-ink/60">{etiqueta}</p>
      <p className="font-display text-3xl leading-none mt-2 text-ink">
        {valor}
        {sufijo && <span className="text-lg text-ink/60 ml-0.5">{sufijo}</span>}
      </p>
      {nota && <p className="text-[11px] text-ink/60 mt-1.5 leading-snug">{nota}</p>}
    </div>
  )
}

/** Barra de proporción dentro de una celda: compara de un vistazo sin leer. */
function Barra({ parte, total }: { parte: number; total: number }) {
  const pct = total > 0 ? Math.round((parte / total) * 100) : 0
  return (
    <div className="h-1.5 bg-ink/[0.07] rounded-full overflow-hidden mt-1">
      <div className="h-full bg-accent rounded-full" style={{ width: `${pct}%` }} />
    </div>
  )
}

function Seccion({ titulo, children, nota }: { titulo: string; children: React.ReactNode; nota?: string }) {
  return (
    <section className="space-y-3">
      <div>
        <h2 className="font-display uppercase text-xl text-ink leading-none border-b border-ink/[0.07] pb-2">{titulo}</h2>
        {nota && <p className="text-[11px] text-ink/60 mt-2">{nota}</p>}
      </div>
      {children}
    </section>
  )
}

const THEAD = 'font-mono text-[10px] font-bold uppercase tracking-widest text-ink/60 text-left py-2'
const TD = 'py-2 text-sm text-ink border-t border-ink/[0.07]'

export default function AnalyticsPage() {
  const [dias, setDias] = useState(30)
  const [datos, setDatos] = useState<AnaliticaCompleta | null>(null)
  const [recorrido, setRecorrido] = useState<Embudo | null>(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let vivo = true
    // El estado se toca dentro de la función asíncrona, no en el cuerpo del
    // efecto: llamarlo directamente ahí provoca un render extra en cada montaje
    // y el linter lo rechaza.
    const cargar = async () => {
      setCargando(true)
      setError('')
      try {
        const d = await (await fetch(`/api/admin/analytics?dias=${dias}`)).json()
        if (!vivo) return
        if (!d.success) throw new Error(d.error || 'No se pudo cargar')
        setDatos(d.analitica)
        setRecorrido(d.recorrido ?? null)
      } catch (e) {
        if (vivo) setError(e instanceof Error ? e.message : 'No se pudo cargar')
      } finally {
        if (vivo) setCargando(false)
      }
    }
    void cargar()
    return () => {
      vivo = false
    }
  }, [dias])

  const r = datos?.resumen
  const maxSerie = Math.max(1, ...(datos?.serie.map((s) => s.visitas) ?? [1]))
  const maxHora = Math.max(1, ...(datos?.horas.map((h) => h.visitas) ?? [1]))
  const totalCanales = datos?.canales.reduce((a, c) => a + c.visitas, 0) ?? 0
  const totalDisp = datos?.dispositivos.reduce((a, c) => a + c.visitas, 0) ?? 0

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display uppercase text-3xl text-ink leading-none">Analítica</h1>
          <p className="text-sm text-ink/60 mt-2">
            Medición propia, sin cookies ni terceros. El visitante es un hash que cambia cada día.
          </p>
        </div>
        <div className="flex gap-1.5">
          {VENTANAS.map((v) => (
            <button
              key={v.d}
              onClick={() => setDias(v.d)}
              className={`font-mono text-[11px] font-bold uppercase tracking-widest px-3 py-2 rounded-lg border transition-colors ${
                dias === v.d ? 'bg-ink text-paper border-ink' : 'bg-paper text-ink/60 border-ink/[0.12] hover:text-ink'
              }`}
            >
              {v.t}
            </button>
          ))}
        </div>
      </div>

      {cargando && <p className="text-sm text-ink/60">Cargando…</p>}
      {error && <p className="text-sm text-red-700 border border-red-200 bg-red-50 rounded-lg p-3">{error}</p>}

      {datos && r && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <Cifra etiqueta="Páginas vistas" valor={r.visitas.toLocaleString('es-ES')} />
            <Cifra etiqueta="Visitantes" valor={r.visitantes.toLocaleString('es-ES')} nota="Únicos por día, sin cookies" />
            <Cifra etiqueta="Sesiones" valor={r.sesiones.toLocaleString('es-ES')} />
            <Cifra
              etiqueta="Páginas / sesión"
              valor={r.sesiones ? (r.visitas / r.sesiones).toFixed(1) : '0'}
              nota="Más de 1,5 significa que navegan"
            />
            <Cifra etiqueta="Permanencia" valor={r.segundosMedia} sufijo="s" nota="Media por página" />
            <Cifra etiqueta="Rebote" valor={r.rebotePct} sufijo="%" nota="Salidas antes de 10 s" />
            <Cifra etiqueta="Clics a tienda" valor={r.afiliados.toLocaleString('es-ES')} />
            <Cifra etiqueta="CTR" valor={r.ctrPct} sufijo="%" nota="Clics por cada 100 páginas vistas" />
          </div>

          <Seccion titulo="Core Web Vitals reales" nota="Percentil 75 de visitas de verdad, que es el umbral que usa Google. No es un laboratorio: son los móviles de la gente.">
            {datos.vitals.length === 0 ? (
              <p className="text-sm text-ink/60">Todavía sin muestras.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {datos.vitals.map((v) => {
                  const u = UMBRALES[v.name]
                  const estado = !u ? '' : v.p75 <= u[0] ? 'bien' : v.p75 <= u[1] ? 'mejorable' : 'mal'
                  const color = estado === 'bien' ? 'text-accent' : estado === 'mejorable' ? 'text-amber-700' : 'text-red-700'
                  return (
                    <div key={v.name} className="border border-ink/[0.07] rounded-xl bg-paper p-4">
                      <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-ink/60">{v.name}</p>
                      <p className={`font-display text-3xl leading-none mt-2 ${color}`}>
                        {v.p75}
                        {u && <span className="text-lg ml-0.5">{u[2]}</span>}
                      </p>
                      <p className="text-[11px] text-ink/60 mt-1.5">
                        {estado && <span className="uppercase font-semibold">{estado}</span>} · {v.muestras} muestras
                        {u && ` · bien ≤ ${u[0]}${u[2]}`}
                      </p>
                    </div>
                  )
                })}
              </div>
            )}
          </Seccion>

          <Seccion titulo="Por día">
            {datos.serie.length === 0 ? (
              <p className="text-sm text-ink/60">Sin datos en esta ventana.</p>
            ) : (
              <div className="border border-ink/[0.07] rounded-xl bg-paper p-4 overflow-x-auto">
                <div className="flex items-end gap-1 min-w-max h-32">
                  {datos.serie.map((s) => (
                    <div key={s.dia} className="flex flex-col justify-end items-center gap-1 w-8" title={`${s.dia}: ${s.visitas} vistas, ${s.visitantes} visitantes, ${s.afiliados} clics`}>
                      <div className="w-full bg-accent rounded-sm" style={{ height: `${(s.visitas / maxSerie) * 100}%`, minHeight: s.visitas ? 2 : 0 }} />
                      <span className="font-mono text-[9px] text-ink/60">{s.dia.slice(8)}</span>
                    </div>
                  ))}
                </div>
                <p className="font-mono text-[10px] uppercase tracking-widest text-ink/60 mt-3">Páginas vistas por día · pasa el ratón para el detalle</p>
              </div>
            )}
          </Seccion>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <Seccion titulo="De dónde llegan">
              <table className="w-full">
                <thead>
                  <tr>
                    <th className={THEAD}>Canal</th>
                    <th className={`${THEAD} text-right`}>Visitas</th>
                    <th className={`${THEAD} text-right`}>Personas</th>
                  </tr>
                </thead>
                <tbody>
                  {datos.canales.map((c) => (
                    <tr key={c.canal}>
                      <td className={TD}>
                        <span className="capitalize">{c.canal}</span>
                        <Barra parte={c.visitas} total={totalCanales} />
                      </td>
                      <td className={`${TD} text-right tabular-nums`}>{c.visitas}</td>
                      <td className={`${TD} text-right tabular-nums text-ink/60`}>{c.visitantes}</td>
                    </tr>
                  ))}
                  {datos.canales.length === 0 && (
                    <tr><td className={`${TD} text-ink/60`} colSpan={3}>Sin datos todavía.</td></tr>
                  )}
                </tbody>
              </table>
              {datos.referrers.length > 0 && (
                <div className="pt-2">
                  <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-ink/60 mb-2">Sitios concretos</p>
                  <div className="flex flex-wrap gap-1.5">
                    {datos.referrers.map((f) => (
                      <span key={f.ref} className="text-[12px] border border-ink/[0.12] rounded-lg px-2 py-1">
                        {f.ref} <span className="text-ink/60 tabular-nums">{f.visitas}</span>
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </Seccion>

            <Seccion titulo="Con qué entran">
              <table className="w-full">
                <thead>
                  <tr>
                    <th className={THEAD}>Dispositivo</th>
                    <th className={`${THEAD} text-right`}>Visitas</th>
                    <th className={`${THEAD} text-right`}>%</th>
                  </tr>
                </thead>
                <tbody>
                  {datos.dispositivos.map((d) => (
                    <tr key={d.device}>
                      <td className={TD}>
                        <span className="capitalize">{d.device}</span>
                        <Barra parte={d.visitas} total={totalDisp} />
                      </td>
                      <td className={`${TD} text-right tabular-nums`}>{d.visitas}</td>
                      <td className={`${TD} text-right tabular-nums text-ink/60`}>
                        {totalDisp ? Math.round((d.visitas / totalDisp) * 100) : 0}%
                      </td>
                    </tr>
                  ))}
                  {datos.dispositivos.length === 0 && (
                    <tr><td className={`${TD} text-ink/60`} colSpan={3}>Sin datos todavía.</td></tr>
                  )}
                </tbody>
              </table>
              <div className="pt-2">
                <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-ink/60 mb-2">A qué hora entran (Madrid)</p>
                <div className="flex items-end gap-px h-16">
                  {Array.from({ length: 24 }, (_, h) => {
                    const v = datos.horas.find((x) => x.hora === h)?.visitas ?? 0
                    return (
                      <div key={h} className="flex-1 bg-accent rounded-t-sm" style={{ height: `${(v / maxHora) * 100}%`, minHeight: v ? 2 : 1 }} title={`${h}:00 — ${v} visitas`} />
                    )
                  })}
                </div>
                <div className="flex justify-between font-mono text-[9px] text-ink/60 mt-1">
                  <span>0h</span><span>6h</span><span>12h</span><span>18h</span><span>23h</span>
                </div>
              </div>
            </Seccion>
          </div>


          {recorrido && (
            <Seccion
              titulo="El recorrido hasta la compra"
              nota="Agrupado por visitante y día, no por sesión de 30 minutos: el clic a la tienda se registra en el servidor, que no conoce el id de sesión del navegador. Así recorrido y conversión se pueden unir."
            >
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
                <Cifra
                  etiqueta="Páginas antes de comprar"
                  valor={recorrido.pasos.mediana || '—'}
                  nota={`Mediana de ${recorrido.pasos.muestras} compras`}
                />
                {recorrido.profundidad.map((p) => (
                  <Cifra key={p.tramo} etiqueta={p.tramo} valor={p.visitas} nota="visitantes" />
                ))}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div>
                  <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-ink/60 mb-2">
                    Por dónde entran, y cuáles acaban en compra
                  </p>
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[420px]">
                      <thead>
                        <tr>
                          <th className={THEAD}>Página de entrada</th>
                          <th className={`${THEAD} text-right`}>Llegan</th>
                          <th className={`${THEAD} text-right`}>Páginas</th>
                          <th className={`${THEAD} text-right`}>Convierten</th>
                        </tr>
                      </thead>
                      <tbody>
                        {recorrido.entradas.map((e) => (
                          <tr key={e.path}>
                            <td className={`${TD} font-mono text-[12px]`}>{e.path}</td>
                            <td className={`${TD} text-right tabular-nums`}>{e.visitas}</td>
                            <td className={`${TD} text-right tabular-nums text-ink/60`}>{e.paginasMedia}</td>
                            <td className={`${TD} text-right tabular-nums ${e.convierten ? 'text-accent font-semibold' : 'text-ink/60'}`}>
                              {e.convierten ? `${e.pctConversion}%` : '—'}
                            </td>
                          </tr>
                        ))}
                        {recorrido.entradas.length === 0 && (
                          <tr><td className={`${TD} text-ink/60`} colSpan={4}>Sin datos todavía.</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="space-y-6">
                  <div>
                    <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-ink/60 mb-2">
                      Dónde se van los que NO compran
                    </p>
                    <table className="w-full">
                      <tbody>
                        {recorrido.salidas.map((x) => (
                          <tr key={x.path}>
                            <td className={`${TD} font-mono text-[12px]`}>{x.path}</td>
                            <td className={`${TD} text-right tabular-nums`}>{x.veces}</td>
                          </tr>
                        ))}
                        {recorrido.salidas.length === 0 && (
                          <tr><td className={`${TD} text-ink/60`} colSpan={2}>Sin datos todavía.</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  <div>
                    <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-ink/60 mb-2">
                      Saltos más repetidos
                    </p>
                    <ul className="space-y-1.5">
                      {recorrido.transiciones.slice(0, 10).map((t) => (
                        <li key={`${t.desde}>${t.hacia}`} className="text-[12px] font-mono flex items-baseline gap-2">
                          <span className="text-ink/60 tabular-nums w-8 shrink-0">{t.veces}</span>
                          <span className="text-ink">{t.desde}</span>
                          <span className="text-accent">→</span>
                          <span className="text-ink">{t.hacia}</span>
                        </li>
                      ))}
                      {recorrido.transiciones.length === 0 && <li className="text-sm text-ink/60">Sin datos todavía.</li>}
                    </ul>
                  </div>
                </div>
              </div>
            </Seccion>
          )}

          <Seccion titulo="Qué páginas funcionan" nota="El scroll y el tiempo distinguen lo que se lee de lo que se abre y se cierra. La última columna dice qué contenido acaba en venta.">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px]">
                <thead>
                  <tr>
                    <th className={THEAD}>Página</th>
                    <th className={`${THEAD} text-right`}>Vistas</th>
                    <th className={`${THEAD} text-right`}>Personas</th>
                    <th className={`${THEAD} text-right`}>Tiempo</th>
                    <th className={`${THEAD} text-right`}>Scroll</th>
                    <th className={`${THEAD} text-right`}>Clics</th>
                    <th className={`${THEAD} text-right`}>CTR</th>
                  </tr>
                </thead>
                <tbody>
                  {datos.paginas.map((p) => (
                    <tr key={p.path}>
                      <td className={`${TD} font-mono text-[12px]`}>{p.path}</td>
                      <td className={`${TD} text-right tabular-nums`}>{p.visitas}</td>
                      <td className={`${TD} text-right tabular-nums text-ink/60`}>{p.visitantes}</td>
                      <td className={`${TD} text-right tabular-nums text-ink/60`}>{p.segundos ? `${p.segundos}s` : '—'}</td>
                      <td className={`${TD} text-right tabular-nums text-ink/60`}>{p.scroll ? `${p.scroll}%` : '—'}</td>
                      <td className={`${TD} text-right tabular-nums font-semibold`}>{p.afiliados || '—'}</td>
                      <td className={`${TD} text-right tabular-nums ${p.afiliados ? 'text-accent font-semibold' : 'text-ink/60'}`}>
                        {p.visitas ? `${Math.round((p.afiliados / p.visitas) * 1000) / 10}%` : '—'}
                      </td>
                    </tr>
                  ))}
                  {datos.paginas.length === 0 && (
                    <tr><td className={`${TD} text-ink/60`} colSpan={7}>Sin datos todavía.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </Seccion>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <Seccion titulo="Herramientas" nota="Cuáles se usan de verdad, y por cuánta gente distinta.">
              <table className="w-full">
                <thead>
                  <tr>
                    <th className={THEAD}>Herramienta</th>
                    <th className={`${THEAD} text-right`}>Usos</th>
                    <th className={`${THEAD} text-right`}>Personas</th>
                  </tr>
                </thead>
                <tbody>
                  {datos.herramientas.map((h) => (
                    <tr key={h.name}>
                      <td className={TD}>{h.name}</td>
                      <td className={`${TD} text-right tabular-nums`}>{h.usos}</td>
                      <td className={`${TD} text-right tabular-nums text-ink/60`}>{h.visitantes}</td>
                    </tr>
                  ))}
                  {datos.herramientas.length === 0 && (
                    <tr><td className={`${TD} text-ink/60`} colSpan={3}>Aún sin registrar.</td></tr>
                  )}
                </tbody>
              </table>
            </Seccion>

            <Seccion titulo="Qué buscan" nota="Lo que se busca y no aparece es la lista de lo que falta por escribir o por vender.">
              <table className="w-full">
                <thead>
                  <tr>
                    <th className={THEAD}>Término</th>
                    <th className={`${THEAD} text-right`}>Veces</th>
                    <th className={`${THEAD} text-right`}>Sin resultado</th>
                  </tr>
                </thead>
                <tbody>
                  {datos.busquedas.map((b) => (
                    <tr key={b.termino}>
                      <td className={TD}>{b.termino}</td>
                      <td className={`${TD} text-right tabular-nums`}>{b.veces}</td>
                      <td className={`${TD} text-right tabular-nums ${b.sinResultado ? 'text-red-700 font-semibold' : 'text-ink/60'}`}>
                        {b.sinResultado || '—'}
                      </td>
                    </tr>
                  ))}
                  {datos.busquedas.length === 0 && (
                    <tr><td className={`${TD} text-ink/60`} colSpan={3}>Aún sin registrar.</td></tr>
                  )}
                </tbody>
              </table>
            </Seccion>
          </div>
        </>
      )}
    </div>
  )
}
