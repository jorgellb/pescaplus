import Link from 'next/link'
import Navbar from './Navbar'
import ChatWidget from './ChatWidget'
import { FISHING_TYPES } from '@/lib/fishing'

interface LayoutProps {
  children: React.ReactNode
}

export default function Layout({ children }: LayoutProps) {
  const currentYear = new Date().getFullYear()

  return (
    <div className="min-h-screen bg-paper text-ink flex flex-col">
      <a href="#contenido" className="skip-link">Saltar al contenido</a>
      <Navbar />

      <main id="contenido" className="flex-1 w-full">{children}</main>

      <div className="print:hidden"><ChatWidget /></div>

      {/* Footer */}
      <footer className="bg-ink text-paper border-t border-ink/12 mt-24 print:hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
            <div className="lg:col-span-5 space-y-4">
              <span className="font-display text-5xl md:text-6xl uppercase leading-none block">
                Pesca<span className="text-accent">Plus</span>
              </span>
              <p className="text-sm text-paper/70 max-w-sm leading-relaxed">
                Aparejos de pesca seleccionados por nuestro equipo, con fichas detalladas
                y un asesor experto para cada modalidad.
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
              <h4 className="font-mono text-[11px] font-bold uppercase tracking-widest text-paper/50 mb-4">Ayuda</h4>
              <ul className="space-y-2 text-sm font-bold uppercase tracking-tight">
                <li><Link href="/contacto" className="hover:text-accent transition-colors">Contacto</Link></li>
                <li><Link href="/mejores-horas" className="hover:text-accent transition-colors">Cuándo pescar</Link></li>
                <li><Link href="/donde-pescar" className="hover:text-accent transition-colors">Dónde pescar</Link></li>
                <li><Link href="/diario" className="hover:text-accent transition-colors">Diario de capturas</Link></li>
                <li><Link href="/calendario" className="hover:text-accent transition-colors">Calendario</Link></li>
                <li><Link href="/especies" className="hover:text-accent transition-colors">Especies</Link></li>
                <li><Link href="/guias" className="hover:text-accent transition-colors">Guías</Link></li>
                <li><Link href="/advice" className="hover:text-accent transition-colors">Asesor de pesca</Link></li>
              </ul>
              <p className="text-xs text-paper/60 leading-relaxed mt-4">
                Algunos enlaces son de afiliados: podemos recibir una pequeña comisión por
                las compras, sin ningún coste adicional para ti.
              </p>
            </div>
          </div>

          <div className="mt-12 pt-6 border-t border-paper/20 flex flex-col md:flex-row justify-between items-center gap-3 font-mono text-[11px] uppercase tracking-widest text-paper/50">
            <p>&copy; {currentYear} PescaPlus</p>
            <div className="flex flex-wrap justify-center gap-x-6 gap-y-2">
              <Link href="/aviso-legal" className="hover:text-accent transition-colors">Aviso legal</Link>
              <Link href="/privacidad" className="hover:text-accent transition-colors">Privacidad</Link>
              <Link href="/cookies" className="hover:text-accent transition-colors">Cookies</Link>
              <Link href="/admin" className="hover:text-accent transition-colors">Admin</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
