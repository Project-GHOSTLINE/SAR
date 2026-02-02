/**
 * Dashboard Partners - Design UX optimisé 40-60 ans
 *
 * Philosophie: Reconnaissance + Orientation + Motivation douce
 * Pas un dashboard fintech, pas de pression, pas de comparaison
 *
 * PROTECTION: Accessible uniquement aux partenaires authentifiés
 */

'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import type { PartnerDashboard } from '@/types/partners'

export default function DashboardPage() {
  const router = useRouter()
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [dashboard, setDashboard] = useState<PartnerDashboard | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    checkAuthAndLoadDashboard()
  }, [])

  const checkAuthAndLoadDashboard = async () => {
    try {
      // Vérifier session de développement FIRST
      const devSession = await fetch('/api/partners/check-session')
      if (!devSession.ok) {
        // Pas authentifié - rediriger vers login
        router.push('/partners')
        return
      }

      setIsAuthenticated(true)

      // Charger les données du dashboard
      const response = await fetch('/api/partners/me')
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Erreur chargement dashboard')
      }

      setDashboard(data)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  const handlePartage = () => {
    // TODO: Rediriger vers /partners/contribute ou afficher modal partage
    alert('Fonctionnalité de partage en développement.\n\nDans la version finale:\n• Message pré-écrit à copier\n• Boutons WhatsApp, SMS, Email\n• Génération de lien unique')
  }

  const handleVoirDetail = () => {
    // TODO: Rediriger vers /partners/credits ou afficher modal détails
    alert('Détails des crédits en développement.\n\nDans la version finale:\n• Historique complet des crédits\n• Explication du calcul\n• Dates et événements')
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto mb-6"></div>
          <p className="text-gray-600 text-xl font-medium">Chargement...</p>
        </div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="bg-red-50 border-2 border-red-200 rounded-3xl p-10 text-center max-w-2xl mx-auto mt-8 shadow-xl">
        <span className="text-5xl mb-4 block">⚠️</span>
        <p className="text-red-900 font-bold text-2xl mb-3">Erreur</p>
        <p className="text-red-700 text-lg mb-6">{error}</p>
        <button
          onClick={checkAuthAndLoadDashboard}
          className="bg-red-600 text-white text-xl font-bold px-8 py-4 rounded-2xl hover:bg-red-700 transition shadow-lg border-4 border-red-700"
        >
          Réessayer
        </button>
      </div>
    )
  }

  // Not authenticated (redirection en cours)
  if (!isAuthenticated || !dashboard) {
    return null
  }

  return (
    <div className="space-y-10 pb-12" style={{ fontSize: '18px', lineHeight: '1.6' }}>

      {/* BLOC 1 — RECONNAISSANCE (LE PLUS IMPORTANT, AVANT LES CHIFFRES) */}
      <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-3xl p-10 md:p-12 shadow-xl border-2 border-green-200">
        <div className="flex items-start gap-4 mb-6">
          <div className="w-20 h-20 bg-green-200 rounded-full flex items-center justify-center flex-shrink-0 border-4 border-green-300">
            <span className="text-5xl">🤝</span>
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 leading-tight">
            Merci pour votre participation
          </h2>
        </div>

        <div className="space-y-4 text-lg md:text-xl text-gray-800 ml-0 md:ml-24">
          <p>Ce que vous faites <strong>aide de vraies personnes</strong></p>
          <p>et contribue à <strong>améliorer nos services</strong>.</p>
          <p className="pt-2 text-green-800 font-bold">Vous pouvez participer à votre rythme.</p>
        </div>
      </div>

      {/* GUIDE - COMMENT ÇA MARCHE (NOUVEAU) */}
      <div className="bg-blue-600 rounded-3xl p-10 md:p-12 shadow-xl text-white">
        <div className="flex items-start gap-4 mb-8">
          <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center flex-shrink-0">
            <span className="text-5xl">📖</span>
          </div>
          <div>
            <h2 className="text-3xl md:text-4xl font-bold mb-3">
              Comment ça fonctionne
            </h2>
            <p className="text-xl text-blue-100">
              Voici ce que vous devez savoir pour participer
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Étape 1 */}
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border-2 border-white/30">
            <div className="text-5xl mb-4 text-center">1️⃣</div>
            <h3 className="text-2xl font-bold mb-3 text-center">Vous partagez</h3>
            <p className="text-lg text-blue-50 leading-relaxed">
              Vous partagez un lien avec quelqu'un qui pourrait avoir besoin d'un prêt.
              C'est tout - pas besoin de convaincre ou de vendre quoi que ce soit.
            </p>
          </div>

          {/* Étape 2 */}
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border-2 border-white/30">
            <div className="text-5xl mb-4 text-center">2️⃣</div>
            <h3 className="text-2xl font-bold mb-3 text-center">La personne agit</h3>
            <p className="text-lg text-blue-50 leading-relaxed">
              Si elle fait une demande de prêt et qu'elle est acceptée, nous enregistrons
              automatiquement que ça vient de vous.
            </p>
          </div>

          {/* Étape 3 */}
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border-2 border-white/30">
            <div className="text-5xl mb-4 text-center">3️⃣</div>
            <h3 className="text-2xl font-bold mb-3 text-center">Vous gagnez</h3>
            <p className="text-lg text-blue-50 leading-relaxed">
              Vous accumulez des crédits en dollars que vous pouvez appliquer
              sur votre propre solde chez SAR (si vous avez un prêt actif).
            </p>
          </div>
        </div>

        <div className="mt-8 bg-white/20 backdrop-blur-sm rounded-2xl p-6 border-2 border-white/40">
          <p className="text-xl font-bold mb-2">💡 Important à savoir:</p>
          <ul className="space-y-2 text-lg text-blue-50">
            <li>• Vous n'êtes <strong>jamais obligé</strong> de partager</li>
            <li>• Vous gagnez des crédits seulement si le prêt est <strong>réellement financé</strong></li>
            <li>• Les crédits sont <strong>appliqués sur votre solde</strong>, pas payés en argent</li>
            <li>• Vous pouvez <strong>arrêter à tout moment</strong> sans conséquence</li>
          </ul>
        </div>
      </div>

      {/* BLOC 2 — IMPACT SIMPLE (RÉSULTATS COMPRÉHENSIBLES) */}
      <div className="bg-white rounded-3xl p-10 md:p-12 shadow-xl border-2 border-gray-200">
        <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6 flex items-center gap-4 flex-wrap">
          <span className="text-5xl">📊</span>
          <span>Votre impact jusqu'à maintenant</span>
        </h2>

        <div className="bg-gray-50 rounded-2xl p-6 mb-8 border-2 border-gray-200">
          <p className="text-xl text-gray-800 leading-relaxed">
            <strong>Comment lire ces chiffres:</strong> Chaque personne qui clique sur votre lien est comptée.
            Si elle fait une demande de prêt, c'est compté. Si le prêt est financé, vous gagnez des crédits.
            C'est aussi simple que ça.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* Card 1 - Personnes ont vu */}
          <div className="bg-blue-50 rounded-2xl p-8 text-center border-2 border-blue-200 shadow-md">
            <div className="text-6xl font-black text-blue-600 mb-3">
              {dashboard.impact_cards.clicks}
            </div>
            <div className="flex items-center justify-center gap-2 mb-3">
              <span className="text-4xl">👀</span>
              <p className="text-xl font-bold text-gray-900">Personnes</p>
            </div>
            <p className="text-gray-700 text-lg mb-4">ont vu votre lien</p>
            <div className="bg-white rounded-xl p-4 text-left">
              <p className="text-sm text-gray-700 leading-relaxed">
                <strong>Ce que ça veut dire:</strong> C'est le nombre de personnes qui ont cliqué sur
                le lien que vous avez partagé. Ça montre que votre partage a atteint des gens.
              </p>
            </div>
          </div>

          {/* Card 2 - Demandes reçues */}
          <div className="bg-green-50 rounded-2xl p-8 text-center border-2 border-green-200 shadow-md">
            <div className="text-6xl font-black text-green-600 mb-3">
              {dashboard.impact_cards.applications}
            </div>
            <div className="flex items-center justify-center gap-2 mb-3">
              <span className="text-4xl">📝</span>
              <p className="text-xl font-bold text-gray-900">Demandes</p>
            </div>
            <p className="text-gray-700 text-lg mb-4">complétées</p>
            <div className="bg-white rounded-xl p-4 text-left">
              <p className="text-sm text-gray-700 leading-relaxed">
                <strong>Ce que ça veut dire:</strong> Ces personnes ont non seulement cliqué, mais ont
                aussi rempli une demande de prêt complète. <span className="text-green-700 font-bold">Vous gagnez +10 crédits par demande.</span>
              </p>
            </div>
          </div>

          {/* Card 3 - Prêt financé */}
          <div className="bg-purple-50 rounded-2xl p-8 text-center border-2 border-purple-200 shadow-md">
            <div className="text-6xl font-black text-purple-600 mb-3">
              {dashboard.impact_cards.funded}
            </div>
            <div className="flex items-center justify-center gap-2 mb-3">
              <span className="text-4xl">💳</span>
              <p className="text-xl font-bold text-gray-900">Prêt</p>
            </div>
            <p className="text-gray-700 text-lg mb-4">financé</p>
            <div className="bg-white rounded-xl p-4 text-left">
              <p className="text-sm text-gray-700 leading-relaxed">
                <strong>Ce que ça veut dire:</strong> Le prêt a été approuvé ET l'argent a été versé
                à la personne. <span className="text-purple-700 font-bold">Vous gagnez +50 crédits par prêt financé.</span>
              </p>
            </div>
          </div>
        </div>

        <div className="bg-blue-50 rounded-2xl p-6 border-2 border-blue-200">
          <p className="text-lg text-gray-800 text-center">
            <strong>📅 Mise à jour:</strong> Ces chiffres sont mis à jour automatiquement chaque jour.
            Si vous venez de partager, attendez 24h pour voir les résultats.
          </p>
        </div>
      </div>

      {/* BLOC 3 — CE QUE ÇA T'APPORTE (ARGENT, BIEN DIT) */}
      <div className="bg-white rounded-3xl p-10 md:p-12 shadow-xl border-2 border-gray-200">
        <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6 flex items-center gap-4 flex-wrap">
          <span className="text-5xl">💰</span>
          <span>Vos crédits accumulés</span>
        </h2>

        <div className="bg-amber-50 rounded-2xl p-6 mb-8 border-2 border-amber-200">
          <p className="text-xl text-gray-800 leading-relaxed">
            <strong>Comment ça marche:</strong> Chaque crédit vaut 1$. Vous accumulez des crédits
            quand les personnes que vous référez complètent des actions (demande, vérification bancaire, prêt financé).
            Vous pouvez ensuite utiliser ces crédits pour réduire votre propre solde de prêt chez SAR.
          </p>
        </div>

        <div className="bg-gradient-to-br from-green-50 to-emerald-100 rounded-3xl p-10 md:p-12 border-4 border-green-300 text-center mb-8 shadow-lg">
          <p className="text-gray-700 text-xl mb-4 font-medium">💳 Vos crédits disponibles</p>
          <div className="text-7xl md:text-8xl font-black text-green-700 mb-6">
            {dashboard.credits.available.toFixed(0)} $
          </div>
          <p className="text-2xl text-gray-800 font-bold mb-4">
            = {dashboard.credits.available.toFixed(0)}$ de réduction sur votre solde
          </p>
          <div className="bg-white/60 rounded-2xl p-6 mt-6">
            <p className="text-lg text-gray-800 leading-relaxed">
              <strong>Exemple concret:</strong> Si vous avez un prêt de 500$ chez SAR et 50$ de crédits,
              vous pouvez demander qu'on applique ces 50$ sur votre solde. Votre solde deviendra 450$.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* Comment gagner */}
          <div className="bg-blue-50 rounded-2xl p-6 border-2 border-blue-200">
            <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <span className="text-3xl">📈</span>
              Comment gagner des crédits
            </h3>
            <ul className="space-y-3 text-gray-800">
              <li className="flex items-start gap-2">
                <span className="text-green-600 font-bold text-xl">+10$</span>
                <span>Quand une personne <strong>complète une demande</strong> de prêt</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600 font-bold text-xl">+15$</span>
                <span>Quand elle <strong>fait la vérification bancaire</strong> (IBV)</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-purple-600 font-bold text-xl">+50$</span>
                <span>Quand le <strong>prêt est financé</strong> (argent versé)</span>
              </li>
            </ul>
          </div>

          {/* Comment utiliser */}
          <div className="bg-green-50 rounded-2xl p-6 border-2 border-green-200">
            <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <span className="text-3xl">💡</span>
              Comment utiliser vos crédits
            </h3>
            <ol className="space-y-3 text-gray-800 list-decimal list-inside">
              <li>Accumulez au moins <strong>10$ de crédits</strong></li>
              <li>Cliquez sur <strong>"Voir le détail"</strong> en bas de cette page</li>
              <li>Demandez l'<strong>application sur votre solde</strong></li>
              <li>On vérifie votre demande <strong>(2-5 jours)</strong></li>
              <li>Les crédits sont <strong>appliqués sur votre prêt</strong></li>
            </ol>
          </div>
        </div>

        <div className="bg-gray-50 rounded-2xl p-6 border-2 border-gray-200 text-center">
          <p className="text-lg text-gray-700 mb-2">
            <strong>⚠️ Important:</strong>
          </p>
          <p className="text-lg text-gray-800">
            Les crédits sont appliqués sur votre solde de prêt chez SAR.
            <strong className="text-red-600"> Aucun paiement en argent.</strong> Aucun engagement requis.
          </p>
        </div>
      </div>

      {/* BLOC 4 — ACTION GUIDÉE (MAX 2 ACTIONS) */}
      <div className="bg-white rounded-3xl p-10 md:p-12 shadow-xl border-2 border-gray-200">
        <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6 flex items-center gap-4 flex-wrap">
          <span className="text-5xl">👉</span>
          <span>Que faire maintenant?</span>
        </h2>

        <div className="bg-purple-50 rounded-2xl p-6 mb-8 border-2 border-purple-200">
          <p className="text-xl text-gray-800 leading-relaxed">
            <strong>Deux options simples:</strong> Vous pouvez soit partager votre lien avec quelqu'un
            pour continuer à accumuler des crédits, soit voir les détails de vos crédits actuels
            et demander à les appliquer sur votre solde.
          </p>
        </div>

        <div className="space-y-6">
          {/* Action 1 - Partager */}
          <button
            onClick={handlePartage}
            className="w-full bg-gradient-to-br from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 rounded-2xl p-8 border-4 border-blue-700 transition text-left shadow-xl group"
          >
            <div className="flex items-start gap-5">
              <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                <span className="text-4xl">📤</span>
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-3">
                  <p className="text-2xl font-bold text-white">
                    Partager mon lien
                  </p>
                  <span className="bg-green-400 text-green-900 px-3 py-1 rounded-full text-sm font-bold">
                    RECOMMANDÉ
                  </span>
                </div>
                <p className="text-blue-100 text-lg leading-relaxed mb-4">
                  Partagez votre lien de référence avec quelqu'un qui pourrait avoir besoin d'un prêt.
                </p>
                <div className="bg-white/20 backdrop-blur-sm rounded-xl p-4">
                  <p className="text-white text-base">
                    <strong>Ce qui va se passer:</strong> Vous allez recevoir un message pré-écrit que vous
                    pouvez copier et envoyer par WhatsApp, SMS ou email. C'est tout - aucune vente requise.
                  </p>
                </div>
              </div>
            </div>
          </button>

          {/* Action 2 - Voir détails */}
          <button
            onClick={handleVoirDetail}
            className="w-full bg-gray-50 hover:bg-gray-100 rounded-2xl p-8 border-4 border-gray-300 transition text-left shadow-lg group"
          >
            <div className="flex items-start gap-5">
              <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                <span className="text-4xl">📜</span>
              </div>
              <div className="flex-1">
                <p className="text-2xl font-bold text-gray-900 mb-3">
                  Voir mes crédits en détail
                </p>
                <p className="text-gray-700 text-lg leading-relaxed mb-4">
                  Consultez l'historique complet de vos crédits et demandez à les appliquer sur votre solde.
                </p>
                <div className="bg-white rounded-xl p-4 border-2 border-gray-200">
                  <p className="text-gray-800 text-base">
                    <strong>Ce que vous verrez:</strong> La liste de toutes les actions qui vous ont fait
                    gagner des crédits, avec les dates et les montants. Vous pourrez aussi demander l'application
                    de vos crédits sur votre prêt.
                  </p>
                </div>
              </div>
            </div>
          </button>
        </div>

        <div className="mt-8 bg-green-50 rounded-2xl p-6 border-2 border-green-200 text-center">
          <p className="text-lg text-gray-800">
            <strong>💡 Conseil:</strong> Si vous venez juste de vous inscrire, commencez par
            <strong className="text-green-700"> partager votre lien</strong> pour voir comment ça fonctionne.
            Vous pourrez vérifier vos crédits plus tard.
          </p>
        </div>
      </div>

      {/* BLOC 5 — TRANSPARENCE / CONFIANCE */}
      <div className="bg-blue-50 rounded-3xl p-8 md:p-10 border-2 border-blue-200 shadow-lg">
        <h3 className="text-2xl font-bold text-gray-900 mb-5 flex items-center gap-3">
          <span className="text-3xl">ℹ️</span>
          <span>À propos de ce projet</span>
        </h3>

        <div className="bg-white rounded-2xl p-6 mb-6">
          <h4 className="text-xl font-bold text-gray-900 mb-3">📋 Statut du projet</h4>
          <p className="text-lg text-gray-800 leading-relaxed mb-4">
            Ce projet est <strong>en phase de test</strong>. Nous testons si ce modèle de partage
            fonctionne mieux que la publicité traditionnelle pour aider les gens à découvrir nos services.
          </p>
          <p className="text-lg text-gray-800 leading-relaxed">
            Vous faites partie des <strong>500 premiers participants</strong>. Votre expérience et vos
            retours sont précieux pour améliorer le projet.
          </p>
        </div>

        <div className="bg-white rounded-2xl p-6 mb-6">
          <h4 className="text-xl font-bold text-gray-900 mb-3">🛡️ Vos droits</h4>
          <ul className="space-y-2 text-lg text-gray-800">
            <li className="flex items-start gap-2">
              <span className="text-green-600 font-bold">✓</span>
              <span>Vous pouvez <strong>arrêter à tout moment</strong> sans conséquence</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-600 font-bold">✓</span>
              <span>Vous <strong>n'êtes jamais obligé</strong> de partager quoi que ce soit</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-600 font-bold">✓</span>
              <span>Vos crédits <strong>ne disparaissent pas</strong> si vous arrêtez</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-600 font-bold">✓</span>
              <span>Vos données personnelles <strong>restent privées</strong></span>
            </li>
          </ul>
        </div>

        <div className="bg-amber-50 rounded-2xl p-6 border-2 border-amber-200">
          <h4 className="text-xl font-bold text-gray-900 mb-3">💬 Besoin d'aide ou de clarifications?</h4>
          <p className="text-lg text-gray-800 mb-4">
            Si quelque chose n'est pas clair ou si vous avez des questions, contactez-nous:
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <a
              href="tel:+15148001234"
              className="bg-blue-600 text-white text-center font-bold py-4 px-6 rounded-xl hover:bg-blue-700 transition flex items-center justify-center gap-2"
            >
              <span className="text-2xl">📞</span>
              <span>Appeler le support</span>
            </a>
            <a
              href="mailto:support@solutionargentrapide.ca"
              className="bg-white text-gray-700 text-center font-bold py-4 px-6 rounded-xl hover:bg-gray-50 transition border-2 border-gray-300 flex items-center justify-center gap-2"
            >
              <span className="text-2xl">✉️</span>
              <span>Envoyer un email</span>
            </a>
          </div>
          <p className="text-sm text-gray-600 text-center mt-4">
            Nous répondons dans les 24h • Aucun jugement • Aide gratuite
          </p>
        </div>
      </div>

    </div>
  )
}
