'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import CategoryIcon from '@/components/graphics/CategoryIcon'
import { openAsesor } from '@/lib/asesor-bus'
import { getFavorites, onFavoritesChanged } from '@/lib/product-history'
import { NAV_SECTIONS, SHOP_SHORTCUTS, type NavSection } from '@/lib/nav'

/**
 * Header with a mega-menu covering every service, not just the shop. Panels
 * open on hover (pointer) and on click/keyboard, and every entry is a real
 * <Link> with descriptive anchor text so the menu doubles as internal linking.
 */
export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [mobileSection, setMobileSection] = useState<string | null>(null)
  const [openId, setOpenId] = useState<string | null>(null)
  const [names, setNames] = useState<Record<string, string>>({})
  const [favCount, setFavCount] = useState(0)
  const [account, setAccount] = useState<{ avatar: string; unread: number } | null>(null)
  const pathname = usePathname()
  const navRef = useRef<HTMLDivElement>(null)
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const update = () => setFavCount(getFavorites().length)
    update()
    return onFavoritesChanged(update)
  }, [])

  useEffect(() => {
    fetch('/api/auth/me')
      .then((r) => r.json())
      .then((d) => setAccount(d.user ? { avatar: d.user.avatar, unread: d.user.unread ?? 0 } : null))
      .catch(() => {})
  }, [pathname])

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

  // Close on outside click, on Escape, and whenever the route changes.
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (navRef.current && !navRef.current.contains(e.target as Node)) setOpenId(null)
    }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { setOpenId(null); setMobileOpen(false) } }
    document.addEventListener('mousedown', onClick)
    document.addEventListener('keydown', onKey)
    return () => { document.removeEventListener('mousedown', onClick); document.removeEventListener('keydown', onKey) }
  }, [])

  // Cerrar los menús al navegar. Se ajusta en render (patrón de React para
  // estado derivado de un cambio de prop) en vez de con un efecto.
  const [lastPath, setLastPath] = useState(pathname)
  if (pathname !== lastPath) {
    setLastPath(pathname)
    setOpenId(null)
    setMobileOpen(false)
    setMobileSection(null)
  }

  // Small grace period so the pointer can travel from the trigger to the panel.
  const scheduleClose = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current)
    closeTimer.current = setTimeout(() => setOpenId(null), 140)
  }
  const cancelClose = () => { if (closeTimer.current) clearTimeout(closeTimer.current) }

  const catName = (id: string, fallback: string) => names[id] ?? fallback
  const sectionActive = (s: NavSection) =>
    s.links.some((l) => pathname === l.href || pathname.startsWith(l.href + '/')) || pathname === s.href

  return (
    <header ref={navRef} className="sticky top-0 z-50 w-full bg-paper/95 backdrop-blur border-b border-ink/[0.07] print:hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-4 h-16">
          <Link href="/" className="flex items-center gap-2 shrink-0 group">
            <span className="text-2xl">🎣</span>
            <span className="font-display text-2xl tracking-tight text-ink group-hover:text-accent transition-colors">
              Pesca<span className="text-accent group-hover:text-ink transition-colors">Plus</span>
            </span>
          </Link>

          {/* Desktop sections */}
          <nav aria-label="Principal" className="hidden lg:flex items-center gap-0.5">
            {NAV_SECTIONS.map((s) => (
              <div key={s.id} onMouseEnter={() => { cancelClose(); setOpenId(s.id) }} onMouseLeave={scheduleClose}>
                <button
                  onClick={() => setOpenId((v) => (v === s.id ? null : s.id))}
                  aria-expanded={openId === s.id}
                  aria-haspopup="true"
                  className={`flex items-center gap-1 px-3 py-2 rounded-lg text-[15px] font-semibold transition-colors ${
                    openId === s.id || sectionActive(s) ? 'text-accent bg-accent/[0.07]' : 'text-ink/80 hover:text-ink hover:bg-ink/[0.04]'
                  }`}
                >
                  {s.label}
                  <svg className={`w-3.5 h-3.5 transition-transform ${openId === s.id ? 'rotate-180' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="m6 9 6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
              </div>
            ))}
          </nav>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <form action="/search" method="get" className="hidden md:block relative">
              <input
                type="text"
                name="q"
                placeholder="Buscar aparejos…"
                aria-label="Buscar productos"
                className="w-40 lg:w-56 pl-9 pr-3 py-2 bg-ink/[0.04] border border-transparent rounded-full text-ink placeholder-ink/45 text-sm focus:outline-none focus:bg-paper focus:border-accent/50 transition-colors"
              />
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-ink/40 text-sm pointer-events-none">🔍</span>
            </form>

            <Link href="/favoritos" aria-label={`Favoritos${favCount > 0 ? ` (${favCount})` : ''}`}
              className="relative hidden sm:inline-flex items-center justify-center w-9 h-9 rounded-full text-ink/70 hover:text-accent hover:bg-ink/[0.04] transition-colors">
              <svg viewBox="0 0 24 24" className="w-5 h-5" fill={favCount > 0 ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 1 0-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 0 0 0-7.78z" /></svg>
              {favCount > 0 && <span className="absolute -top-0.5 -right-0.5 min-w-[17px] h-[17px] px-1 bg-accent text-paper text-[10px] font-bold rounded-full flex items-center justify-center">{favCount}</span>}
            </Link>

            <Link href={account ? '/cuenta' : '/entrar'}
              aria-label={account ? `Mi cuenta${account.unread > 0 ? ` (${account.unread} sin leer)` : ''}` : 'Entrar'}
              className="relative inline-flex items-center justify-center w-9 h-9 rounded-full text-ink/70 hover:text-accent hover:bg-ink/[0.04] transition-colors">
              {account ? <span className="text-lg leading-none">{account.avatar}</span> : (
                <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
              )}
              {account && account.unread > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[17px] h-[17px] px-1 bg-red-500 text-paper text-[10px] font-bold rounded-full flex items-center justify-center">{account.unread}</span>
              )}
            </Link>

            <Link href="/advice" onClick={(e) => { if (openAsesor()) e.preventDefault() }}
              className="hidden sm:inline-flex items-center gap-1.5 bg-accent text-paper px-4 py-2 text-sm font-semibold rounded-full hover:brightness-110 transition-all whitespace-nowrap">
              Asesor
            </Link>

            <button onClick={() => setMobileOpen((v) => !v)} type="button" aria-expanded={mobileOpen}
              className="lg:hidden inline-flex items-center justify-center w-9 h-9 rounded-full text-ink hover:bg-ink/[0.05]">
              <span className="sr-only">Abrir menú</span>
              {mobileOpen ? (
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              ) : (
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" /></svg>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mega-menu panel */}
      {openId && (
        <div className="hidden lg:block absolute left-0 right-0 top-full bg-paper border-b border-ink/[0.07] shadow-hard-lg"
          onMouseEnter={cancelClose} onMouseLeave={scheduleClose}>
          {NAV_SECTIONS.filter((s) => s.id === openId).map((s) => (
            <div key={s.id} className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-7">
              <div className="flex items-baseline justify-between gap-4 mb-5">
                <div>
                  <p className="font-display text-xl text-ink">{s.label}</p>
                  <p className="text-sm text-ink/55 mt-0.5">{s.tagline}</p>
                </div>
                <Link href={s.href} className="text-sm font-semibold text-accent hover:underline shrink-0">Ver todo →</Link>
              </div>

              {s.variant === 'categories' ? (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-1">
                  {s.links.map((l) => {
                    const id = l.href.split('/').pop() ?? ''
                    return (
                      <Link key={l.href} href={l.href}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-ink/85 hover:text-accent hover:bg-accent/[0.06] transition-colors">
                        <CategoryIcon id={id} className="w-5 h-5 shrink-0 opacity-70" strokeWidth={1.6} />
                        <span className="text-[15px] font-medium truncate">{catName(id, l.label)}</span>
                      </Link>
                    )
                  })}
                  <div className="col-span-2 md:col-span-4 flex flex-wrap gap-2 pt-3 mt-2 border-t border-ink/[0.07]">
                    {SHOP_SHORTCUTS.map((l) => (
                      <Link key={l.href} href={l.href}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-ink/[0.04] text-sm font-medium text-ink/80 hover:bg-accent/10 hover:text-accent transition-colors">
                        <span>{l.emoji}</span>{l.label}
                      </Link>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-1">
                  {s.links.map((l) => (
                    <Link key={l.href + l.label} href={l.href}
                      className="group flex gap-3 p-3 rounded-xl hover:bg-accent/[0.06] transition-colors">
                      <span className="text-xl leading-none mt-0.5">{l.emoji}</span>
                      <span className="min-w-0">
                        <span className="block text-[15px] font-semibold text-ink group-hover:text-accent transition-colors">{l.label}</span>
                        {l.hint && <span className="block text-[13px] text-ink/55 leading-snug mt-0.5">{l.hint}</span>}
                      </span>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="lg:hidden border-t border-ink/[0.07] bg-paper max-h-[78vh] overflow-y-auto">
          <div className="px-4 py-4 space-y-3">
            <form action="/search" method="get" className="flex gap-2">
              <input type="text" name="q" placeholder="Buscar aparejos…" aria-label="Buscar productos"
                className="flex-1 px-4 py-2.5 bg-ink/[0.04] rounded-full text-ink placeholder-ink/45 text-sm focus:outline-none focus:bg-paper focus:ring-1 focus:ring-accent/50" />
              <button className="bg-accent text-paper px-4 rounded-full text-sm font-semibold">Buscar</button>
            </form>

            {NAV_SECTIONS.map((s) => {
              const open = mobileSection === s.id
              return (
                <div key={s.id} className="border-b border-ink/[0.07] pb-2 last:border-0">
                  <button onClick={() => setMobileSection(open ? null : s.id)} aria-expanded={open}
                    className="w-full flex items-center justify-between py-2.5 text-[15px] font-semibold text-ink">
                    {s.label}
                    <svg className={`w-4 h-4 text-ink/40 transition-transform ${open ? 'rotate-180' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m6 9 6 6 6-6" strokeLinecap="round" strokeLinejoin="round" /></svg>
                  </button>
                  {open && (
                    <div className={s.variant === 'categories' ? 'grid grid-cols-2 gap-0.5 pb-2' : 'space-y-0.5 pb-2'}>
                      {s.links.map((l) => {
                        const id = l.href.split('/').pop() ?? ''
                        return (
                          <Link key={l.href + l.label} href={l.href}
                            className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-[14px] text-ink/85 hover:bg-accent/[0.06] hover:text-accent transition-colors">
                            {s.variant === 'categories'
                              ? <CategoryIcon id={id} className="w-4 h-4 shrink-0 opacity-70" strokeWidth={1.6} />
                              : <span className="text-base leading-none">{l.emoji}</span>}
                            <span className="truncate font-medium">{s.variant === 'categories' ? catName(id, l.label) : l.label}</span>
                          </Link>
                        )
                      })}
                      <Link href={s.href} className="block px-3 py-2 text-[13px] font-semibold text-accent">Ver todo →</Link>
                    </div>
                  )}
                </div>
              )
            })}

            <div className="grid grid-cols-2 gap-2 pt-1">
              <Link href="/favoritos" className="text-center px-3 py-2.5 text-sm font-semibold rounded-full bg-ink/[0.04] text-ink">
                Favoritos{favCount > 0 ? ` (${favCount})` : ''}
              </Link>
              <Link href={account ? '/cuenta' : '/entrar'} className="text-center px-3 py-2.5 text-sm font-semibold rounded-full bg-ink/[0.04] text-ink">
                {account ? `${account.avatar} Mi cuenta` : 'Entrar'}
              </Link>
              <Link href="/advice" onClick={(e) => { if (openAsesor()) e.preventDefault() }}
                className="col-span-2 text-center px-4 py-3 bg-accent text-paper font-semibold text-sm rounded-full">
                🎣 Asesor de pesca
              </Link>
            </div>
          </div>
        </div>
      )}
    </header>
  )
}
