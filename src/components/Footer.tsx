'use client'

import { useState, useEffect } from 'react'
import { Phone, Mail, MapPin, MessageCircle } from 'lucide-react'
import ContactModal from './ContactModal'

export default function Footer() {
  const [isContactModalOpen, setIsContactModalOpen] = useState(false)
  const [baseUrl, setBaseUrl] = useState('')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    // Si on est sur le sous-domaine client, utiliser des URLs absolues
    const hostname = window.location.hostname
    if (hostname.startsWith('client.')) {
      setBaseUrl('https://solutionargentrapide.ca')
    }
  }, [])

  // Helper pour creer les liens
  const getHref = (path: string) => baseUrl + path

  return (
    <footer className="bg-gray-900">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12">
          {/* About */}
          <div>
            <h3 className="text-xl font-bold mb-4">
              <span className="text-sar-green">Solution</span>
              <span className="text-sar-gold ml-1">Argent Rapide</span>
            </h3>
            <p className="text-gray-400 text-sm leading-relaxed">
              Nous offrons des solutions rapides de credit aux Quebecois et Canadiens, meme a ceux qui ont un mauvais credit.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-white font-semibold mb-4">Liens rapides</h4>
            <ul className="space-y-2">
              <li>
                <a href={getHref('/')} className="text-gray-400 hover:text-white transition-colors text-sm">
                  Accueil
                </a>
              </li>
              <li>
                <a href={getHref('https://solutionargentrapide.ca/demande-de-pret-en-ligne-formulaire')} className="text-gray-400 hover:text-white transition-colors text-sm">
                  Demandez votre credit
                </a>
              </li>
              <li>
                <a href={getHref('/faq')} className="text-gray-400 hover:text-white transition-colors text-sm">
                  FAQ
                </a>
              </li>
              <li>
                <a href={getHref('/nous-joindre')} className="text-gray-400 hover:text-white transition-colors text-sm">
                  Nous joindre
                </a>
              </li>
            </ul>
          </div>

          {/* Contact Info */}
          <div>
            <h4 className="text-white font-semibold mb-4">Contact</h4>
            <ul className="space-y-4">
              <li className="flex items-start gap-3">
                <MapPin size={18} className="text-sar-green mt-0.5 flex-shrink-0" />
                <span className="text-gray-400 text-sm">1148 Aime Petit, Chambly, QC, J3L 6K1</span>
              </li>
              <li className="flex items-start gap-3">
                <MessageCircle size={18} className="text-sar-green mt-0.5 flex-shrink-0" />
                <button
                  onClick={() => setIsContactModalOpen(true)}
                  className="text-left"
                >
                  <span className="text-white text-sm font-medium block">Analyse et suivi de votre demande</span>
                  <span className="text-sar-gold text-sm">Discuter avec nous</span>
                  <span className="text-gray-400 text-xs block">Disponible 24h/24, 7j/7</span>
                </button>
              </li>
              <li className="flex items-start gap-3">
                <Phone size={18} className="text-sar-gold mt-0.5 flex-shrink-0" />
                <a href="tel:4509991107" className="block">
                  <span className="text-white text-sm font-medium block">Administration / Comptabilite</span>
                  <span className="text-sar-gold text-sm">450 999-1107</span>
                  <span className="text-gray-400 text-xs block">Lundi au vendredi: 8h - 16h</span>
                </a>
              </li>
              <li className="flex items-center gap-3">
                <Mail size={18} className="text-sar-green flex-shrink-0" />
                <a href="mailto:info@solutionargentrapide.ca" className="text-gray-400 hover:text-white transition-colors text-sm">
                  info@solutionargentrapide.ca
                </a>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="text-white font-semibold mb-4">Legal</h4>
            <ul className="space-y-2">
              <li>
                <a href={getHref('/mentions-legales')} className="text-gray-400 hover:text-white transition-colors text-sm">
                  Mentions legales
                </a>
              </li>
              <li>
                <a href={getHref('/politique-de-confidentialite')} className="text-gray-400 hover:text-white transition-colors text-sm">
                  Politique de confidentialite
                </a>
              </li>
              <li>
                <a href={getHref('/politique-de-cookies')} className="text-gray-400 hover:text-white transition-colors text-sm">
                  Politique de cookies
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-800 mt-10 pt-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-gray-400 text-sm">
              &copy; {new Date().getFullYear()} Solution Argent Rapide. Tous droits reserves.
            </p>
            <p className="text-gray-400 text-sm">
              Demandes en ligne acceptées 24/7
            </p>
          </div>
        </div>
      </div>

      {/* Contact Modal */}
      <ContactModal
        isOpen={isContactModalOpen}
        onClose={() => setIsContactModalOpen(false)}
      />
    </footer>
  )
}
