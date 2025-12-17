import Header from '@/components/Header'
import Footer from '@/components/Footer'
import Axeptio from '@/components/Axeptio'

export default function SiteLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      <Axeptio />
      <Header />
      <main>{children}</main>
      <Footer />
    </>
  )
}
