/**
 * Page: /project
 *
 * Page centrale de CONFIANCE
 * - Objectif test
 * - Ce qu'on apprend
 * - Changelog
 * - Ce qui ne marche pas
 * - Règles crédits
 *
 * Ton: Transparence radicale, vibe "projet en développement"
 *
 * PROTECTION: Accessible uniquement aux partenaires authentifiés
 */

'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function ProjectPage() {
  const router = useRouter()
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    checkAuthentication()
  }, [])

  const checkAuthentication = async () => {
    try {
      // Vérifier l'authentification via l'API /me
      const response = await fetch('/api/partners/me')

      if (response.ok) {
        setIsAuthenticated(true)
      } else {
        // Non authentifié - rediriger vers /invite
        router.push('/partners/invite')
      }
    } catch (error) {
      console.error('Erreur vérification auth:', error)
      router.push('/partners/invite')
    } finally {
      setIsLoading(false)
    }
  }

  // Afficher un loader pendant la vérification
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Vérification...</p>
        </div>
      </div>
    )
  }

  // Ne rien afficher si pas authentifié (redirection en cours)
  if (!isAuthenticated) {
    return null
  }
  return (
    <div className="max-w-3xl mx-auto">
      <div className="bg-white rounded-lg border border-gray-200 p-8">
        <h1 className="text-2xl font-semibold text-gray-900 mb-2">
          Pourquoi ce projet existe
        </h1>
        <p className="text-sm text-gray-600 mb-8">
          Dernière mise à jour: 2 février 2026
        </p>

        {/* Objectif */}
        <section className="mb-8 pb-8 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Objectif du test
          </h2>
          <div className="space-y-3 text-gray-700">
            <p>
              Nous testons une hypothèse: <strong>est-ce que des clients existants
              peuvent aider d'autres personnes à découvrir nos services, tout en
              recevant une contrepartie mesurée ?</strong>
            </p>
            <p>
              Ce projet n'est pas un programme de marketing classique. C'est un
              test pour comprendre:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Si le partage d'information fonctionne mieux que la publicité</li>
              <li>Si une contrepartie en crédits (plutôt que cash) a du sens</li>
              <li>Si 500 participants peuvent générer des demandes qualifiées</li>
              <li>Si ce modèle est soutenable financièrement</li>
            </ul>
          </div>
        </section>

        {/* Ce qu'on apprend */}
        <section className="mb-8 pb-8 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Ce qu'on apprend (en temps réel)
          </h2>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 space-y-4">
            <div>
              <p className="text-sm font-semibold text-blue-900 mb-1">
                Participation
              </p>
              <p className="text-sm text-blue-800">
                Combien de participants activent leur compte ? Combien partagent
                activement ? Quel est le taux d'engagement moyen ?
              </p>
            </div>
            <div>
              <p className="text-sm font-semibold text-blue-900 mb-1">
                Qualité des référencements
              </p>
              <p className="text-sm text-blue-800">
                Les demandes référées sont-elles qualifiées ? Quel est le taux
                de financement comparé aux demandes non référées ?
              </p>
            </div>
            <div>
              <p className="text-sm font-semibold text-blue-900 mb-1">
                Coût vs. publicité
              </p>
              <p className="text-sm text-blue-800">
                Ce modèle coûte-t-il moins cher que Google Ads ou Facebook Ads
                pour acquérir un client ?
              </p>
            </div>
          </div>
        </section>

        {/* Changelog */}
        <section className="mb-8 pb-8 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Historique des changements
          </h2>
          <div className="space-y-4">
            <div className="flex gap-4">
              <div className="text-sm font-semibold text-gray-900 min-w-[100px]">
                2 fév. 2026
              </div>
              <div className="text-sm text-gray-700">
                <strong>Lancement MVP</strong> — 500 invitations envoyées aux
                clients éligibles. Phase test commence.
              </div>
            </div>
            <div className="flex gap-4">
              <div className="text-sm font-semibold text-gray-900 min-w-[100px]">
                1 fév. 2026
              </div>
              <div className="text-sm text-gray-700">
                <strong>Sélection participants</strong> — Critères: clients avec
                solde actif, historique de paiement stable, consentement opt-in.
              </div>
            </div>
            <div className="flex gap-4">
              <div className="text-sm font-semibold text-gray-900 min-w-[100px]">
                15 janv. 2026
              </div>
              <div className="text-sm text-gray-700">
                <strong>Conception projet</strong> — Définition des règles de
                crédits, structure technique, copie UI sobre.
              </div>
            </div>
          </div>
        </section>

        {/* Ce qui ne marche pas (transparence radicale) */}
        <section className="mb-8 pb-8 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Ce qui ne marche pas (encore)
          </h2>
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-6">
            <ul className="space-y-3 text-sm text-amber-900">
              <li>
                <strong>Application automatique des crédits:</strong> En phase MVP,
                l'application des crédits sur votre solde est manuelle. Nous validons
                chaque cas individuellement. Ce n'est pas scalable, mais c'est
                volontaire pour apprendre.
              </li>
              <li>
                <strong>Tracking cross-device:</strong> Si quelqu'un clique sur votre
                lien sur mobile et applique sur desktop, l'attribution peut être
                perdue. Nous travaillons sur une solution (cookie + email matching).
              </li>
              <li>
                <strong>Délai de calcul des crédits:</strong> Le système calcule les
                crédits une fois par jour (pas en temps réel). Il peut y avoir un
                délai de 24h avant que vos crédits apparaissent.
              </li>
              <li>
                <strong>Interface mobile:</strong> L'UI est fonctionnelle mais pas
                optimisée pour mobile. Nous l'améliorerons selon vos retours.
              </li>
            </ul>
          </div>
        </section>

        {/* Règles crédits */}
        <section className="mb-8 pb-8 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Règles de crédits (MVP)
          </h2>
          <div className="space-y-4 text-gray-700">
            <div>
              <p className="font-semibold text-gray-900 mb-2">
                Comment gagnez-vous des crédits ?
              </p>
              <ul className="list-disc list-inside space-y-1 ml-4 text-sm">
                <li><strong>+10 crédits</strong> quand une personne référée soumet une demande complète</li>
                <li><strong>+15 crédits</strong> quand elle complète la vérification bancaire (IBV)</li>
                <li><strong>+50 crédits</strong> quand le prêt est financé</li>
              </ul>
            </div>
            <div>
              <p className="font-semibold text-gray-900 mb-2">
                Plafond et limites
              </p>
              <ul className="list-disc list-inside space-y-1 ml-4 text-sm">
                <li>Maximum <strong>150 crédits par participant par 30 jours</strong></li>
                <li>Les crédits n'expirent pas, mais l'application sur solde est soumise à validation</li>
                <li>Aucun crédit pour les clics ou partages seuls (seulement les résultats mesurés)</li>
              </ul>
            </div>
            <div>
              <p className="font-semibold text-gray-900 mb-2">
                Application des crédits
              </p>
              <p className="text-sm">
                En phase MVP, vous pouvez demander l'application de vos crédits
                disponibles sur votre solde. Chaque demande est validée manuellement
                (nous vérifions que les événements sont légitimes, pas de fraude).
                Cette validation prend généralement 2-5 jours ouvrables.
              </p>
            </div>
          </div>
        </section>

        {/* Contact & feedback */}
        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Questions ou problèmes ?
          </h2>
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
            <p className="text-sm text-gray-700 mb-4">
              Ce projet est en phase test. Si vous avez des questions, des bugs
              à signaler, ou des suggestions d'amélioration, votre feedback est
              précieux.
            </p>
            <div className="flex gap-4">
              <a
                href="/partners/feedback"
                className="inline-block bg-blue-600 text-white font-medium py-2 px-4 rounded-lg hover:bg-blue-700 transition text-sm"
              >
                Donner votre avis
              </a>
              <a
                href="mailto:support@solutionargentrapide.ca"
                className="inline-block bg-gray-100 text-gray-700 font-medium py-2 px-4 rounded-lg hover:bg-gray-200 transition text-sm"
              >
                Contacter le support
              </a>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
