import Link from 'next/link'
import DayDial from '@/components/charters/DayDial'
import Icon, { type IconName } from '@/components/icons/Icon'
import { bestSpotToday } from '@/lib/charter-window'
import { getSpot } from '@/lib/fishing-spots'
import { todayMadridISO } from '@/lib/solunar-format'

/**
 * La sección de chárters de la portada.
 *
 * Dos decisiones que la hacen distinta de un banner cualquiera:
 *
 * 1. NO enseña salidas. Hoy hay cero publicadas, y una parrilla vacía vende peor
 *    que no estar. Enseña la ventana de pesca REAL de hoy en la mejor zona, que
 *    es lo único que tenemos y nadie más tiene: se calcula en el momento, sin
 *    red, y cambia cada día. Cuando haya salidas, esta misma sección pasa a
 *    listarlas y el argumento ya estará contado.
 *
 * 2. Tiene DOS puertas, porque un mercado de dos lados se muere por el lado de
 *    la oferta. Al pescador se le ofrece lo que ya funciona (la previsión) y al
 *    patrón, publicar gratis. Mandar a los dos al mismo botón sería desperdiciar
 *    la mitad de las visitas.
 */

const GARANTIAS: { icon: IconName; title: string; text: string }[] = [
  { icon: 'lock', title: 'Titulación y seguro comprobados', text: 'Antes de publicar, revisamos a mano la licencia del patrón y su póliza en vigor.' },
  { icon: 'card', title: 'Pago seguro con devolución', text: 'Se cobra por la pasarela, no en mano. Si la salida se cancela, se devuelve.' },
  { icon: 'wave', title: 'Con la previsión al lado', text: 'Cada salida enseña mareas, viento y estado del mar de ESE día, y avisa si no es navegable.' },
]

export default function CharterSpotlight() {
  const hoy = todayMadridISO()
  const mejor = bestSpotToday(hoy)
  const spot = mejor ? getSpot(mejor.slug) : null

  return (
    <section className="border-t border-ink/[0.07] bg-paper">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-14 sm:py-20">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-14 items-center">
          {/* — Argumento — */}
          <div>
            <p className="font-mono text-xs font-bold uppercase tracking-[0.2em] text-accent mb-4">
              <Icon name="anchor" className="w-3.5 h-3.5 inline -mt-0.5" strokeWidth={2} /> Salir con patrón
            </p>
            <h2 className="font-display uppercase text-4xl sm:text-5xl leading-[0.98] text-ink">
              El único sitio que te dice<br />
              <span className="text-accent">si ese día pica</span>
            </h2>
            <p className="text-ink/70 text-[15px] leading-relaxed mt-5 max-w-xl">
              En cualquier web de chárters ves una foto del barco, una hora y un precio. Aquí ves
              además <strong className="text-ink">la ventana de pesca de esa fecha y esa zona</strong>:
              actividad solunar, mareas, viento y si el mar estará navegable. Porque un buen barco un
              mal día sigue siendo un mal día.
            </p>

            <dl className="mt-8 space-y-4">
              {GARANTIAS.map((g) => (
                <div key={g.title} className="flex gap-3">
                  <Icon name={g.icon} className="w-5 h-5 text-accent shrink-0 mt-0.5" strokeWidth={1.8} />
                  <div>
                    <dt className="font-semibold text-[14px] text-ink">{g.title}</dt>
                    <dd className="text-[13px] text-ink/60 leading-snug">{g.text}</dd>
                  </div>
                </div>
              ))}
            </dl>

            <div className="mt-9 flex flex-wrap gap-3">
              <Link
                href="/charters"
                className="inline-flex items-center gap-2 bg-ink text-paper px-6 py-3 text-sm font-semibold rounded-full shadow-hard hover-shift hover:bg-accent"
              >
                <Icon name="boat" className="w-4 h-4" strokeWidth={2} /> Ver salidas
              </Link>
              <Link
                href="/charters/operador"
                className="inline-flex items-center gap-2 border border-ink/15 text-ink px-6 py-3 text-sm font-semibold rounded-full hover:border-accent hover:text-accent"
              >
                <Icon name="anchor" className="w-4 h-4" strokeWidth={2} /> Soy patrón: publicar gratis
              </Link>
            </div>
          </div>

          {/* — La ventana de hoy, con datos de verdad — */}
          {mejor && spot && (
            <div className="border border-ink/[0.07] rounded-2xl bg-paper shadow-hard overflow-hidden">
              <div className="px-5 pt-5">
                <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-ink/60">
                  Hoy, la mejor ventana está en
                </p>
                <p className="font-display text-3xl text-ink leading-none mt-1.5">{spot.name}</p>
              </div>

              <DayDial window={mejor.window} className="w-full" />

              <div className="px-5 pb-5 -mt-3">
                <div className="flex items-baseline justify-between gap-3 border-t border-ink/[0.07] pt-4">
                  <div>
                    <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-accent">
                      {mejor.window.label}
                    </p>
                    {mejor.window.best && (
                      <p className="text-[15px] font-bold text-ink mt-0.5">Mejor tramo {mejor.window.best}</p>
                    )}
                  </div>
                  <p className="text-[12px] text-ink/60 text-right shrink-0">
                    {mejor.window.moonPhaseName}
                    <br />
                    {Math.round(mejor.window.moonIllumination * 100)} % iluminada
                  </p>
                </div>
                <Link
                  href={`/mejores-horas/${mejor.slug}`}
                  className="inline-block text-[12px] font-bold uppercase tracking-wide text-accent hover:underline mt-3"
                >
                  Ver la previsión completa →
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
