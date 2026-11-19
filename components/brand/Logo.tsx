import Boya, { type VarianteBoya } from './Boya'

/**
 * Boya + «PescaPlus». El nombre es texto de verdad (se lee, se copia y lo
 * entienden los buscadores); la boya, el SVG de la marca. Quien lo envuelva en
 * un enlace le pone la clase `logo` para que la boya cabecee al pasar por
 * encima (ver .logo-boya en globals.css).
 */
export default function Logo({ variante = 'claro', className = '' }: { variante?: VarianteBoya; className?: string }) {
  const oscuro = variante === 'oscuro'
  return (
    <span className={`inline-flex items-center gap-1.5 ${className}`}>
      <Boya variante={variante} className="w-9 h-9 -my-1 shrink-0" claseBoya="logo-boya" />
      <span className={`font-display text-[1.6rem] leading-none ${oscuro ? 'text-paper' : 'text-ink'}`}>
        Pesca<span className={oscuro ? 'text-accent-light' : 'text-accent'}>Plus</span>
      </span>
    </span>
  )
}
