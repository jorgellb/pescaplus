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
    `px-3 py-2 rounded-lg text-sm font-medium transition-all ${
      active ? 'text-sky-700 bg-sky-50' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
    }`

  return (
    <nav className="sticky top-0 z-50 w-full glass-panel border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link href="/" className="flex items-center gap-2">
              <span className="text-2xl">🎣</span>
              <span className="text-2xl font-extrabold tracking-tight text-slate-900">
                Pesca<span className="text-sky-600">Plus</span>
              </span>
            </Link>

            <div className="hidden md:flex ml-8 items-center gap-1">
              <div className="relative" ref={catRef}>
                <button
                  onClick={() => setCatOpen((v) => !v)}
                  className={`flex items-center gap-1.5 ${navLink(pathname.startsWith('/categories'))}`}
                  aria-expanded={catOpen}
                >
                  Categorías
                  <svg className={`w-4 h-4 transition-transform ${catOpen ? 'rotate-180' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="m6 9 6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>

                {catOpen && (
                  <div className="absolute left-0 mt-2 w-[30rem] p-2 grid grid-cols-2 gap-1 rounded-2xl border border-slate-200 bg-white shadow-xl shadow-slate-900/10">
                    {FISHING_TYPES.map((type) => (
                      <Link
                        key={type.id}
                        href={`/categories/${type.id}`}
                        onClick={() => setCatOpen(false)}
                        className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all ${
                          isActive(`/categories/${type.id}`)
                            ? 'bg-sky-50 text-sky-700'
                            : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                        }`}
                      >
                        <span className="text-sky-600 flex-shrink-0">
                          <CategoryIcon id={type.id} className="w-5 h-5" strokeWidth={1.6} />
                        </span>
                        <span className="text-sm font-medium truncate">{type.name}</span>
                      </Link>
                    ))}
                  </div>
                )}
              </div>

              <Link href="/advice" className={navLink(isActive('/advice'))}>
                Consejos IA
              </Link>
            </div>
          </div>

          <div className="hidden md:flex items-center">
            <Link
              href="/advice"
              className="inline-flex items-center gap-1.5 bg-sky-600 hover:bg-sky-700 text-white px-5 py-2 rounded-lg font-semibold text-sm shadow-sm shadow-sky-600/20 hover:shadow-md hover:shadow-sky-600/25 active:scale-[0.98] transition-all"
            >
              <span>🤖</span> Asistente IA
            </Link>
          </div>

          <div className="flex items-center md:hidden">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              type="button"
              className="inline-flex items-center justify-center p-2 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors"
              aria-expanded={mobileMenuOpen}
            >
              <span className="sr-only">Abrir menú</span>
              {mobileMenuOpen ? (
                <svg className="block h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="block h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      <div className={`md:hidden ${mobileMenuOpen ? 'block' : 'hidden'} border-t border-slate-200 bg-white max-h-[70vh] overflow-y-auto`}>
        <div className="px-3 pt-3 pb-3">
          <p className="px-2 pb-1.5 text-[11px] font-bold uppercase tracking-widest text-slate-400">Categorías</p>
          <div className="grid grid-cols-2 gap-1">
            {FISHING_TYPES.map((type) => (
              <Link
                key={type.id}
                href={`/categories/${type.id}`}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  isActive(`/categories/${type.id}`)
                    ? 'bg-sky-50 text-sky-700'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <span className="text-sky-600 flex-shrink-0">
                  <CategoryIcon id={type.id} className="w-5 h-5" strokeWidth={1.6} />
                </span>
                <span className="truncate">{type.name}</span>
              </Link>
            ))}
          </div>
          <div className="pt-4 pb-1">
            <Link
              href="/advice"
              onClick={() => setMobileMenuOpen(false)}
              className="w-full text-center flex justify-center items-center gap-2 bg-sky-600 text-white px-4 py-2.5 rounded-lg font-semibold text-sm"
            >
              <span>🤖</span> Asistente IA
            </Link>
          </div>
        </div>
      </div>
    </nav>
  )
}
