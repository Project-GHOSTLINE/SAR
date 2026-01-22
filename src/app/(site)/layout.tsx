'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import Header from '@/components/Header'
import Footer from '@/components/Footer'

export default function SiteLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [mounted, setMounted] = useState(false)
  const pathname = usePathname()
  const isFormPage = pathname === '/demande-de-pret-en-ligne-formulaire'

  useEffect(() => {
    setMounted(true)
  }, [])

  return (
    <>
      {mounted && <Header />}
      <main className={isFormPage ? '' : 'pt-[72px]'}>{children}</main>
      {mounted && !isFormPage && <Footer />}
    </>
  )
}
