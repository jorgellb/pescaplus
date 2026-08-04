import Icon, { type IconName } from '@/components/icons/Icon'
import { PLATFORM_FEE_PERCENT } from '@/lib/stripe'

/**
 * El argumentario para el patrón, encima del formulario de alta.
 *
 * Antes esta página era el formulario a pelo: lo primero que veía un patrón era
 * una casilla pidiéndole el número de su licencia y el de su póliza, sin que
 * nadie le hubiera dicho qué cuesta, qué gana ni por qué aquí. Pedir papeles
 * antes de dar un motivo es la forma más rápida de perder a un profesional.
 *
 * Tres reglas al escribirlo:
 *
 * 1. La comisión se dice ARRIBA y con su número. Un patrón que la descubre en el
 *    paso cuatro ya no se fía de nada más de lo que le has contado.
 * 2. Nada de promesas que no podamos sostener. No se habla de volumen de
 *    reservas ni de plazos de cobro: no hay histórico y Stripe manda en eso.
 * 3. Que somos nuevos se dice, no se esconde. Con cero salidas publicadas, «sé
 *    el primero de tu zona» es cierto y además es una ventaja real.
 */

const VENTAJAS: { icon: IconName; title: string; text: string }[] = [
  {
    icon: 'wave',
    title: 'Tu salida sale con la previsión de ese día',
    text: 'Mareas, viento, estado del mar y actividad solunar de esa fecha y ese puerto, al lado del precio. Ninguna otra plataforma lo hace, y es lo que convierte a un curioso en una reserva: el pescador ve que ese día promete.',
  },
  {
    icon: 'target',
    title: 'Te encuentra quien ya está mirando el mar',
    text: 'Aquí la gente entra a ver cuándo pica en su zona y qué especie entra este mes. Tu salida aparece justo ahí, delante de alguien que ya tiene la idea metida en la cabeza.',
  },
  {
    icon: 'lock',
    title: 'Titulación y seguro comprobados',
    text: 'Revisamos a mano tu licencia profesional y tu póliza antes de publicar. Es trabajo para ti una sola vez, y te separa de quien sale a llevar gente sin papeles.',
  },
  {
    icon: 'calendar',
    title: 'Tú mandas en el calendario',
    text: 'Publicas los días que quieres, con sus plazas, su precio y su mínimo para confirmar. Sin exclusividad: puedes seguir vendiendo por tu cuenta y por donde ya vendas.',
  },
]

const PASOS = [
  { n: 1, title: 'Te registras', text: 'Cinco minutos: tus datos, tu puerto base, el barco y las referencias de licencia y seguro.' },
  { n: 2, title: 'Te verificamos', text: 'Comprobamos los papeles a mano. Si falta algo te escribimos; no publicamos nada hasta que esté.' },
  { n: 3, title: 'Publicas tus salidas', text: 'Fecha, hora, plazas, precio y qué incluye. Cada salida sale con la previsión de su día.' },
]

export default function OperatorPitch() {
  return (
    <div className="space-y-14">
      {/* — Lo que cuesta, sin rodeos — */}
      <section>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { big: 'Gratis', small: 'Publicar y estar en el directorio. Sin cuota ni permanencia.' },
            { big: `${PLATFORM_FEE_PERCENT} %`, small: 'De comisión, y solo cuando cobras una reserva. Si no vendes, no pagas nada.' },
            { big: 'A tu cuenta', small: 'El pescador paga por la pasarela y el dinero entra en tu cuenta de Stripe, no en la nuestra.' },
          ].map((c) => (
            <div key={c.big} className="border border-ink/[0.07] rounded-2xl bg-paper p-5 shadow-hard">
              <p className="font-display text-3xl text-accent leading-none">{c.big}</p>
              <p className="text-[13px] text-ink/70 leading-snug mt-2">{c.small}</p>
            </div>
          ))}
        </div>
      </section>

      {/* — Por qué aquí — */}
      <section>
        <h2 className="font-display uppercase text-3xl sm:text-4xl leading-[1.02] text-ink">
          Por qué publicar aquí
        </h2>
        <dl className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-6">
          {VENTAJAS.map((v) => (
            <div key={v.title} className="flex gap-3">
              <Icon name={v.icon} className="w-5 h-5 text-accent shrink-0 mt-0.5" strokeWidth={1.8} />
              <div>
                <dt className="font-semibold text-[15px] text-ink leading-snug">{v.title}</dt>
                <dd className="text-[13px] text-ink/65 leading-relaxed mt-1">{v.text}</dd>
              </div>
            </div>
          ))}
        </dl>
      </section>

      {/* — Cómo funciona — */}
      <section>
        <h2 className="font-display uppercase text-3xl sm:text-4xl leading-[1.02] text-ink">Cómo funciona</h2>
        <ol className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
          {PASOS.map((p) => (
            <li key={p.n} className="border border-ink/[0.07] rounded-2xl bg-paper p-5">
              <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-accent text-paper font-display text-lg">
                {p.n}
              </span>
              <p className="font-semibold text-[15px] text-ink mt-3">{p.title}</p>
              <p className="text-[13px] text-ink/65 leading-relaxed mt-1">{p.text}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* — Lo que hay que decir aunque no ayude a vender — */}
      <section className="border border-ink/[0.07] rounded-2xl bg-ink/[0.02] p-5 sm:p-6">
        <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-ink/60">Seamos claros</p>
        <p className="text-[14px] text-ink/75 leading-relaxed mt-2">
          PescaPlus acaba de abrir la parte de chárters y{' '}
          <strong className="text-ink">todavía no hay salidas publicadas</strong>. Quien entre ahora será
          el primer patrón de su zona y no tendrá a nadie compitiendo por delante. Si lo que buscas es
          una plataforma con cola de reservas hecha, hoy no somos eso; si lo que buscas es un sitio
          donde el pescador llega ya mirando la previsión de tu puerto, sí.
        </p>
      </section>
    </div>
  )
}
