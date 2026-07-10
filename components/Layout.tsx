import Link from 'next/link'
import Navbar from './Navbar'
import { FEATURED_FISHING_TYPES } from '@/lib/fishing'

interface LayoutProps {
  children: React.ReactNode
}

export default function Layout({ children }: LayoutProps) {
  const currentYear = new Date().getFullYear()

  return (
    <div className="min-h-screen bg-[#f6f8fb] text-slate-800 flex flex-col selection:bg-sky-500 selection:text-white">
      <Navbar />

      <main className="flex-1 w-full">{children}</main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white mt-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-14 pb-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-10 pb-12">
            <div className="md:col-span-2 space-y-4">
              <div className="flex items-center gap-2">
                <span className="text-xl">🎣</span>
                <span className="text-xl font-extrabold tracking-tight text-slate-900">PescaPlus</span>
              </div>
              <p className="text-sm text-slate-500 max-w-sm leading-relaxed">
                El portal de referencia para pescadores deportivos. Combinamos fichas optimizadas por
                inteligencia artificial y una cuidada selección de aparejos de AliExpress.
              </p>
            </div>

            <div className="space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900">Categorías</h4>
              <ul className="space-y-2.5 text-sm text-slate-500">
                {FEATURED_FISHING_TYPES.map((type) => (
                  <li key={type.id}>
                    <Link href={`/categories/${type.id}`} className="hover:text-sky-600 transition-colors">
                      {type.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div className="space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900">Afiliación</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                PescaPlus participa en el Programa de Afiliados de AliExpress. Algunos enlaces
                redirigen a su tienda oficial, recibiendo una comisión por las ventas aptas.
              </p>
            </div>
          </div>

          <div className="pt-8 border-t border-slate-200 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-xs text-slate-400">
              &copy; {currentYear} PescaPlus. Diseñado para apasionados de la pesca.
            </p>
            <div className="flex gap-6 text-xs text-slate-500">
              <Link href="/advice" className="hover:text-sky-600 transition-colors">Asistente IA</Link>
              <Link href="/" className="hover:text-sky-600 transition-colors">Contacto</Link>
              <Link href="/admin" className="hover:text-sky-600 transition-colors">Admin</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
