import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import Layout from '@/components/Layout'
import LoginForm from '@/components/auth/LoginForm'
import { getSessionUser } from '@/lib/auth'

export const metadata: Metadata = {
  title: 'Entrar / Crear cuenta',
  description: 'Accede a tu cuenta de PescaPlus para gestionar tus reservas de chárter, tus quedadas y, si eres patrón, tus salidas.',
  robots: { index: false, follow: true },
}

export default async function EntrarPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams
  if (await getSessionUser()) redirect('/cuenta')
  return (
    <Layout>
      <section className="bg-paper border-b border-ink/12">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
          <h1 className="font-display uppercase text-3xl sm:text-4xl md:text-5xl leading-[1.02] text-ink">Entrar en PescaPlus</h1>
          <p className="text-ink/60 text-sm max-w-2xl mt-3">Una sola cuenta para reservar salidas, apuntarte a quedadas y, si eres patrón, publicar y cobrar tus chárters.</p>
        </div>
      </section>
      <section className="max-w-3xl mx-auto px-4 sm:px-6 py-10 space-y-4">
        {error === 'token' && <p className="text-sm text-red-700 border border-red-700/30 bg-red-700/[0.06] rounded-xl p-3 max-w-md">Ese enlace ha caducado o ya se usó. Pide uno nuevo.</p>}
        <LoginForm />
      </section>
    </Layout>
  )
}
