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
      <p>PescaPlus es una plataforma de pesca con cuenta de usuario opcional. Lo que tratamos depende de qué uses:</p>
      <ul>
        <li>
          <strong>Cuenta de usuario:</strong> para registrarte solo pedimos tu <strong>correo electrónico</strong>; el
          acceso es sin contraseña, mediante un enlace de un solo uso que te enviamos por email (válido 15 minutos).
          Opcionalmente puedes añadir nombre, teléfono y una biografía breve en tu perfil. Guardamos también tu sesión
          activa (con el navegador usado) para poder cerrarla de forma remota si lo pides.
        </li>
        <li>
          <strong>Ubicación — según la función que uses:</strong>
          <ul>
            <li>
              <em>&quot;Usar mi ubicación&quot;</em> (previsión más cercana, quedadas cerca de ti): pedimos tu posición
              al navegador en el momento, la usamos para ese cálculo puntual y <strong>no la guardamos</strong> en
              nuestros servidores.
            </li>
            <li>
              <em>Grabar una ruta de navegación</em>: si activas la grabación en la carta náutica, guardamos el
              recorrido (posición, hora y, si tu dispositivo lo da, velocidad y sonda) mientras dura la salida. La ruta
              queda guardada <strong>privada por defecto</strong> y solo tú puedes verla, exportarla o borrarla, salvo
              que decidas hacerla pública.
            </li>
            <li>
              <em>Marcas propias en la carta</em> (caladeros, bajos, pecios): si guardas una marca con coordenadas,
              nace <strong>privada</strong> siempre; solo se hace visible a otros si tú la marcas explícitamente como
              pública.
            </li>
          </ul>
        </li>
        <li>
          <strong>Capturas compartidas y diario de pesca:</strong> las notas de tu diario personal se guardan solo en
          tu propio dispositivo, nunca en nuestros servidores. Si decides compartir una captura, por defecto solo
          enviamos la zona, la especie, la fecha y la cantidad — las coordenadas exactas únicamente se guardan si tú
          las apuntas expresamente desde el mapa. Los datos agregados que mostramos en público nunca identifican a una
          persona ni una coordenada individual.
        </li>
        <li>
          <strong>Mensajería con patrones:</strong> si reservas un chárter, los mensajes que intercambies con el
          patrón se guardan para que la conversación quede disponible en tu cuenta; solo los ve el pescador y el
          patrón de esa reserva (y, si hace falta moderar un abuso, nuestro equipo).
        </li>
        <li>
          <strong>Reseñas:</strong> si valoras un chárter o un pescador te valora a ti, la reseña se publica con tu
          nombre visible una vez que ambas partes han valorado (o pasado un plazo de espera pensado para evitar
          represalias).
        </li>
        <li>
          <strong>Reservas y pagos:</strong> al reservar guardamos tu nombre, un contacto (email o teléfono) y el
          mensaje que añadas. Si pagas online, el formulario de pago lo gestiona{' '}
          <strong>Stripe</strong> directamente — nunca vemos ni guardamos el número de tu tarjeta, solo recibimos la
          confirmación del cobro. Los patrones que cobran online dan de alta una cuenta de pagos con Stripe
          (identidad y datos bancarios), que Stripe trata directamente; nosotros solo guardamos el identificador de
          esa cuenta.
        </li>
        <li>
          <strong>Asistente de pesca con IA:</strong> tu conversación con el asistente no se guarda en nuestros
          servidores (queda solo en tu navegador). Para generar la respuesta, el texto que escribes se envía a{' '}
          <strong>OpenRouter</strong>, un proveedor externo que lo enruta a uno de varios modelos de lenguaje; evita
          escribir datos sensibles en el chat.
        </li>
        <li>
          <strong>Formulario de contacto y alertas por email:</strong> nombre (si lo das), correo electrónico y el
          contenido de tu mensaje o de la alerta que configures, con la única finalidad de atender tu consulta o
          avisarte cuando pidas que te avisemos.
        </li>
        <li>
          <strong>Quedadas:</strong> puedes organizarte o apuntarte a una quedada sin crear cuenta, dando tu nombre y
          un contacto (email, teléfono o WhatsApp) que solo ve quien organiza.
        </li>
        <li>
          <strong>Datos técnicos:</strong> tratamos datos mínimos como la dirección IP para prevenir abusos y
          garantizar la seguridad del sitio.
        </li>
      </ul>

      <h2>3. Base legal</h2>
      <p>
        Creamos tu cuenta y prestamos el servicio (reservas, mensajería, marcas, rutas) porque son necesarios para el{' '}
        <strong>contrato</strong> que aceptas al usarlos. El formulario de contacto y las alertas se basan en tu{' '}
        <strong>consentimiento</strong> al enviarlos. Los datos técnicos de seguridad y de prevención de abusos se
        basan en nuestro <strong>interés legítimo</strong>.
      </p>

      <h2>4. Destinatarios y transferencias</h2>
      <p>
        No vendemos tus datos ni los cedemos con fines publicitarios. Los siguientes proveedores tratan datos por
        nuestra cuenta, como encargados del tratamiento, para prestar el servicio:
      </p>
      <ul>
        <li><strong>Resend</strong> — envío de los correos del enlace de acceso y las notificaciones.</li>
        <li><strong>Stripe</strong> — procesamiento de pagos y cuentas de cobro de los patrones.</li>
        <li><strong>OpenRouter</strong> — generación de las respuestas del asistente de IA.</li>
        <li>El proveedor de alojamiento y base de datos que hace posible el sitio.</li>
      </ul>
      <p>
        Alguno de estos proveedores puede tratar datos fuera del Espacio Económico Europeo; en ese caso se apoyan en
        las garantías previstas por el RGPD (como las cláusulas contractuales tipo de la Comisión Europea).
      </p>

      <h2>5. Conservación</h2>
      <p>
        Conservamos los datos de tu cuenta mientras la mantengas activa. Los mensajes de contacto y las reservas se
        conservan el tiempo necesario para atenderlas y, después, el plazo legalmente exigible (por ejemplo, fiscal en
        el caso de los cobros). Los datos técnicos de seguridad se conservan durante periodos breves.
      </p>

      <h2>6. Compras en tiendas de terceros</h2>
      <p>
        Al pulsar un enlace de compra de material, accedes a la web del vendedor, que tratará tus datos conforme a su
        propia política de privacidad. PescaPlus no recibe los datos de esa compra.
      </p>

      <h2>7. Menores de edad</h2>
      <p>
        PescaPlus no está dirigida a menores de 14 años. Si detectamos una cuenta creada por un menor sin la
        autorización legal necesaria, la eliminaremos.
      </p>

      <h2>8. Tus derechos</h2>
      <p>
        Puedes ejercer tus derechos de acceso, rectificación, supresión, oposición, limitación y portabilidad
        escribiéndonos desde el <Link href="/contacto">formulario de contacto</Link>. Puedes borrar tú mismo tus
        marcas, rutas y mensajes desde tu cuenta en cualquier momento; para eliminar la cuenta completa, escríbenos y
        la tramitaremos. También puedes reclamar ante la Agencia Española de Protección de Datos (
        <a href="https://www.aepd.es" target="_blank" rel="noopener noreferrer">aepd.es</a>).
      </p>

      <p className="text-sm text-ink/60">
        Consulta también nuestra <Link href="/cookies">Política de cookies</Link> y el{' '}
        <Link href="/aviso-legal">Aviso legal</Link>.
      </p>
    </LegalArticle>
  )
}
