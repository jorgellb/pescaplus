import type { Metadata } from 'next'
import Link from 'next/link'
import LegalArticle from '@/components/LegalArticle'

export const metadata: Metadata = {
  title: 'Aviso legal',
  description: 'Aviso legal y condiciones de uso de PescaPlus.',
  alternates: { canonical: '/aviso-legal' },
  robots: { index: true, follow: true },
}

export default function AvisoLegalPage() {
  return (
    <LegalArticle title="Aviso legal" updated="julio de 2026">
      <h2>1. Titular del sitio web</h2>
      <p>
        En cumplimiento de la Ley 34/2002 de Servicios de la Sociedad de la Información y de Comercio Electrónico
        (LSSI-CE), se informa de que este sitio web (en adelante, «PescaPlus») es titularidad de{' '}
        <strong>[Nombre y apellidos / razón social del titular]</strong>, con NIF{' '}
        <strong>[NIF/DNI]</strong> y domicilio en <strong>[dirección]</strong>. Puedes contactar a través de nuestro{' '}
        <Link href="/contacto">formulario de contacto</Link>.
      </p>

      <h2>2. Objeto</h2>
      <p>
        PescaPlus es un sitio de contenidos y recomendaciones sobre material de pesca. Facilitamos fichas, guías y un
        asesor orientativo, e incluimos enlaces a tiendas de terceros donde se puede adquirir el producto.
      </p>

      <h2>3. Enlaces de afiliados</h2>
      <p>
        Algunos enlaces de este sitio son de afiliados: si compras a través de ellos, PescaPlus puede percibir una
        comisión sin ningún coste adicional para ti. <strong>La compra, el pago, el envío y las devoluciones se realizan
        directamente en la tienda del vendedor</strong>, sujetos a sus propias condiciones. PescaPlus no vende ni envía
        productos directamente y no interviene en la relación contractual entre el usuario y el vendedor final.
      </p>

      <h2>4. Precios y disponibilidad</h2>
      <p>
        Los precios y la disponibilidad mostrados son <strong>orientativos</strong> y proceden de tiendas de terceros,
        por lo que pueden variar en cualquier momento. El precio válido es siempre el que figure en la tienda del
        vendedor en el momento de la compra.
      </p>

      <h2>5. Propiedad intelectual</h2>
      <p>
        Los textos, el diseño y demás contenidos elaborados por PescaPlus están protegidos por los derechos de propiedad
        intelectual. Las marcas e imágenes de producto pertenecen a sus respectivos titulares.
      </p>

      <h2>6. Responsabilidad</h2>
      <p>
        La información publicada tiene carácter orientativo y no constituye asesoramiento profesional. PescaPlus no se
        responsabiliza de los daños derivados del uso de productos de terceros ni del contenido de sitios enlazados.
      </p>

      <h2>7. Legislación aplicable</h2>
      <p>
        Estas condiciones se rigen por la legislación española. Para cualquier controversia, las partes se someten a los
        juzgados y tribunales que correspondan conforme a derecho.
      </p>

      <p className="text-sm text-ink/50">
        Consulta también nuestra <Link href="/privacidad">Política de privacidad</Link> y la{' '}
        <Link href="/cookies">Política de cookies</Link>.
      </p>
    </LegalArticle>
  )
}
