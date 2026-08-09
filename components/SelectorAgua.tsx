import Link from 'next/link'

/**
 * Mar / agua dulce.
 *
 * Sin esto, quien entra en «Especies» ve las 29 de mar y no tiene forma de
 * enterarse de que existen otras 15 de río: la única puerta era el menú
 * desplegable, y nadie vuelve al menú cuando ya ha llegado a donde creía que
 * iba. Lo reportó Jorge en cuanto lo vio.
 *
 * Van los dos siempre visibles, con la sección actual marcada, en vez de un solo
 * enlace del tipo «ver agua dulce». Dos pestañas dicen que el sitio tiene dos
 * mundos; un enlace suelto parece una nota al pie.
 */
export default function SelectorAgua({ activo }: { activo: 'mar' | 'rio' }) {
  const base = 'font-mono text-[11px] font-bold uppercase tracking-widest px-4 py-2.5 rounded-lg border transition-colors'
  const on = 'bg-ink text-paper border-ink'
  const off = 'bg-paper text-ink/60 border-ink/[0.12] hover:text-ink hover:border-ink/25'

  return (
    <nav className="flex flex-wrap gap-2 mt-6" aria-label="Tipo de agua">
      <Link href="/especies" className={`${base} ${activo === 'mar' ? on : off}`} aria-current={activo === 'mar' ? 'page' : undefined}>
        🐟 Mar · 29 especies
      </Link>
      <Link href="/rio" className={`${base} ${activo === 'rio' ? on : off}`} aria-current={activo === 'rio' ? 'page' : undefined}>
        🎣 Agua dulce · 15 especies
      </Link>
    </nav>
  )
}
