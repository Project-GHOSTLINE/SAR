/**
 * Layout Contribute - Server-side auth check
 */

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { ReactNode } from 'react'

export default async function ContributeLayout({ children }: { children: ReactNode }) {
  const cookieStore = cookies()
  const session = cookieStore.get('partners-dev-session')

  if (!session || session.value !== 'authenticated') {
    redirect('/partners')
  }

  return <>{children}</>
}
