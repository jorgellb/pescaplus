import Link from 'next/link'
import Navbar from './Navbar'
import { FEATURED_FISHING_TYPES } from '@/lib/fishing'

interface LayoutProps {
  children: React.ReactNode
}

export default function Layout({ children }: LayoutProps) {
  const currentYear = new Date().getFullYear()

  return (
    <div className="min-h-screen bg-[#060b13] text-slate-100 flex flex-col selection:bg-cyan-500 selection:text-slate-900">
      {/* Sticky header navbar */}
      <Navbar />
      
      {/* Main page content */}
      <main className="flex-1 w-full relative z-10">
        {children}
      </main>
      
      {/* Premium Dark Marine Footer */}
      <footer className="relative border-t border-white/5 bg-slate-950/80 backdrop-blur-md pt-16 pb-8 mt-24 overflow-hidden z-10">
        {/* Glow effect inside footer */}
        <div className="absolute -bottom-24 left-1/2 -translate-x-1/2 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl -z-10" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 pb-12">
            {/* Column 1: Info */}
            <div className="md:col-span-2 space-y-4">
              <div className="flex items-center gap-2">
                <span className="text-xl">🎣</span>
                <span className="text-xl font-extrabold tracking-tight bg-gradient-to-r from-cyan-400 to-teal-300 bg-clip-text text-transparent">
                  PescaPlus
                </span>
              </div>
              <p className="text-sm text-slate-400 max-w-sm leading-relaxed">
                El portal de referencia para pescadores deportivos. Combinamos consejos tácticos generados por Inteligencia Artificial y una cuidada selección de aparejos de AliExpress.
              </p>
            </div>

            {/* Column 2: Categories */}
            <div className="space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200 border-l-2 border-cyan-400 pl-2">
                Categorías
              </h4>
              <ul className="space-y-2 text-sm text-slate-400">
                {FEATURED_FISHING_TYPES.map((type) => (
                  <li key={type.id}>
                    <Link href={`/categories/${type.id}`} className="hover:text-cyan-400 transition-colors">
                      {type.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Column 3: Disclaimer */}
            <div className="space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200 border-l-2 border-teal-400 pl-2">
                Afiliación
              </h4>
              <p className="text-xs text-slate-500 leading-relaxed">
                Aviso de afiliado: PescaPlus participa en el Programa de Afiliados de AliExpress. Algunos de los enlaces mostrados en esta web redirigen a su tienda oficial, recibiendo una comisión por las ventas aptas.
              </p>
            </div>
          </div>

          {/* Bottom section */}
          <div className="pt-8 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-xs text-slate-500">
              &copy; {currentYear} PescaPlus. Diseñado para apasionados de la pesca. Todos los derechos reservados.
            </p>
            <div className="flex gap-6 text-xs text-slate-400">
              <Link href="/advice" className="hover:text-cyan-400 transition-colors">Preguntas Frecuentes IA</Link>
              <Link href="/" className="hover:text-cyan-400 transition-colors">Contacto</Link>
              <Link href="/admin" className="hover:text-cyan-400 transition-colors">Admin</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}