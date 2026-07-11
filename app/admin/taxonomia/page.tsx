'use client'

import { useEffect, useState } from 'react'

interface Sub {
  id: string
  name: string
}
interface Cat {
  id: string
  name: string
  subcategories: Sub[]
}

const field =
  'w-full px-3 py-2 bg-white border border-ink/25 rounded-lg text-ink placeholder-ink/40 focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 text-sm transition-all'

export default function TaxonomyAdminPage() {
  const [cats, setCats] = useState<Cat[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [note, setNote] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('/api/admin/taxonomy')
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setCats(d.taxonomy)
        else setError(d.error || 'No se pudo cargar')
      })
      .catch(() => setError('Error de red al cargar'))
      .finally(() => setLoading(false))
  }, [])

  const setCatName = (id: string, name: string) =>
    setCats((cs) => cs.map((c) => (c.id === id ? { ...c, name } : c)))

  const setSub = (cid: string, i: number, name: string) =>
    setCats((cs) =>
      cs.map((c) =>
        c.id === cid ? { ...c, subcategories: c.subcategories.map((s, idx) => (idx === i ? { ...s, name } : s)) } : c,
      ),
    )

  const addSub = (cid: string) =>
    setCats((cs) => cs.map((c) => (c.id === cid ? { ...c, subcategories: [...c.subcategories, { id: '', name: '' }] } : c)))

  const removeSub = (cid: string, i: number) =>
    setCats((cs) =>
      cs.map((c) => (c.id === cid ? { ...c, subcategories: c.subcategories.filter((_, idx) => idx !== i) } : c)),
    )

  const moveSub = (cid: string, i: number, dir: -1 | 1) =>
    setCats((cs) =>
      cs.map((c) => {
        if (c.id !== cid) return c
        const arr = [...c.subcategories]
        const j = i + dir
        if (j < 0 || j >= arr.length) return c
        ;[arr[i], arr[j]] = [arr[j], arr[i]]
        return { ...c, subcategories: arr }
      }),
    )

  const save = async () => {
    setSaving(true)
    setNote('')
    setError('')
    const names: Record<string, string> = {}
    const subs: Record<string, Sub[]> = {}
    for (const c of cats) {
      names[c.id] = c.name.trim()
      subs[c.id] = c.subcategories.map((s) => ({ id: s.id, name: s.name.trim() })).filter((s) => s.name)
    }
    try {
      const res = await fetch('/api/admin/taxonomy', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ names, subs }),
      })
      const data = await res.json()
      if (data.success) {
        setCats(data.taxonomy)
        setNote('✓ Taxonomía guardada. Las páginas se actualizan en breve.')
      } else setError(data.error || 'No se pudo guardar')
    } catch {
      setError('Error de red al guardar')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <p className="text-sm text-ink/50">Cargando taxonomía…</p>

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-extrabold text-ink">Taxonomía</h1>
          <p className="text-sm text-ink/60 mt-1 max-w-2xl">
            Renombra las categorías y gestiona sus subcategorías (crear, renombrar, reordenar, borrar). Las 11 categorías
            principales son fijas (por sus iconos y URLs); aquí solo cambias su <strong>nombre visible</strong>.
          </p>
        </div>
        <button
          onClick={save}
          disabled={saving}
          className="bg-ink hover:bg-accent text-white font-bold text-sm px-5 py-2.5 rounded-lg active:scale-[0.98] transition-all disabled:opacity-40"
        >
          {saving ? 'Guardando…' : 'Guardar cambios'}
        </button>
      </div>

      {note && <p className="text-xs text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">{note}</p>}
      {error && <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {cats.map((c) => (
          <div key={c.id} className="rounded-xl border border-ink/15 bg-white p-4 space-y-3">
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-widest text-ink/40">
                Categoría · <span className="font-mono">{c.id}</span>
              </label>
              <input value={c.name} onChange={(e) => setCatName(c.id, e.target.value)} className={`${field} font-bold`} />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-widest text-ink/40">Subcategorías</span>
                <button onClick={() => addSub(c.id)} className="text-xs font-bold text-accent hover:underline">+ Añadir</button>
              </div>
              {c.subcategories.length === 0 && <p className="text-xs text-ink/40">Sin subcategorías.</p>}
              {c.subcategories.map((s, i) => (
                <div key={i} className="flex items-center gap-1.5">
                  <input
                    value={s.name}
                    onChange={(e) => setSub(c.id, i, e.target.value)}
                    placeholder="Nombre de la subcategoría"
                    className={`${field} py-1.5 text-xs`}
                  />
                  <button onClick={() => moveSub(c.id, i, -1)} disabled={i === 0} className="w-6 h-7 flex-shrink-0 rounded bg-white border border-ink/15 text-ink/50 hover:text-ink disabled:opacity-30 text-xs">↑</button>
                  <button onClick={() => moveSub(c.id, i, 1)} disabled={i === c.subcategories.length - 1} className="w-6 h-7 flex-shrink-0 rounded bg-white border border-ink/15 text-ink/50 hover:text-ink disabled:opacity-30 text-xs">↓</button>
                  <button onClick={() => removeSub(c.id, i)} className="w-6 h-7 flex-shrink-0 rounded bg-white border border-red-200 text-red-500 hover:bg-red-50 text-xs">✕</button>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <p className="text-[11px] text-ink/40">
        Nota: al borrar una subcategoría, los productos que la tuvieran asignada quedan sin subcategoría (no se borran). Renombrar
        mantiene la asignación de los productos.
      </p>
    </div>
  )
}
