import Link from 'next/link'
import { Phone, Mail, MapPin, Clock } from 'lucide-react'

export default function Footer() {
  return (
    <footer className="relative overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900"></div>

      {/* Decorative orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute w-96 h-96 -top-48 -left-48 bg-sar-green/10 rounded-full blur-3xl"></div>
        <div className="absolute w-80 h-80 -bottom-40 -right-40 bg-sar-gold/10 rounded-full blur-3xl"></div>
      </div>

      <div className="container mx-auto px-4 py-16 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* About */}
          <div>
            <h3 className="text-xl font-bold mb-4">
              <span className="text-sar-green">Solution</span>
              <span className="text-sar-gold ml-1">Argent Rapide</span>
            </h3>
            <p className="text-gray-400 mb-4 leading-relaxed">
              Nous offrons des solutions rapides de credit aux Quebecois et Canadiens, meme a ceux qui ont un mauvais credit.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-lg font-semibold mb-4 text-white">Liens rapides</h4>
            <ul className="space-y-2">
              <li>
                <Link href="/" className="text-gray-400 hover:text-sar-green transition-all duration-300 flex items-center gap-2 group">
                  <span className="w-1.5 h-1.5 bg-sar-green/50 rounded-full group-hover:bg-sar-green transition-colors"></span>
                  Accueil
                </Link>
              </li>
              <li>
                <Link href="/demandez-votre-credit" className="text-gray-400 hover:text-sar-green transition-all duration-300 flex items-center gap-2 group">
                  <span className="w-1.5 h-1.5 bg-sar-green/50 rounded-full group-hover:bg-sar-green transition-colors"></span>
                  Demandez votre credit
                </Link>
              </li>
              <li>
                <Link href="/faq" className="text-gray-400 hover:text-sar-green transition-all duration-300 flex items-center gap-2 group">
                  <span className="w-1.5 h-1.5 bg-sar-green/50 rounded-full group-hover:bg-sar-green transition-colors"></span>
                  FAQ
                </Link>
              </li>
              <li>
                <Link href="/nous-joindre" className="text-gray-400 hover:text-sar-green transition-all duration-300 flex items-center gap-2 group">
                  <span className="w-1.5 h-1.5 bg-sar-green/50 rounded-full group-hover:bg-sar-green transition-colors"></span>
                  Nous joindre
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact Info */}
          <div>
            <h4 className="text-lg font-semibold mb-4 text-white">Contact</h4>
            <ul className="space-y-3">
              <li className="flex items-start gap-3 group">
                <div className="w-8 h-8 rounded-lg bg-sar-green/10 flex items-center justify-center flex-shrink-0 group-hover:bg-sar-green/20 transition-colors">
                  <MapPin size={16} className="text-sar-green" />
                </div>
                <span className="text-gray-400 text-sm">1148 aime petit, Chambly, Qc, J3L 6K1</span>
              </li>
              <li className="flex items-center gap-3 group">
                <div className="w-8 h-8 rounded-lg bg-sar-green/10 flex items-center justify-center flex-shrink-0 group-hover:bg-sar-green/20 transition-colors">
                  <Phone size={16} className="text-sar-green" />
                </div>
                <a href="tel:5145891946" className="text-gray-400 hover:text-sar-green transition-colors text-sm">
                  514 589 1946
                </a>
              </li>
              <li className="flex items-center gap-3 group">
                <div className="w-8 h-8 rounded-lg bg-sar-green/10 flex items-center justify-center flex-shrink-0 group-hover:bg-sar-green/20 transition-colors">
                  <Mail size={16} className="text-sar-green" />
                </div>
                <a href="mailto:info@solutionargentrapide.ca" className="text-gray-400 hover:text-sar-green transition-colors text-sm">
                  info@solutionargentrapide.ca
                </a>
              </li>
              <li className="flex items-center gap-3 group">
                <div className="w-8 h-8 rounded-lg bg-sar-green/10 flex items-center justify-center flex-shrink-0 group-hover:bg-sar-green/20 transition-colors">
                  <Clock size={16} className="text-sar-green" />
                </div>
                <span className="text-gray-400 text-sm">24h/24, 7 jours/semaine</span>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="text-lg font-semibold mb-4 text-white">Legal</h4>
            <ul className="space-y-2">
              <li>
                <Link href="/mentions-legales" className="text-gray-400 hover:text-sar-green transition-all duration-300 flex items-center gap-2 group">
                  <span className="w-1.5 h-1.5 bg-sar-gold/50 rounded-full group-hover:bg-sar-gold transition-colors"></span>
                  Mentions legales
                </Link>
              </li>
              <li>
                <Link href="/politique-de-confidentialite" className="text-gray-400 hover:text-sar-green transition-all duration-300 flex items-center gap-2 group">
                  <span className="w-1.5 h-1.5 bg-sar-gold/50 rounded-full group-hover:bg-sar-gold transition-colors"></span>
                  Politique de confidentialite
                </Link>
              </li>
              <li>
                <Link href="/politique-de-cookies" className="text-gray-400 hover:text-sar-green transition-all duration-300 flex items-center gap-2 group">
                  <span className="w-1.5 h-1.5 bg-sar-gold/50 rounded-full group-hover:bg-sar-gold transition-colors"></span>
                  Politique de cookies
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-700/50 mt-12 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-gray-500 text-sm">
              &copy; {new Date().getFullYear()} Solution Argent Rapide. Tous droits reserves.
            </p>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 bg-sar-green rounded-full animate-pulse"></span>
              <span className="text-gray-500 text-sm">Service disponible 24/7</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}
