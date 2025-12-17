import Link from 'next/link'
import { Phone, Mail, MapPin, Clock } from 'lucide-react'

export default function Footer() {
  return (
    <footer className="bg-sar-grey-dark text-white">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* About */}
          <div>
            <h3 className="text-xl font-bold mb-4">
              <span className="text-sar-green">Solution</span>
              <span className="text-sar-gold ml-1">Argent Rapide</span>
            </h3>
            <p className="text-gray-400 mb-4">
              Nous offrons des solutions rapides de credit aux Quebecois et Canadiens, meme a ceux qui ont un mauvais credit.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-lg font-semibold mb-4">Liens rapides</h4>
            <ul className="space-y-2">
              <li>
                <Link href="/" className="text-gray-400 hover:text-sar-green transition-colors">
                  Accueil
                </Link>
              </li>
              <li>
                <Link href="/demandez-votre-credit" className="text-gray-400 hover:text-sar-green transition-colors">
                  Demandez votre credit
                </Link>
              </li>
              <li>
                <Link href="/faq" className="text-gray-400 hover:text-sar-green transition-colors">
                  FAQ
                </Link>
              </li>
              <li>
                <Link href="/nous-joindre" className="text-gray-400 hover:text-sar-green transition-colors">
                  Nous joindre
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact Info */}
          <div>
            <h4 className="text-lg font-semibold mb-4">Contact</h4>
            <ul className="space-y-3">
              <li className="flex items-start gap-3">
                <MapPin size={18} className="text-sar-green mt-1 flex-shrink-0" />
                <span className="text-gray-400">1148 aime petit, Chambly, Qc, J3L 6K1</span>
              </li>
              <li className="flex items-center gap-3">
                <Phone size={18} className="text-sar-green flex-shrink-0" />
                <a href="tel:5145891946" className="text-gray-400 hover:text-sar-green transition-colors">
                  514 589 1946
                </a>
              </li>
              <li className="flex items-center gap-3">
                <Mail size={18} className="text-sar-green flex-shrink-0" />
                <a href="mailto:info@solutionargentrapide.ca" className="text-gray-400 hover:text-sar-green transition-colors">
                  info@solutionargentrapide.ca
                </a>
              </li>
              <li className="flex items-center gap-3">
                <Clock size={18} className="text-sar-green flex-shrink-0" />
                <span className="text-gray-400">24h/24, 7 jours/semaine</span>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="text-lg font-semibold mb-4">Legal</h4>
            <ul className="space-y-2">
              <li>
                <Link href="/mentions-legales" className="text-gray-400 hover:text-sar-green transition-colors">
                  Mentions legales
                </Link>
              </li>
              <li>
                <Link href="/politique-de-confidentialite" className="text-gray-400 hover:text-sar-green transition-colors">
                  Politique de confidentialite
                </Link>
              </li>
              <li>
                <Link href="/politique-de-cookies" className="text-gray-400 hover:text-sar-green transition-colors">
                  Politique de cookies
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-700 mt-8 pt-8 text-center text-gray-400">
          <p>&copy; {new Date().getFullYear()} Solution Argent Rapide. Tous droits reserves.</p>
        </div>
      </div>
    </footer>
  )
}
