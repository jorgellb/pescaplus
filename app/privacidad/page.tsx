import type { Metadata } from 'next'
import Link from 'next/link'
import LegalArticle from '@/components/LegalArticle'

export const metadata: Metadata = {
  title: 'Política de privacidad',
  description: 'Cómo trata PescaPlus tus datos personales conforme al RGPD y la LOPDGDD.',
  alternates: { canonical: '/privacidad' },
  robots: { index: true, follow: true },
}

export default function PrivacidadPage() {
  return (
    <LegalArticle title="Política de privacidad" updated="julio de 2026">
      <p>
        En PescaPlus respetamos tu privacidad y tratamos tus datos conforme al Reglamento (UE) 2016/679 (RGPD) y la Ley
        Orgánica 3/2018 (LOPDGDD).
      </p>

      <h2>1. Responsable del tratamiento</h2>
      <p>
        <strong>[Nombre y apellidos / razón social del titular]</strong>, NIF <strong>[NIF/DNI]</strong>. Puedes
        contactar a través de nuestro <Link href="/contacto">formulario de contacto</Link>.
      </p>

      <h2>2. Qué datos recogemos y con qué finalidad</h2>
      <ul>
        <li>
          <strong>Formulario de contacto:</strong> nombre, correo electrónico y el contenido de tu mensaje, con la única
          finalidad de atender y responder tu consulta.
        </li>
        <li>
          <strong>Datos de navegación:</strong> podemos tratar datos técnicos mínimos (como la dirección IP) para
          garantizar la seguridad del sitio y prevenir abusos.
        </li>
      </ul>

      <h2>3. Base legal</h2>
      <p>
        El tratamiento de los datos del formulario se basa en tu <strong>consentimiento</strong> al enviarlo. El
        tratamiento de datos técnicos de seguridad se basa en nuestro <strong>interés legítimo</strong> en proteger el
        servicio.
      </p>

      <h2>4. Conservación</h2>
      <p>
        Conservamos los mensajes de contacto durante el tiempo necesario para atender tu consulta y, después, el plazo
        legalmente exigible. Los datos técnicos de seguridad se conservan durante periodos breves.
      </p>

      <h2>5. Destinatarios</h2>
      <p>
        No cedemos tus datos a terceros salvo obligación legal. Los proveedores tecnológicos que hacen posible el sitio
        (alojamiento) actúan como encargados del tratamiento con las debidas garantías.
      </p>

      <h2>6. Compras en tiendas de terceros</h2>
      <p>
        Al pulsar un enlace de compra, accedes a la web del vendedor, que tratará tus datos conforme a su propia política
        de privacidad. PescaPlus no recibe los datos de tu compra.
      </p>

      <h2>7. Tus derechos</h2>
      <p>
        Puedes ejercer tus derechos de acceso, rectificación, supresión, oposición, limitación y portabilidad
        escribiéndonos desde el <Link href="/contacto">formulario de contacto</Link>. También puedes reclamar ante la
        Agencia Española de Protección de Datos (<a href="https://www.aepd.es" target="_blank" rel="noopener noreferrer">aepd.es</a>).
      </p>

      <p className="text-sm text-ink/50">
        Consulta también nuestra <Link href="/cookies">Política de cookies</Link> y el{' '}
        <Link href="/aviso-legal">Aviso legal</Link>.
      </p>
    </LegalArticle>
  )
}
