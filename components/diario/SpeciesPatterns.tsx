'use client'

import { useEffect, useState } from 'react'
import { SEA_SPECIES } from '@/lib/fishing-species'
import Icon from '@/components/icons/Icon'
import type { PatronEspecie } from '@/lib/catch-patterns'

/**
 * Con qué condiciones pican TUS especies.
 *
 * Sale de las capturas que has COMPARTIDO, no de tu diario local: el diario no
 * sale de tu navegador y ahí se queda. Se dice en la propia sección, porque la
 * diferencia importa y no debe adivinarse.
 *
 * Todo lo que se afirma lleva pegado el número de capturas que lo sostiene, y
 * la redacción evita el salto de la frecuencia a la causa: "tus capturas se
 * reparten así", nunca "pica mejor con". Si alguien solo sale con marea viva,
 * todas sus capturas serán con marea viva, y eso solo dice cuándo sale.
 */
interface Respuesta {
  success: boolean
  minimo: number
  selladas: number
  cuenta: Record<string, number>
  patrones: PatronEspecie[]
}

const nombreDe = (id: string) => SEA_SPECIES.find((s) => s.id === id)?.name ?? id
const num = (n: number, d = 1) => n.toLocaleString('es-ES', { maximumFractionDigits: d })

function Fila({ etiqueta, children }: { etiqueta: string; children: React.ReactNode }) {
  return (
    <p className="text-[14px] text-ink/85">
      <span className="text-ink/60">{etiqueta}:</span> {children}
    </p>
  )
}

export default function SpeciesPatterns() {
  const [datos, setDatos] = useState<Respuesta | null>(null)
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    fetch('/api/mis-patrones')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (d?.success) setDatos(d) })
      .catch(() => {})
      .finally(() => setCargando(false))
  }, [])

  // Sin sesión o sin capturas compartidas no se enseña un hueco vacío.
  if (cargando || !datos || datos.selladas === 0) return null

  // Especies con capturas pero aún sin las suficientes: se dice cuántas faltan
  // en vez de dejar un silencio que parece un fallo.
  const casi = Object.entries(datos.cuenta)
    .filter(([id, n]) => n < datos.minimo && !datos.patrones.some((p) => p.speciesId === id))
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)

  return (
    <section className="bg-paper border border-ink/[0.07] rounded-2xl shadow-hard p-5 space-y-4">
      <div>
        <h2 className="font-display uppercase text-xl leading-none inline-flex items-center gap-2"><Icon name="microscope" className="w-5 h-5" strokeWidth={1.7} />Con qué condiciones pican</h2>
        <p className="text-[12.5px] text-ink/60 mt-1">
          De tus {datos.selladas} capturas compartidas, con la marea, el fondo y el mar que había en cada una.
        </p>
      </div>

      {datos.patrones.length === 0 && casi.length > 0 && (
        <p className="text-[14px] text-ink/70">
          Aún no hay bastantes de ninguna especie. Te falta{casi[0][1] === datos.minimo - 1 ? '' : 'n'}{' '}
          <strong>{datos.minimo - casi[0][1]}</strong> de {nombreDe(casi[0][0])} para ver su patrón.
        </p>
      )}

      {datos.patrones.map((p) => (
        <div key={p.speciesId} className="rounded-xl border border-ink/[0.09] p-4 space-y-1">
          <p className="font-display text-lg text-ink">
            {nombreDe(p.speciesId)}{' '}
            <span className="text-[13px] font-normal text-ink/60">
              · {p.capturas} capturas, {p.piezas} piezas
            </span>
          </p>

          {p.sondaM && (
            <Fila etiqueta="Sonda">
              entre <strong>{num(p.sondaM.min)}</strong> y <strong>{num(p.sondaM.max)} m</strong>
              , la mitad por {num(p.sondaM.mediana)} m
            </Fila>
          )}
          {p.fondo && (
            <Fila etiqueta="Fondo">
              <strong>{p.fondo.tipo}</strong> en {p.fondo.n} de {p.capturas}
            </Fila>
          )}
          {p.coeficiente && (
            <Fila etiqueta="Coeficiente">
              de <strong>{num(p.coeficiente.min, 0)}</strong> a <strong>{num(p.coeficiente.max, 0)}</strong>
              , mediana {num(p.coeficiente.mediana, 0)}
            </Fila>
          )}
          {p.franja && (
            <Fila etiqueta="Cuándo">
              <strong>{p.franja.tipo}</strong> en {p.franja.n} de {p.capturas}
            </Fila>
          )}
          {p.aguaC && (
            <Fila etiqueta="Agua">
              de {num(p.aguaC.min)} a {num(p.aguaC.max)} °C
            </Fila>
          )}
          {p.vientoKmh && (
            <Fila etiqueta="Viento">
              hasta {num(p.vientoKmh.max, 0)} km/h, mediana {num(p.vientoKmh.mediana, 0)}
            </Fila>
          )}

          {p.avisos.map((a) => (
            <p key={a} className="text-[12px] text-amber-900">{a}</p>
          ))}
        </div>
      ))}

      {/*
        La advertencia que evita que esto se lea como una ley. Se pone al pie y
        no escondida: es la diferencia entre una herramienta y una superstición
        con números.
      */}
      <p className="text-[12px] text-ink/60 leading-relaxed">
        Esto describe <strong>cuándo has pescado tú</strong>, no cuándo pica el pez. Si sales sobre todo
        con marea viva, tus capturas saldrán con marea viva aunque no tenga nada que ver.
        Con más salidas en condiciones variadas, más dice.
      </p>
    </section>
  )
}
