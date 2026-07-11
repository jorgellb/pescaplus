'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { FISHING_TYPES } from '@/lib/fishing'
import CategoryIcon from '@/components/graphics/CategoryIcon'

export default function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [catOpen, setCatOpen] = useState(false)
  const pathname = usePathname()
  const catRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (catRef.current && !catRef.current.contains(e.target as Node)) setCatOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  const isActive = (href: string) => pathname === href
  const navLink = (active: boolean) =>
    `px-3 py-2 text-sm font-bold uppercase tracking-wide transition-colors ${
      active ? 'text-accent' : 'text-ink hover:text-accent'
    }`

  return (
    <nav className="sticky top-0 z-50 w-full bg-paper border-b-2 border-ink">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center gap-8">
            <Link href="/" className="flex items-center gap-2 group">
              <span className="text-2xl">🎣</span>
              <span className="font-display text-3xl uppercase leading-none tracking-tight text-ink group-hover:text-accent transition-colors">
                Pesca<span className="text-accent group-hover:text-ink">Plus</span>
              </span>
            </Link>

            <div className="hidden md:flex items-center gap-1">
              <div className="relative" ref={catRef}>
                <button
                  onClick={() => setCatOpen((v) => !v)}
                  className={`flex items-center gap-1.5 ${navLink(pathname.startsWith('/categories'))}`}
                  aria-expanded={catOpen}
                >
                  Categorías
                  <svg className={`w-4 h-4 transition-transform ${catOpen ? 'rotate-180' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="m6 9 6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>

                {catOpen && (
                  <div className="absolute left-0 mt-2 w-[30rem] p-2 grid grid-cols-2 gap-0.5 bg-paper border-2 border-ink shadow-hard-md">
                    {FISHING_TYPES.map((type) => (
                      <Link
                        key={type.id}
                        href={`/categories/${type.id}`}
                        onClick={() => setCatOpen(false)}
                        className={`flex items-center gap-3 px-3 py-2.5 transition-colors ${
                          isActive(`/categories/${type.id}`)
                            ? 'bg-accent text-paper'
                            : 'text-ink hover:bg-ink hover:text-paper'
                        }`}
                      >
                        <CategoryIcon id={type.id} className="w-5 h-5 flex-shrink-0" strokeWidth={1.8} />
                        <span className="text-sm font-bold uppercase tracking-tight truncate">{type.name}</span>
                      </Link>
                    ))}
                  </div>
                )}
              </div>

              <Link href="/mejores" className={navLink(pathname.startsWith('/mejores'))}>Mejores</Link>
              <Link href="/guias" className={navLink(pathname.startsWith('/guias'))}>Guías</Link>
              <Link href="/advice" className={navLink(isActive('/advice'))}>Consejos IA</Link>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-3">
            <form action="/search" method="get" className="relative">
              <input
                type="text"
                name="q"
                placeholder="Buscar…"
                aria-label="Buscar productos"
                className="w-36 lg:w-52 pl-8 pr-3 py-2 bg-paper border-2 border-ink text-ink placeholder-ink/40 text-sm focus:outline-none focus:border-accent transition-colors"
              />
              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-ink/50 text-sm pointer-events-none">🔍</span>
            </form>
            <Link
              href="/advice"
              className="inline-flex items-center gap-1.5 bg-ink text-paper px-4 py-2.5 text-sm font-bold uppercase tracking-wide border-2 border-ink shadow-hard hover-shift hover:bg-accent hover:border-accent whitespace-nowrap"
            >
              🤖 IA
            </Link>
          </div>

          <div className="flex items-center md:hidden">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              type="button"
              className="inline-flex items-center justify-center p-2 border-2 border-ink text-ink"
              aria-expanded={mobileMenuOpen}
            >
              <span className="sr-only">Abrir menú</span>
              {mobileMenuOpen ? (
                <svg className="block h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              ) : (
                <svg className="block h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" /></svg>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      <div className={`md:hidden ${mobileMenuOpen ? 'block' : 'hidden'} border-t-2 border-ink bg-paper max-h-[70vh] overflow-y-auto`}>
        <div className="px-3 py-3">
          <form action="/search" method="get" className="flex gap-2 mb-4" onSubmit={() => setMobileMenuOpen(false)}>
            <input
              type="text"
              name="q"
              placeholder="Buscar productos…"
              aria-label="Buscar productos"
              className="flex-1 px-3 py-2.5 bg-paper border-2 border-ink text-ink placeholder-ink/40 text-sm focus:outline-none focus:border-accent"
            />
            <button className="bg-ink text-paper px-4 text-sm font-bold uppercase border-2 border-ink">🔍</button>
          </form>
          <p className="px-2 pb-1.5 font-mono text-[11px] font-bold uppercase tracking-widest text-ink/50">Categorías</p>
          <div className="grid grid-cols-2 gap-0.5">
            {FISHING_TYPES.map((type) => (
              <Link
                key={type.id}
                href={`/categories/${type.id}`}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-2.5 px-3 py-2.5 text-sm font-bold uppercase tracking-tight transition-colors ${
                  isActive(`/categories/${type.id}`) ? 'bg-accent text-paper' : 'text-ink hover:bg-ink hover:text-paper'
                }`}
              >
                <CategoryIcon id={type.id} className="w-5 h-5 flex-shrink-0" strokeWidth={1.8} />
                <span className="truncate">{type.name}</span>
              </Link>
            ))}
          </div>
          <div className="grid grid-cols-3 gap-2 pt-3">
            <Link href="/mejores" onClick={() => setMobileMenuOpen(false)} className="text-center px-3 py-2.5 text-sm font-bold uppercase border-2 border-ink text-ink">Mejores</Link>
            <Link href="/guias" onClick={() => setMobileMenuOpen(false)} className="text-center px-3 py-2.5 text-sm font-bold uppercase border-2 border-ink text-ink">Guías</Link>
            <Link href="/advice" onClick={() => setMobileMenuOpen(false)} className="text-center px-3 py-2.5 text-sm font-bold uppercase border-2 border-ink text-ink">Consejos</Link>
          </div>
          <div className="pt-3 pb-1">
            <Link href="/advice" onClick={() => setMobileMenuOpen(false)} className="w-full text-center flex justify-center items-center gap-2 bg-ink text-paper px-4 py-3 font-bold uppercase text-sm border-2 border-ink">
              🤖 Asistente IA
            </Link>
          </div>
        </div>
      </div>
    </nav>
  )
}
