/**
 * Layout Dashboard - Server-side auth check
 * Vérifie l'authentification côté serveur avant de rendre la page client
 */

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { ReactNode } from 'react'

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const cookieStore = cookies()
  const session = cookieStore.get('partners-dev-session')

  // Vérifier authentification côté serveur
  if (!session || session.value !== 'authenticated') {
    redirect('/partners')
  }

  return <>{children}</>
}
