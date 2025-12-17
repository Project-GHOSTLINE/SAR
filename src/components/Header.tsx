'use client'

import Link from 'next/link'
import { useState } from 'react'
import { Menu, X, Phone, Mail } from 'lucide-react'

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  const navLinks = [
    { href: '/', label: 'Accueil' },
    { href: '/demandez-votre-credit', label: 'Demandez votre credit' },
    { href: '/faq', label: 'FAQ' },
    { href: '/nous-joindre', label: 'Nous joindre' },
    { href: '/ibv', label: 'Problemes de verification bancaire (IBV)' },
  ]

  return (
    <header className="bg-white shadow-md sticky top-0 z-50">
      {/* Top bar */}
      <div className="bg-sar-green text-white py-2">
        <div className="container mx-auto px-4 flex justify-between items-center text-sm">
          <div className="flex items-center gap-4">
            <a href="mailto:info@solutionargentrapide.ca" className="flex items-center gap-1 hover:text-sar-gold transition-colors">
              <Mail size={14} />
              info@solutionargentrapide.ca
            </a>
            <a href="tel:5145891946" className="flex items-center gap-1 hover:text-sar-gold transition-colors">
              <Phone size={14} />
              514 589 1946
            </a>
          </div>
        </div>
      </div>

      {/* Main header */}
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between py-4">
          {/* Logo */}
          <Link href="/" className="flex items-center">
            <span className="text-2xl font-bold text-sar-green">Solution</span>
            <span className="text-2xl font-bold text-sar-gold ml-1">Argent Rapide</span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-6">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-gray-700 hover:text-sar-green transition-colors font-medium text-sm"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* CTA Button */}
          <Link
            href="/demandez-votre-credit"
            className="hidden lg:block btn-primary text-sm"
          >
            Demandez votre credit
          </Link>

          {/* Mobile Menu Button */}
          <button
            className="lg:hidden text-gray-700"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            {isMenuOpen ? <X size={28} /> : <Menu size={28} />}
          </button>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <nav className="lg:hidden py-4 border-t">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="block py-3 text-gray-700 hover:text-sar-green transition-colors font-medium"
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
        )}
      </div>
    </header>
  )
}
