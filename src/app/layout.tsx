import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import Script from 'next/script'
import { Suspense } from 'react'
import { Analytics } from '@vercel/analytics/react'
import { SpeedInsights } from '@vercel/speed-insights/next'
import { TelemetryProvider } from '@/components/TelemetryProvider'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  display: 'swap',
  variable: '--font-inter'
})

export const metadata: Metadata = {
  title: 'Solution Argent Rapide | Pret rapide 300$ a 5000$ sans enquete de credit',
  description: 'Obtenez un credit en 24 heures. Pret de 300$ a 5000$ sans enquete de credit. Tous les dossiers de credit sont acceptes. Service rapide au Quebec.',
  keywords: 'pret rapide, credit rapide, sans enquete de credit, pret quebec, argent rapide, mauvais credit'
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="fr">
      <head>
        <Script
          id="axeptio-settings"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              window.axeptioSettings = {
                clientId: "6942e2e1ed7f7412dd4a11f2",
                cookiesVersion: "1257bf70-6df8-4962-a0ba-272366be4584"
              };
            `
          }}
        />
        <Script
          src="https://static.axept.io/sdk.js"
          strategy="beforeInteractive"
        />
      </head>
      <body className={inter.className}>
        <Suspense fallback={null}>
          <TelemetryProvider>
            {children}
          </TelemetryProvider>
        </Suspense>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  )
}
