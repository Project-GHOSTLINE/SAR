import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import Header from '@/components/Header'
import Footer from '@/components/Footer'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Solution Argent Rapide | Pret rapide 300$ a 5000$ sans enquete de credit',
  description: 'Obtenez un credit en 24 heures. Pret de 300$ a 5000$ sans enquete de credit. Tous les dossiers de credit sont acceptes. Service rapide au Quebec.',
  keywords: 'pret rapide, credit rapide, sans enquete de credit, pret quebec, argent rapide, mauvais credit',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="fr">
      <body className={inter.className}>
        <Header />
        <main>{children}</main>
        <Footer />
      </body>
    </html>
  )
}
