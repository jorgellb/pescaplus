export default function FishRating({ value, className = '' }: { value: number; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-1 ${className}`} role="img" aria-label={`Actividad ${value} de 5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <span key={i} className={`w-2.5 h-2.5 rounded-full ${i <= value ? 'bg-accent' : 'bg-ink/15'}`} />
      ))}
    </span>
  )
}
