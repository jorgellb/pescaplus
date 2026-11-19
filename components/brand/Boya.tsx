import { MARCA } from '@/lib/marca'

/**
 * La marca: un flotador de pesca sobre sus ondas, con un «+» en el cuerpo.
 *
 * Mitad de arriba en el magenta con que la carta náutica marca luces y
 * balizas, mitad de abajo en el azul del fondo; las ondas en el color de la
 * marea. Es SVG plano con colores explícitos, sin clases para el color, para
 * que el mismo dibujo sirva en la web y en las imágenes que genera next/og
 * (favicon, iconos de la app, imágenes para redes), que no leen CSS.
 */

export type VarianteBoya = 'claro' | 'oscuro'

const COLORES: Record<VarianteBoya, { base: string; antena: string; onda: string; banda: string }> = {
  // Sobre papel o lienzo claros.
  claro: { base: MARCA.fondo, antena: MARCA.fondo, onda: MARCA.marea, banda: MARCA.papel },
  // Sobre --deep: la mitad de abajo y la antena pasan a espuma para no perderse.
  oscuro: { base: MARCA.espuma, antena: MARCA.espuma, onda: MARCA.mareaClara, banda: MARCA.fondo },
}

/** La silueta del flotador, partida en la línea de la banda (y = 25). */
export const BOYA_ARRIBA = 'M15.5 25C15.5 18.6 18.6 11 24 11s8.5 7.6 8.5 14Z'
export const BOYA_ABAJO = 'M15.5 25c0 6.3 3.9 11 8.5 11s8.5-4.7 8.5-11Z'

interface BoyaProps {
  variante?: VarianteBoya
  className?: string
  /** Sin las ondas exteriores: para tamaños de favicon, donde no se leen. */
  compacta?: boolean
  /** Clase para la boya sola (sin ondas), para animarla aparte. */
  claseBoya?: string
  /** Clase para el aro exterior de ondas. */
  claseOnda?: string
  /** Ancho y alto en px: next/og (satori) los necesita, no lee clases. */
  tamano?: number
}

export default function Boya({ variante = 'claro', className, compacta = false, claseBoya, claseOnda, tamano }: BoyaProps) {
  const c = COLORES[variante]
  return (
    <svg viewBox="0 0 48 48" width={tamano} height={tamano} className={className} aria-hidden="true" focusable="false">
      {!compacta && (
        <ellipse className={claseOnda} cx="24" cy="36.5" rx="20" ry="5.6" fill="none" stroke={c.onda} strokeWidth="2" opacity="0.45" />
      )}
      <ellipse cx="24" cy="36.5" rx={compacta ? 15 : 12.5} ry={compacta ? 4.4 : 3.5} fill="none" stroke={c.onda} strokeWidth="2.4" />
      <g className={claseBoya}>
        <path d="M24 11V4.6" stroke={c.antena} strokeWidth="2.2" strokeLinecap="round" />
        <circle cx="24" cy="3.6" r="2" fill={MARCA.carta} />
        <path d={BOYA_ARRIBA} fill={MARCA.carta} />
        <path d={BOYA_ABAJO} fill={c.base} />
        <path d="M15.6 25h16.8" stroke={c.banda} strokeWidth="1.8" />
        {/*
          * El «+» de Plus va en el cuerpo, no en la antena: un travesaño en lo
          * alto de una vara se lee como una cruz.
          */}
        <path d="M24 15.4v6.4M20.8 18.6h6.4" stroke={MARCA.papel} strokeWidth="2.1" strokeLinecap="round" />
      </g>
    </svg>
  )
}
