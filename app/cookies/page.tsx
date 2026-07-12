import type { Metadata } from 'next'
import Link from 'next/link'
import LegalArticle from '@/components/LegalArticle'

export const metadata: Metadata = {
  title: 'Política de cookies',
  description: 'Qué cookies y almacenamiento local utiliza PescaPlus y cómo gestionarlos.',
  alternates: { canonical: '/cookies' },
  robots: { index: true, follow: true },
}

export default function CookiesPage() {
  return (
    <LegalArticle title="Política de cookies" updated="julio de 2026">
      <p>
        Una cookie es un pequeño fichero que un sitio web guarda en tu navegador. En PescaPlus usamos el mínimo
        imprescindible para que el sitio funcione, y <strong>no utilizamos cookies de publicidad ni de seguimiento de
        terceros</strong>.
      </p>

      <h2>1. Cookies técnicas (necesarias)</h2>
      <p>
        Son las estrictamente necesarias para el funcionamiento del sitio y, según la normativa, no requieren
        consentimiento previo. En nuestro caso se limitan a la sesión del panel de administración (solo para el gestor
        del sitio).
      </p>

      <h2>2. Almacenamiento local (localStorage)</h2>
      <p>
        Para mejorar tu experiencia guardamos algunas preferencias directamente en tu navegador mediante
        <strong> localStorage</strong> (no son cookies y no se envían a ningún servidor): por ejemplo, el historial de tu
        conversación con el asesor de pesca y los productos que has visto recientemente. Puedes borrarlos vaciando los
        datos del sitio en tu navegador.
      </p>

      <h2>3. Cómo gestionarlas</h2>
      <p>
        Puedes bloquear o eliminar las cookies y el almacenamiento local desde la configuración de tu navegador
        (Chrome, Firefox, Safari, Edge…). Ten en cuenta que desactivar las cookies técnicas puede afectar al
        funcionamiento de algunas partes del sitio.
      </p>

      <h2>4. Cambios</h2>
      <p>
        Si en el futuro incorporamos herramientas de analítica u otras cookies, actualizaremos esta política y, cuando
        sea necesario, solicitaremos tu consentimiento previo.
      </p>

      <p className="text-sm text-ink/50">
        Consulta también nuestra <Link href="/privacidad">Política de privacidad</Link> y el{' '}
        <Link href="/aviso-legal">Aviso legal</Link>.
      </p>
    </LegalArticle>
  )
}
