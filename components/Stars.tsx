import Icon from '@/components/icons/Icon'

/**
 * Una valoración en estrellas, de verdad en SVG.
 *
 * El patrón anterior apilaba glifos de texto —`'★'.repeat(n)`—, que se ven
 * distinto en cada fuente del sistema: el espaciado no es uniforme y en
 * algunas fuentes la estrella rellena y la vacía no pesan igual, así que la
 * fila "tiembla". Cinco SVG idénticos, solo con el color cambiado, se ven
 * exactamente igual en cualquier sitio.
 */
export default function Stars({
  rating, max = 5, className = 'w-4 h-4', filledClassName = 'text-amber-500', emptyClassName = 'text-ink/20',
}: {
  rating: number
  max?: number
  className?: string
  filledClassName?: string
  emptyClassName?: string
}) {
  const llenas = Math.round(rating)
  return (
    <span className="inline-flex items-center gap-0.5" role="img" aria-label={`${rating} de ${max} estrellas`}>
      {Array.from({ length: max }, (_, i) => (
        <Icon key={i} name="star" className={`${className} ${i < llenas ? filledClassName : emptyClassName}`} />
      ))}
    </span>
  )
}
