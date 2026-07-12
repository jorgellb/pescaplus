'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { FISHING_TYPES } from '@/lib/fishing'
import CategoryIcon from '@/components/graphics/CategoryIcon'
import { openAsesor } from '@/lib/asesor-bus'
import { getFavorites, onFavoritesChanged } from '@/lib/product-history'

export default function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [catOpen, setCatOpen] = useState(false)
  const [names, setNames] = useState<Record<string, string>>({})
  const [favCount, setFavCount] = useState(0)
  const pathname = usePathname()
  const catRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const update = () => setFavCount(getFavorites().length)
    update()
    return onFavoritesChanged(update)
  }, [])

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (catRef.current && !catRef.current.contains(e.target as Node)) setCatOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  // Reflect admin category renames in the nav.
  useEffect(() => {
    fetch('/api/taxonomy')
      .then((r) => r.json())
      .then((d) => {
        if (d.success && Array.isArray(d.taxonomy)) {
          setNames(Object.fromEntries(d.taxonomy.map((c: { id: string; name: string }) => [c.id, c.name])))
        }
      })
      .catch(() => {})
  }, [])

  const catName = (id: string, fallback: string) => names[id] ?? fallback

  const isActive = (href: string) => pathname === href
  const navLink = (active: boolean) =>
    `px-3 py-2 text-sm font-bold uppercase tracking-wide transition-colors ${
      active ? 'text-accent' : 'text-ink hover:text-accent'
    }`

  return (
    <nav className="sticky top-0 z-50 w-full bg-paper border-b border-ink/12">
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
                  <div className="absolute left-0 mt-2 w-[30rem] p-2 grid grid-cols-2 gap-0.5 bg-paper border border-ink/15 rounded-xl shadow-hard-md">
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
                        <span className="text-sm font-bold uppercase tracking-tight truncate">{catName(type.id, type.name)}</span>
                      </Link>
                    ))}
                  </div>
                )}
              </div>

              <Link href="/mejores" className={navLink(pathname.startsWith('/mejores'))}>Mejores</Link>
              <Link href="/guias" className={navLink(pathname.startsWith('/guias'))}>Guías</Link>
              <Link href="/advice" className={navLink(isActive('/advice'))}>Consejos</Link>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-3">
            <form action="/search" method="get" className="relative">
              <input
                type="text"
                name="q"
                placeholder="Buscar…"
                aria-label="Buscar productos"
                className="w-36 lg:w-52 pl-8 pr-3 py-2 bg-paper border border-ink/15 rounded-xl text-ink placeholder-ink/40 text-sm focus:outline-none focus:border-accent transition-colors"
              />
              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-ink/50 text-sm pointer-events-none">🔍</span>
            </form>
            <Link
              href="/favoritos"
              aria-label={`Favoritos${favCount > 0 ? ` (${favCount})` : ''}`}
              className="relative inline-flex items-center justify-center w-10 h-10 border border-ink/15 rounded-xl text-ink hover:bg-ink hover:text-paper transition-colors"
            >
              <svg viewBox="0 0 24 24" className="w-5 h-5" fill={favCount > 0 ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 1 0-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 0 0 0-7.78z" /></svg>
              {favCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 bg-accent text-paper text-[10px] font-bold rounded-full flex items-center justify-center">{favCount}</span>
              )}
            </Link>
            {/* Opens the floating chat widget; falls back to the full page if it isn't mounted. */}
            <Link
              href="/advice"
              onClick={(e) => { if (openAsesor()) e.preventDefault() }}
              className="inline-flex items-center gap-1.5 bg-ink text-paper px-4 py-2.5 text-sm font-bold uppercase tracking-wide border border-ink/15 rounded-xl shadow-hard hover-shift hover:bg-accent hover:border-accent whitespace-nowrap"
            >
              🎣 Asesor
            </Link>
          </div>

          <div className="flex items-center md:hidden">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              type="button"
              className="inline-flex items-center justify-center p-2 border border-ink/15 rounded-xl text-ink"
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
      <div className={`md:hidden ${mobileMenuOpen ? 'block' : 'hidden'} border-t border-ink/12 bg-paper max-h-[70vh] overflow-y-auto`}>
        <div className="px-3 py-3">
          <form action="/search" method="get" className="flex gap-2 mb-4" onSubmit={() => setMobileMenuOpen(false)}>
            <input
              type="text"
              name="q"
              placeholder="Buscar productos…"
              aria-label="Buscar productos"
              className="flex-1 px-3 py-2.5 bg-paper border border-ink/15 rounded-xl text-ink placeholder-ink/40 text-sm focus:outline-none focus:border-accent"
            />
            <button className="bg-ink text-paper px-4 text-sm font-bold uppercase border border-ink/15 rounded-xl">🔍</button>
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
                <span className="truncate">{catName(type.id, type.name)}</span>
              </Link>
            ))}
          </div>
          <div className="grid grid-cols-3 gap-2 pt-3">
            <Link href="/mejores" onClick={() => setMobileMenuOpen(false)} className="text-center px-3 py-2.5 text-sm font-bold uppercase border border-ink/15 rounded-xl text-ink">Mejores</Link>
            <Link href="/guias" onClick={() => setMobileMenuOpen(false)} className="text-center px-3 py-2.5 text-sm font-bold uppercase border border-ink/15 rounded-xl text-ink">Guías</Link>
            <Link href="/favoritos" onClick={() => setMobileMenuOpen(false)} className="text-center px-3 py-2.5 text-sm font-bold uppercase border border-ink/15 rounded-xl text-ink">
              Favoritos{favCount > 0 ? ` (${favCount})` : ''}
            </Link>
          </div>
          <div className="pt-3 pb-1">
            <Link
              href="/advice"
              onClick={(e) => { setMobileMenuOpen(false); if (openAsesor()) e.preventDefault() }}
              className="w-full text-center flex justify-center items-center gap-2 bg-ink text-paper px-4 py-3 font-bold uppercase text-sm border border-ink/15 rounded-xl"
            >
              🎣 Asesor de pesca
            </Link>
          </div>
        </div>
      </div>
    </nav>
  )
}
