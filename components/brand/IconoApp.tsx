import Boya from './Boya'
import { MARCA } from '@/lib/marca'

/**
 * El icono de la app y del navegador: la boya sobre el azul del fondo. Lo usan
 * app/icon.tsx, app/apple-icon.tsx y los PNG del manifiesto (192 y 512), que
 * genera next/og: estilos en línea y tamaños en px, porque no lee CSS.
 *
 * La boya ocupa el 70 %: cabe en la zona segura de un icono «maskable», que
 * Android recorta en círculo dejando el 80 % central.
 */
export default function IconoApp({ lado }: { lado: number }) {
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: MARCA.fondo,
      }}
    >
      <Boya variante="oscuro" compacta tamano={Math.round(lado * 0.7)} />
    </div>
  )
}
