/**
 * Page: /feedback
 *
 * Feedback facultatif (3 questions max)
 * Ton: Sobre, questions simples, pas de NPS ou marketing
 */

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function FeedbackPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const [answers, setAnswers] = useState({
    q1: '', // Clarté du projet
    q2: '', // Facilité utilisation
    q3: ''  // Suggestions
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const response = await fetch('/api/partners/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          answers: {
            clarity: answers.q1,
            ease_of_use: answers.q2,
            suggestions: answers.q3
          },
          submitted_from: 'feedback_page'
        })
      })

      if (response.ok) {
        setSubmitted(true)
      } else {
        throw new Error('Erreur soumission feedback')
      }
    } catch (error) {
      console.error('Erreur:', error)
      alert('Erreur lors de la soumission. Veuillez réessayer.')
    } finally {
      setIsLoading(false)
    }
  }

  if (submitted) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-2xl font-semibold text-gray-900 mb-2">
            Merci pour votre retour
          </h2>
          <p className="text-gray-600 mb-6">
            Votre feedback nous aide à améliorer le projet.
          </p>
          <button
            onClick={() => router.push('/dashboard')}
            className="bg-blue-600 text-white font-medium py-3 px-6 rounded-lg hover:bg-blue-700 transition"
          >
            Retour au tableau de bord
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white rounded-lg border border-gray-200 p-8">
        <h1 className="text-2xl font-semibold text-gray-900 mb-2">
          Votre avis sur le projet
        </h1>
        <p className="text-gray-600 mb-8">
          3 questions rapides (facultatif). Vos réponses restent confidentielles.
        </p>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Question 1 */}
          <div>
            <label className="block">
              <span className="text-sm font-medium text-gray-900 mb-2 block">
                1. Le projet et ses règles sont-ils clairs ?
              </span>
              <div className="space-y-2">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="radio"
                    name="q1"
                    value="Très clair"
                    checked={answers.q1 === 'Très clair'}
                    onChange={(e) => setAnswers({ ...answers, q1: e.target.value })}
                    className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">Très clair</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="radio"
                    name="q1"
                    value="Plutôt clair"
                    checked={answers.q1 === 'Plutôt clair'}
                    onChange={(e) => setAnswers({ ...answers, q1: e.target.value })}
                    className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">Plutôt clair</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="radio"
                    name="q1"
                    value="Confus"
                    checked={answers.q1 === 'Confus'}
                    onChange={(e) => setAnswers({ ...answers, q1: e.target.value })}
                    className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">Confus</span>
                </label>
              </div>
            </label>
          </div>

          {/* Question 2 */}
          <div>
            <label className="block">
              <span className="text-sm font-medium text-gray-900 mb-2 block">
                2. Est-ce facile de partager votre lien ?
              </span>
              <div className="space-y-2">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="radio"
                    name="q2"
                    value="Très facile"
                    checked={answers.q2 === 'Très facile'}
                    onChange={(e) => setAnswers({ ...answers, q2: e.target.value })}
                    className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">Très facile</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="radio"
                    name="q2"
                    value="Plutôt facile"
                    checked={answers.q2 === 'Plutôt facile'}
                    onChange={(e) => setAnswers({ ...answers, q2: e.target.value })}
                    className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">Plutôt facile</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="radio"
                    name="q2"
                    value="Difficile"
                    checked={answers.q2 === 'Difficile'}
                    onChange={(e) => setAnswers({ ...answers, q2: e.target.value })}
                    className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">Difficile</span>
                </label>
              </div>
            </label>
          </div>

          {/* Question 3 */}
          <div>
            <label className="block">
              <span className="text-sm font-medium text-gray-900 mb-2 block">
                3. Suggestions d'amélioration ? (optionnel)
              </span>
              <textarea
                value={answers.q3}
                onChange={(e) => setAnswers({ ...answers, q3: e.target.value })}
                rows={4}
                placeholder="Écrivez ce qui pourrait être amélioré..."
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
              />
            </label>
          </div>

          {/* Actions */}
          <div className="flex gap-4 pt-4">
            <button
              type="button"
              onClick={() => router.push('/dashboard')}
              className="flex-1 bg-gray-100 text-gray-700 font-medium py-3 px-4 rounded-lg hover:bg-gray-200 transition"
            >
              Passer
            </button>
            <button
              type="submit"
              disabled={isLoading || (!answers.q1 && !answers.q2 && !answers.q3)}
              className="flex-1 bg-blue-600 text-white font-medium py-3 px-4 rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition"
            >
              {isLoading ? 'Envoi...' : 'Envoyer'}
            </button>
          </div>
        </form>

        <p className="text-xs text-gray-500 text-center mt-6">
          Vos réponses sont anonymisées et utilisées uniquement pour améliorer le projet.
        </p>
      </div>
    </div>
  )
}
