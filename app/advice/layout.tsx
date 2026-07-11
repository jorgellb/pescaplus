import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Consejos IA · Asistente de pesca',
  description:
    'Asistente de pesca con IA: técnicas, nudos, señuelos recomendados y configuración de aparejos por modalidad.',
  alternates: { canonical: '/advice' },
}

export default function AdviceLayout({ children }: { children: React.ReactNode }) {
  return children
}
