'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { Menu, X, Phone, MessageCircle } from 'lucide-react'
import ContactModal from './ContactModal'

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isScrolled, setIsScrolled] = useState(false)
  const [isContactModalOpen, setIsContactModalOpen] = useState(false)
  const [isClientSubdomain, setIsClientSubdomain] = useState(false)
  const pathname = usePathname()
  const isHomepage = pathname === '/'
  const isClientPath = pathname === '/client' || pathname?.startsWith('/client')

  // Sur la page client, toujours utiliser le style sombre (jamais transparent)
  // useWhiteText = true seulement sur homepage quand pas scrollé
  const useWhiteText = isHomepage && !isScrolled && !isClientSubdomain

  useEffect(() => {
    // Detecter si on est sur le sous-domaine client
    setIsClientSubdomain(window.location.hostname.startsWith('client.'))
  }, [])

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const navLinks = [
    { href: '/', label: 'Accueil' },
    { href: 'https://solutionargentrapide.ca/demande-de-pret-en-ligne-formulaire', label: 'Demandez votre credit' },
    { href: '/faq', label: 'FAQ' },
    { href: '/nous-joindre', label: 'Nous joindre' },
  ]

  // Menu simplifié pour la page Espace Client
  const clientNavLinks = [
    { href: '/', label: 'Accueil' },
    { href: 'https://solutionargentrapide.ca/demande-de-pret-en-ligne-formulaire', label: 'Faire un renouvellement' },
  ]

  // Utiliser le menu approprié selon la page
  const currentNavLinks = (isClientPath || isClientSubdomain) ? clientNavLinks : navLinks

  // Ne pas afficher le header sur le sous-domaine client ou la page /client
  if (isClientPath || isClientSubdomain) {
    return null
  }

  return (
    <>
    <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
      useWhiteText
        ? 'bg-transparent'
        : 'bg-white/95 backdrop-blur-xl shadow-lg shadow-black/5'
    }`}>
      {/* Top bar */}
      <div className={`transition-all duration-500 ${
        isScrolled
          ? 'bg-sar-green/90 backdrop-blur-sm'
          : 'bg-sar-green'
      } text-white py-2`}>
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row md:justify-center md:items-center gap-1 md:gap-8 text-sm">
            <button
              onClick={() => setIsContactModalOpen(true)}
              className="flex items-center gap-2 hover:opacity-80 transition-opacity cursor-pointer"
            >
              <MessageCircle size={16} className="shrink-0 text-white" />
              <span className="text-white">
                <strong>Analyse et suivi</strong>
              </span>
              <span className="bg-white text-sar-green text-xs font-bold px-3 py-1 rounded-full">DISCUTER</span>
            </button>
            <span className="hidden md:inline text-white/50">|</span>
            <a href="tel:4509991107" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
              <Phone size={14} className="shrink-0 text-white" />
              <span className="text-white">
                <strong>Administration et comptabilite:</strong>
              </span>
              <span className="bg-white text-sar-green font-bold px-2 py-0.5 rounded">450 999-1107</span>
            </a>
          </div>
        </div>
      </div>

      {/* Main header */}
      <div className="container mx-auto px-4">
          <div className="flex items-center justify-between py-4">
            {/* Logo */}
            <Link href="/" className="flex items-center group">
              <span className={`text-2xl font-bold transition-all duration-300 ${useWhiteText ? 'text-white' : 'text-sar-green'}`}>Solution</span>
              <span className={`text-2xl font-bold ml-1 transition-all duration-300 ${useWhiteText ? 'text-white' : 'text-sar-gold'}`}>Argent Rapide</span>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden lg:flex items-center gap-1">
              {currentNavLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`relative px-4 py-2 transition-all duration-300 font-medium text-sm rounded-xl ${
                    useWhiteText
                      ? 'text-white/90 hover:text-white hover:bg-white/10'
                      : 'text-gray-700 hover:text-sar-green hover:bg-sar-green/5'
                  }`}
                >
                  {link.label}
                </Link>
              ))}
            </nav>

            {/* CTA Buttons */}
            <div className="hidden lg:flex items-center gap-3">
              <a
                href="https://client.solutionargentrapide.ca"
                target="_blank"
                rel="noopener noreferrer"
                className={`text-sm font-semibold py-2.5 px-5 rounded-xl transition-all duration-300 ${
                  useWhiteText
                    ? 'bg-white/20 text-white hover:bg-white/30 border border-white/30'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Espace client
              </a>
              <Link
                href="https://solutionargentrapide.ca/demande-de-pret-en-ligne-formulaire"
                className={`text-sm font-semibold py-2.5 px-5 rounded-xl transition-all duration-300 ${
                  useWhiteText
                    ? 'bg-white text-sar-green hover:bg-white/90'
                    : 'bg-sar-green text-white hover:bg-sar-green-dark'
                }`}
              >
                Demandez votre credit
              </Link>
            </div>

            {/* Mobile Menu Button */}
            <button
              aria-label="Menu de navigation"
              className={`lg:hidden p-2 rounded-xl transition-colors ${
                useWhiteText
                  ? 'text-white hover:bg-white/10'
                  : 'text-gray-700 hover:bg-sar-green/10'
              }`}
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              {isMenuOpen ? <X size={28} /> : <Menu size={28} />}
            </button>
          </div>

          {/* Mobile Navigation */}
          <div className={`lg:hidden overflow-hidden transition-all duration-500 ${
            isMenuOpen ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'
          }`}>
            <nav className="py-4 border-t border-gray-100 bg-white/95 backdrop-blur-xl shadow-lg rounded-b-2xl">
              {currentNavLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="block py-3 px-4 text-gray-700 hover:text-sar-green hover:bg-sar-green/5 transition-all duration-300 font-medium rounded-xl"
                  onClick={() => setIsMenuOpen(false)}
                >
                  {link.label}
                </Link>
              ))}
              <button
                onClick={() => { setIsMenuOpen(false); setIsContactModalOpen(true); }}
                className="w-full mt-4 py-3 px-4 bg-sar-gold/10 text-sar-gold text-center rounded-xl font-semibold flex items-center justify-center gap-2"
              >
                <MessageCircle size={18} />
                Analyse 24/7
              </button>
              <a
                href="https://client.solutionargentrapide.ca"
                target="_blank"
                rel="noopener noreferrer"
                className="block mt-2 py-3 px-4 bg-gray-100 text-gray-700 text-center rounded-xl font-semibold"
                onClick={() => setIsMenuOpen(false)}
              >
                Espace client
              </a>
              <Link
                href="https://solutionargentrapide.ca/demande-de-pret-en-ligne-formulaire"
                className="block mt-2 btn-primary text-center"
                onClick={() => setIsMenuOpen(false)}
              >
                Demandez votre credit
              </Link>
            </nav>
          </div>
        </div>
    </header>

    {/* Contact Modal - Outside header for proper z-index */}
    <ContactModal
      isOpen={isContactModalOpen}
      onClose={() => setIsContactModalOpen(false)}
    />
    </>
  )
}
