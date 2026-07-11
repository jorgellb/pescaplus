import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Consejos de pesca · Asesor experto',
  description:
    'Consejos de pesca: técnicas, nudos, señuelos recomendados y configuración de aparejos por modalidad.',
  alternates: { canonical: '/advice' },
}

export default function AdviceLayout({ children }: { children: React.ReactNode }) {
  return children
}
