import Link from 'next/link'
import { FICHAS } from '@/lib/knots'
import { COMPLEMENTOS, TECNICAS, TODAS_LAS_ESPECIES } from '@/lib/enlazado'
import { normalizar } from '@/lib/seo-producto'
import { tituloDeRanking } from '@/lib/roundups'

/**
 * El mapa de una categoría: todo lo que el sitio tiene sobre ella, enlazado.
 *
 * Las páginas de categoría eran una rejilla de productos y nada más. Este
 * bloque las convierte en el centro de su tema: el ranking de la categoría, las
 * especies cuya ficha pide ese material, los nudos que se usan con él, lo que se
 * monta con él y las guías que hablan de él. Es la otra mitad del enlazado de
 * las fichas de producto (lib/enlazado.ts), que enlazan hacia aquí.
 */

const MAX_ESPECIES = 14

export interface ExploraCategoriaProps {
  categoria: string
  nombre: string
  /** Nombre visible de cada categoría (puede estar renombrada en el admin). */
  nombres: Record<string, string>
  /** Tipos de la categoría con productos, y cuántos tiene cada uno. */
  subcategorias: { id: string; name: string; count: number }[]
  /** La subcategoría que se está viendo, para no enlazarla a sí misma. */
  actual?: string
  hayRanking: boolean
  guias: { id: string; title: string }[]
  /** Técnica del tipo (lib/enlazado.ts): las especies se acotan a las que se pescan con ella. */
  tecnica?: string
}

const tarjeta = 'border border-ink/[0.07] rounded-xl bg-paper p-4 space-y-3'
const etiqueta = 'font-mono text-[11px] font-bold uppercase tracking-widest text-ink/60'
const chip =
  'inline-flex items-center gap-1.5 px-3 py-1 text-xs font-bold text-ink border border-ink/10 rounded-full hover:bg-ink hover:text-paper transition-colors'

export default function ExploraCategoria({ categoria, nombre, nombres, subcategorias, actual, hayRanking, guias, tecnica }: ExploraCategoriaProps) {
  // Primero las especies que ponen esta categoría en cabeza de su ficha.
  const quePiden = TODAS_LAS_ESPECIES
    .filter((sp) => sp.gearCats.includes(categoria))
    .sort((a, b) => a.gearCats.indexOf(categoria) - b.gearCats.indexOf(categoria))
  // En un tipo con técnica («Cañas de spinning»), solo las que se pescan con ella.
  const t = TECNICAS.find((x) => x.id === tecnica)
  const porTecnica = t ? quePiden.filter((sp) => t.enEspecie.test(normalizar(sp.technique))) : []
  const especies = porTecnica.length ? porTecnica : quePiden
  const tituloEspecies = porTecnica.length && t ? `Especies que se pescan a ${t.nombre}` : 'Especies que lo piden en su ficha'
  const nudos = FICHAS.filter((f) => f.gearCats.includes(categoria))
  const conQueSeMonta = COMPLEMENTOS[categoria] ?? []
  const tipos = subcategorias.filter((s) => s.id !== actual && s.count > 0)

  return (
    <section aria-labelledby="explora-categoria" className="space-y-5">
      <h2 id="explora-categoria" className="font-display uppercase text-2xl md:text-3xl leading-none border-b border-ink/[0.07] pb-3">
        Explora {nombre.toLowerCase()}
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {hayRanking && (
          <Link href={`/mejores/${categoria}`} className={`${tarjeta} group block hover:border-accent/40 transition-colors`}>
            <span className={etiqueta}>Ranking</span>
            <span className="block text-base font-bold text-ink group-hover:text-accent leading-snug">{tituloDeRanking(categoria)}</span>
            <span className="block text-[13px] text-ink/60">Los más elegidos, con guía de compra y preguntas frecuentes →</span>
          </Link>
        )}

        {tipos.length > 0 && (
          <div className={tarjeta}>
            <p className={etiqueta}>{actual ? 'Otros tipos' : 'Por tipo'}</p>
            <div className="flex flex-wrap gap-2">
              {actual && (
                <Link href={`/categories/${categoria}`} className={chip}>
                  Todo en {nombre}
                </Link>
              )}
              {tipos.map((s) => (
                <Link key={s.id} href={`/categories/${categoria}/${s.id}`} className={chip}>
                  {s.name} <span className="text-ink/60 font-mono">{s.count}</span>
                </Link>
              ))}
            </div>
          </div>
        )}

        {conQueSeMonta.length > 0 && (
          <div className={tarjeta}>
            <p className={etiqueta}>Se monta con</p>
            <div className="flex flex-wrap gap-2">
              {conQueSeMonta.map((c) => (
                <Link key={c} href={`/categories/${c}`} className={chip}>
                  {nombres[c] ?? c}
                </Link>
              ))}
            </div>
          </div>
        )}

        {especies.length > 0 && (
          <div className={`${tarjeta} md:col-span-2`}>
            <p className={etiqueta}>{tituloEspecies}</p>
            <div className="flex flex-wrap gap-2">
              {especies.slice(0, MAX_ESPECIES).map((sp) => (
                <Link key={sp.id} href={`/especies/${sp.id}`} className={chip}>
                  <span aria-hidden>{sp.emoji}</span> {sp.name}
                </Link>
              ))}
              {especies.length > MAX_ESPECIES && (
                <Link href="/especies" className="inline-flex items-center px-2 py-1 text-xs font-semibold text-accent hover:underline">
                  y {especies.length - MAX_ESPECIES} más →
                </Link>
              )}
            </div>
          </div>
        )}

        {nudos.length > 0 && (
          <div className={tarjeta}>
            <p className={etiqueta}>Nudos y montajes</p>
            <ul className="space-y-1.5">
              {nudos.map((n) => (
                <li key={n.id}>
                  <Link href={`/nudos/${n.id}`} className="text-sm font-semibold text-ink hover:text-accent">
                    {n.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}

        {guias.length > 0 && (
          <div className={tarjeta}>
            <p className={etiqueta}>Guías</p>
            <ul className="space-y-1.5">
              {guias.map((g) => (
                <li key={g.id}>
                  <Link href={`/guias/${g.id}`} className="text-sm font-semibold text-ink hover:text-accent">
                    {g.title}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </section>
  )
}
