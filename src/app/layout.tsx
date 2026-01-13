import type { Metadata } from 'next'
import { Poppins } from 'next/font/google'
import Script from 'next/script'
import GoogleAnalytics from '@/components/GoogleAnalytics'
import './globals.css'

const poppins = Poppins({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  display: 'swap'
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
        <script
          dangerouslySetInnerHTML={{
            __html: `
              window.axeptioSettings = {
                clientId: "6942e2e1ed7f7412dd4a11f2",
                cookiesVersion: "1257bf70-6df8-4962-a0ba-272366be4584"
              };
            `
          }}
        />
        <script async src="https://static.axept.io/sdk.js"></script>
      </head>
      <body className={poppins.className}>
        <GoogleAnalytics />
        {children}
      </body>
    </html>
  )
}
