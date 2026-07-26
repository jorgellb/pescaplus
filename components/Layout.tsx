import Link from 'next/link'
import Navbar from './Navbar'
import ChatWidget from './ChatWidget'
import { NAV_SECTIONS } from '@/lib/nav'

interface LayoutProps {
  children: React.ReactNode
}

export default function Layout({ children }: LayoutProps) {
  const currentYear = new Date().getFullYear()

  return (
    <div className="min-h-screen bg-surface text-ink flex flex-col">
      <a href="#contenido" className="skip-link">Saltar al contenido</a>
      <Navbar />

      <main id="contenido" className="flex-1 w-full">{children}</main>

      <div className="print:hidden"><ChatWidget /></div>

      {/* Footer — mirrors the header's service map, so both stay in step and
          every section gets a second crawlable link with descriptive text. */}
      <footer className="bg-paper border-t border-ink/[0.07] mt-20 print:hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
            <div className="lg:col-span-3 space-y-4">
              <Link href="/" className="inline-flex items-center gap-2">
                <span className="text-2xl">🎣</span>
                <span className="font-display text-2xl tracking-tight text-ink">Pesca<span className="text-accent">Plus</span></span>
              </Link>
              <p className="text-sm text-ink/60 max-w-sm leading-relaxed">
                Todo para el pescador en España: tienda de aparejos, previsión de mejores horas
                y mareas, mapa de zonas y especies, y salidas de pesca con patrón profesional
                o con otros pescadores.
              </p>
            </div>

            {/* Las cinco secciones, en su propia rejilla para que quepan en una fila. */}
            <div className="lg:col-span-9 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-8">
              {NAV_SECTIONS.map((s) => (
                <div key={s.id}>
                  <h4 className="text-[12px] font-bold uppercase tracking-wider text-ink/60 mb-3">{s.label}</h4>
                  <ul className="space-y-2 text-sm">
                    {s.links.slice(0, 5).map((l) => (
                      <li key={l.href + l.label}>
                        <Link href={l.href} className="text-ink/70 hover:text-accent transition-colors">{l.label}</Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>

          <p className="text-xs text-ink/60 leading-relaxed mt-10 max-w-2xl">
            Algunos enlaces de la tienda son de afiliados: podemos recibir una pequeña comisión
            por las compras, sin ningún coste adicional para ti.
          </p>

          <div className="mt-8 pt-6 border-t border-ink/[0.07] flex flex-col md:flex-row justify-between items-center gap-3 text-[13px] text-ink/60">
            <p>&copy; {currentYear} PescaPlus</p>
            <div className="flex flex-wrap justify-center gap-x-6 gap-y-2">
              <Link href="/aviso-legal" className="hover:text-accent transition-colors">Aviso legal</Link>
              <Link href="/privacidad" className="hover:text-accent transition-colors">Privacidad</Link>
              <Link href="/cookies" className="hover:text-accent transition-colors">Cookies</Link>
              <Link href="/contacto" className="hover:text-accent transition-colors">Contacto</Link>
              <Link href="/admin" className="hover:text-accent transition-colors">Admin</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
