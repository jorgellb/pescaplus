'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { getSpotFavorites, onSpotFavoritesChanged } from '@/lib/spot-favorites'

/**
 * Las ventanas abiertas en TUS zonas.
 *
 * El aviso por correo ya existía, pero exige tener configurado el proveedor de
 * envío y llega cuando llega. Esto responde a la misma pregunta nada más entrar
 * y funciona hoy, sin clave y sin cuenta: las zonas guardadas viven en el propio
 * navegador.
 *
 * Solo aparece si hay zonas guardadas Y hay algo que contar. Un panel que dice
 * "no tienes ventanas" ocupando sitio en cada visita cansa más de lo que informa.
 */
interface Ventana { dateISO: string; start: number; end: number; avg: number }
interface Zona { slug: string; name: string; region: string; ventanas: Ventana[] }

const hora = (t: number) =>
  new Date(t).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Madrid' })

/**
 * El tramo, escrito para que se entienda.
 *
 * Una ventana que acaba a medianoche daba "15:00–00:00", y una que abarcaba el
 * día entero, "00:00–00:00", que se lee como un error del programa. La medianoche
 * final se escribe 24:00 —que es como se dice un horario de cierre— y el día
 * completo se dice con palabras.
 */
function tramo(start: number, end: number): string {
  const horas = (end - start) / 3600_000
  if (horas >= 20) return 'prácticamente todo el día'
  const fin = hora(end)
  return `${hora(start)}–${fin === '00:00' ? '24:00' : fin}`
}

/** "hoy" / "mañana" / "sábado": nadie piensa en fechas ISO. */
function dia(dateISO: string): string {
  const hoy = new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Madrid' })
  const manana = new Date(Date.now() + 86400000).toLocaleDateString('sv-SE', { timeZone: 'Europe/Madrid' })
  if (dateISO === hoy) return 'hoy'
  if (dateISO === manana) return 'mañana'
  return new Date(`${dateISO}T12:00:00`).toLocaleDateString('es-ES', { weekday: 'long', timeZone: 'Europe/Madrid' })
}

export default function OpenWindows() {
  const [zonas, setZonas] = useState<Zona[]>([])
  const [cargando, setCargando] = useState(true)

  const cargar = useCallback(() => {
    const favs = getSpotFavorites()
    if (favs.length === 0) {
      // Fuera del cuerpo del efecto: llamarlo ahí encadena un render sobre otro.
      queueMicrotask(() => { setZonas([]); setCargando(false) })
      return
    }
    fetch(`/api/ventanas?zonas=${favs.join(',')}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (d?.success) setZonas(d.zonas.filter((z: Zona) => z.ventanas.length > 0)) })
      .catch(() => {})
      .finally(() => setCargando(false))
  }, [])

  useEffect(() => {
    cargar()
    // Guardar o quitar una zona debe reflejarse sin recargar la página.
    return onSpotFavoritesChanged(cargar)
  }, [cargar])

  if (cargando || zonas.length === 0) return null

  return (
    <section className="bg-paper border border-ink/[0.07] rounded-2xl shadow-hard p-5 space-y-3">
      <div>
        <h2 className="font-display uppercase text-xl leading-none">🔔 Tus ventanas abiertas</h2>
        <p className="text-[12.5px] text-ink/60 mt-1">
          De las zonas que has guardado, con lo que queda por venir.
        </p>
      </div>

      <ul className="space-y-2">
        {zonas.map((z) => (
          <li key={z.slug} className="rounded-xl border border-ink/[0.09] px-4 py-3">
            <Link href={`/mejores-horas/${z.slug}`} className="font-display text-lg text-ink hover:text-accent">
              {z.name}
            </Link>
            <span className="text-[12px] text-ink/60"> · {z.region}</span>
            <ul className="mt-1 space-y-0.5">
              {z.ventanas.map((v) => (
                <li key={`${v.dateISO}-${v.start}`} className="text-[13.5px] text-ink/85">
                  <span className="font-semibold">{dia(v.dateISO)}</span>{' '}
                  {tramo(v.start, v.end)}
                  <span className="text-ink/60"> · actividad {v.avg}</span>
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>

      <p className="text-[11.5px] text-ink/60">
        Es una previsión: cuanto más lejos, menos fina. Las de hoy y mañana son las que valen para decidir.
      </p>
    </section>
  )
}
