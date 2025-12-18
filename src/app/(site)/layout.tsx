'use client'

import { useEffect, useState } from 'react'
import Header from '@/components/Header'
import Footer from '@/components/Footer'

export default function SiteLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)

    // Charger Axeptio après le montage
    if (typeof window !== 'undefined') {
      (window as any).axeptioSettings = {
        clientId: "6942e2e1ed7f7412dd4a11f2",
        cookiesVersion: "solutionargentrapide-fr"
      }
      const script = document.createElement('script')
      script.src = "//static.axept.io/sdk.js"
      script.async = true
      document.body.appendChild(script)
    }
  }, [])

  return (
    <>
      {mounted && <Header />}
      <main className="pt-[104px]">{children}</main>
      {mounted && <Footer />}
    </>
  )
}
