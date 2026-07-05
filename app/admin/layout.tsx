import type { Metadata } from 'next'
import { isAuthenticated, isUsingDefaultPassword } from '@/lib/admin-auth'
import AdminLogin from './AdminLogin'
import AdminChrome from './AdminChrome'

export const metadata: Metadata = {
  title: 'PescaPlus · Panel de administración',
  robots: { index: false, follow: false },
}

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const authed = await isAuthenticated()

  if (!authed) {
    return <AdminLogin usingDefaultPassword={isUsingDefaultPassword()} />
  }

  return <AdminChrome usingDefaultPassword={isUsingDefaultPassword()}>{children}</AdminChrome>
}
