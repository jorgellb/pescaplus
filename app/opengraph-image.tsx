import { ImageResponse } from 'next/og'
import Boya from '@/components/brand/Boya'
import { MARCA } from '@/lib/marca'
import { FISHING_SPOTS } from '@/lib/fishing-spots'
import { FISHING_TYPES } from '@/lib/fishing'

export const alt = 'PescaPlus — Tienda de pesca, mejores horas y salidas de pesca'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'
/**
 * Cacheada un día. Generar una imagen OG es renderizar con satori, que es de
 * lo más caro en CPU de todo el sitio.
 */
export const revalidate = 86400

/** Tres isóbatas, como en la portada (components/graphics/Isobatas.tsx). */
const LINEAS = [
  'M0 470C200 430 330 520 560 480S930 400 1200 450',
  'M0 540C220 500 360 590 600 550S960 470 1200 520',
  'M0 610C240 570 390 650 640 615S990 545 1200 590',
]

/**
 * La imagen que se ve al compartir el sitio: la carta en azul de fondo y la
 * boya. Solo cifras que se mantienen solas (puntos de pesca y categorías): la
 * anterior decía «66 productos» cuando ya eran más de 600.
 */
export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          background: MARCA.fondo,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: 64,
          position: 'relative',
          fontFamily: 'sans-serif',
        }}
      >
        <svg width="1200" height="630" viewBox="0 0 1200 630" style={{ position: 'absolute', left: 0, top: 0 }}>
          {LINEAS.map((d, i) => (
            <path key={d} d={d} fill="none" stroke={MARCA.espuma} strokeOpacity={0.18 + i * 0.06} strokeWidth="2" />
          ))}
        </svg>

        <div style={{ display: 'flex', alignItems: 'center', gap: 14, fontSize: 26, color: MARCA.espuma, letterSpacing: 4, textTransform: 'uppercase' }}>
          <div style={{ width: 14, height: 14, borderRadius: 7, background: MARCA.boya }} />
          {FISHING_SPOTS.length} puntos de la costa · previsión de hoy
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ fontSize: 150, fontWeight: 800, color: MARCA.papel, lineHeight: 1, letterSpacing: -5, display: 'flex' }}>
              Pesca<span style={{ color: MARCA.mareaClara }}>Plus</span>
            </div>
            <div style={{ fontSize: 40, color: MARCA.espuma, marginTop: 22, maxWidth: 760, lineHeight: 1.25 }}>
              Tienda de pesca, mejores horas, el mapa de dónde pica hoy y salidas con patrón
            </div>
          </div>
          <Boya variante="oscuro" tamano={300} />
        </div>

        <div style={{ display: 'flex', fontSize: 28, fontWeight: 700, color: MARCA.boya }}>
          {FISHING_TYPES.length} categorías de aparejos · pescaplus.es
        </div>
      </div>
    ),
    { ...size },
  )
}
