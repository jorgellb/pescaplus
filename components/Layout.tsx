import Link from 'next/link'
import Navbar from './Navbar'
import { FISHING_TYPES } from '@/lib/fishing'

interface LayoutProps {
  children: React.ReactNode
}

export default function Layout({ children }: LayoutProps) {
  const currentYear = new Date().getFullYear()

  return (
    <div className="min-h-screen bg-paper text-ink flex flex-col">
      <Navbar />

      <main className="flex-1 w-full">{children}</main>

      {/* Footer */}
      <footer className="bg-ink text-paper border-t-2 border-ink mt-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
            <div className="lg:col-span-5 space-y-4">
              <span className="font-display text-5xl md:text-6xl uppercase leading-none block">
                Pesca<span className="text-accent">Plus</span>
              </span>
              <p className="text-sm text-paper/70 max-w-sm leading-relaxed">
                Aparejos de pesca seleccionados de AliExpress, con fichas optimizadas por
                inteligencia artificial y un asistente experto por modalidad.
              </p>
            </div>

            <div className="lg:col-span-4">
              <h4 className="font-mono text-[11px] font-bold uppercase tracking-widest text-paper/50 mb-4">Categorías</h4>
              <ul className="grid grid-cols-2 gap-y-2 text-sm font-bold uppercase tracking-tight">
                {FISHING_TYPES.slice(0, 8).map((type) => (
                  <li key={type.id}>
                    <Link href={`/categories/${type.id}`} className="hover:text-accent transition-colors">{type.name}</Link>
                  </li>
                ))}
              </ul>
            </div>

            <div className="lg:col-span-3">
              <h4 className="font-mono text-[11px] font-bold uppercase tracking-widest text-paper/50 mb-4">Afiliación</h4>
              <p className="text-xs text-paper/60 leading-relaxed">
                PescaPlus participa en el Programa de Afiliados de AliExpress. Algunos enlaces
                redirigen a su tienda oficial, recibiendo una comisión por ventas aptas.
              </p>
            </div>
          </div>

          <div className="mt-12 pt-6 border-t border-paper/20 flex flex-col md:flex-row justify-between items-center gap-3 font-mono text-[11px] uppercase tracking-widest text-paper/50">
            <p>&copy; {currentYear} PescaPlus</p>
            <div className="flex gap-6">
              <Link href="/advice" className="hover:text-accent transition-colors">Asistente IA</Link>
              <Link href="/admin" className="hover:text-accent transition-colors">Admin</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
