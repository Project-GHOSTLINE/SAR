'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { Menu, X, Phone, Mail } from 'lucide-react'

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isScrolled, setIsScrolled] = useState(false)
  const pathname = usePathname()
  const isHomepage = pathname === '/'

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const navLinks = [
    { href: '/', label: 'Accueil' },
    { href: '/demandez-votre-credit', label: 'Demandez votre credit' },
    { href: '/faq', label: 'FAQ' },
    { href: '/nous-joindre', label: 'Nous joindre' },
    { href: '/ibv', label: 'Problemes de verification bancaire (IBV)' },
  ]

  return (
    <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
      isHomepage && !isScrolled
        ? 'bg-transparent'
        : 'bg-white/95 backdrop-blur-xl shadow-lg shadow-black/5'
    }`}>
      {/* Top bar */}
      <div className={`transition-all duration-500 ${
        isScrolled
          ? 'bg-sar-green/90 backdrop-blur-sm'
          : 'bg-sar-green'
      } text-white py-2`}>
        <div className="container mx-auto px-4 flex justify-between items-center text-sm">
          <div className="flex items-center gap-2 md:gap-6">
            <a href="tel:5145891946" className="flex items-center gap-1.5 hover:text-sar-gold transition-colors">
              <Phone size={14} />
              <span><strong>Analyse/Suivi:</strong> 514 589-1946</span>
            </a>
            <span className="hidden md:inline text-white/40">|</span>
            <a href="tel:4509991107" className="hidden md:flex items-center gap-1.5 hover:text-sar-gold transition-colors">
              <Phone size={14} />
              <span><strong>Comptabilite:</strong> 450 999-1107</span>
            </a>
          </div>
        </div>
      </div>

      {/* Main header */}
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between py-4">
          {/* Logo */}
          <Link href="/" className="flex items-center group">
            <span className={`text-2xl font-bold transition-all duration-300 ${isHomepage && !isScrolled ? 'text-white' : 'text-sar-green'}`}>Solution</span>
            <span className={`text-2xl font-bold ml-1 transition-all duration-300 ${isHomepage && !isScrolled ? 'text-white' : 'text-sar-gold'}`}>Argent Rapide</span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`relative px-4 py-2 transition-all duration-300 font-medium text-sm rounded-xl ${
                  isHomepage && !isScrolled
                    ? 'text-white/90 hover:text-white hover:bg-white/10'
                    : 'text-gray-700 hover:text-sar-green hover:bg-sar-green/5'
                }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* CTA Button */}
          <Link
            href="/demandez-votre-credit"
            className={`hidden lg:block text-sm font-semibold py-2.5 px-5 rounded-xl transition-all duration-300 ${
              isHomepage && !isScrolled
                ? 'bg-white text-sar-green hover:bg-white/90'
                : 'bg-sar-green text-white hover:bg-sar-green-dark'
            }`}
          >
            Demandez votre credit
          </Link>

          {/* Mobile Menu Button */}
          <button
            className={`lg:hidden p-2 rounded-xl transition-colors ${
              isHomepage && !isScrolled
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
          <nav className="py-4 border-t border-gray-100">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="block py-3 px-4 text-gray-700 hover:text-sar-green hover:bg-sar-green/5 transition-all duration-300 font-medium rounded-xl"
                onClick={() => setIsMenuOpen(false)}
              >
                {link.label}
              </Link>
            ))}
            <Link
              href="/demandez-votre-credit"
              className="block mt-4 btn-primary text-center"
              onClick={() => setIsMenuOpen(false)}
            >
              Demandez votre credit
            </Link>
          </nav>
        </div>
      </div>
    </header>
  )
}
