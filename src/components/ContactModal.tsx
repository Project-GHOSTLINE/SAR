'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { X, Send, MessageCircle, CheckCircle, ExternalLink } from 'lucide-react'

interface ContactModalProps {
  isOpen: boolean
  onClose: () => void
}

const questionsPreetablies = [
  "Ou en est ma demande de credit?",
  "J'ai un probleme avec la verification bancaire",
  "Quand vais-je recevoir mon argent?",
  "Je veux annuler ma demande",
  "Question sur mon remboursement",
  "Autre question"
]

export default function ContactModal({ isOpen, onClose }: ContactModalProps) {
  const router = useRouter()
  const [contactForm, setContactForm] = useState({
    nom: '',
    email: '',
    telephone: '',
    question: '',
    questionAutre: ''
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)

  const handleQuestionClick = (q: string) => {
    // Rediriger certaines questions vers la FAQ
    if (q === "J'ai un probleme avec la verification bancaire") {
      onClose()
      router.push('/faq#verification-bancaire')
      return
    }
    if (q === "Quand vais-je recevoir mon argent?") {
      onClose()
      router.push('/faq#delai-argent')
      return
    }
    setContactForm({ ...contactForm, question: q })
  }

  const handleSubmitContact = async () => {
    if (!contactForm.nom || !contactForm.email || !contactForm.telephone || !contactForm.question) {
      return
    }

    setIsSubmitting(true)
    try {
      const response = await fetch('/api/contact-analyse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...contactForm,
          source: 'analyse-suivi'
        })
      })

      if (response.ok) {
        setIsSuccess(true)
        setTimeout(() => {
          onClose()
          setIsSuccess(false)
          setContactForm({ nom: '', email: '', telephone: '', question: '', questionAutre: '' })
        }, 2000)
      }
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] overflow-y-auto"
      onClick={onClose}
    >
      <div className="min-h-full flex items-center justify-center p-4 py-8">
        <div
          className="bg-white rounded-3xl shadow-2xl max-w-md w-full"
          onClick={(e) => e.stopPropagation()}
        >
        {isSuccess ? (
          <div className="p-8 text-center">
            <div className="w-20 h-20 bg-sar-green/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="text-sar-green" size={40} />
            </div>
            <h3 className="text-2xl font-bold text-gray-800 mb-2">Message envoye!</h3>
            <p className="text-gray-600">Notre equipe vous contactera tres bientot.</p>
          </div>
        ) : (
          <>
            <div className="bg-gradient-to-r from-sar-green to-sar-green-dark p-6 rounded-t-3xl relative">
              <button
                onClick={onClose}
                className="absolute top-4 right-4 text-white/80 hover:text-white transition-colors"
              >
                <X size={24} />
              </button>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                  <MessageCircle className="text-white" size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">Analyse et suivi</h3>
                  <p className="text-white/80 text-sm">Reponse rapide 24/7</p>
                </div>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Choisissez votre question *
                </label>
                <div className="space-y-2">
                  {questionsPreetablies.map((q) => {
                    const isFAQRedirect = q === "J'ai un probleme avec la verification bancaire" || q === "Quand vais-je recevoir mon argent?"
                    return (
                      <button
                        key={q}
                        onClick={() => handleQuestionClick(q)}
                        className={`w-full text-left px-4 py-3 rounded-xl border-2 transition-all text-sm flex items-center justify-between ${
                          isFAQRedirect
                            ? 'border-blue-300 bg-blue-50 text-blue-700 hover:bg-blue-100'
                            : contactForm.question === q
                              ? 'border-sar-green bg-sar-green/5 text-sar-green font-medium'
                              : 'border-gray-200 hover:border-sar-green/50 text-gray-700'
                        }`}
                      >
                        <span>{q}</span>
                        {isFAQRedirect && (
                          <span className="flex items-center gap-1 text-xs bg-blue-200 text-blue-800 px-2 py-0.5 rounded">
                            <ExternalLink size={12} />
                            FAQ
                          </span>
                        )}
                      </button>
                    )
                  })}
                </div>
              </div>

              {contactForm.question === "Autre question" && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Votre question *
                  </label>
                  <textarea
                    rows={3}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-sar-green focus:outline-none transition-colors"
                    placeholder="Decrivez votre question..."
                    value={contactForm.questionAutre}
                    onChange={(e) => setContactForm({ ...contactForm, questionAutre: e.target.value })}
                  />
                </div>
              )}

              <div className="grid grid-cols-1 gap-3 pt-2">
                <input
                  type="text"
                  className={`w-full px-4 py-3 border-2 rounded-xl focus:border-sar-green focus:outline-none transition-colors ${
                    contactForm.nom ? 'border-sar-green/50 bg-sar-green/5' : 'border-gray-200'
                  }`}
                  placeholder="Votre nom complet *"
                  value={contactForm.nom}
                  onChange={(e) => setContactForm({ ...contactForm, nom: e.target.value })}
                />
                <input
                  type="email"
                  className={`w-full px-4 py-3 border-2 rounded-xl focus:border-sar-green focus:outline-none transition-colors ${
                    contactForm.email ? 'border-sar-green/50 bg-sar-green/5' : 'border-gray-200'
                  }`}
                  placeholder="Votre courriel *"
                  value={contactForm.email}
                  onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
                />
                <input
                  type="tel"
                  className={`w-full px-4 py-3 border-2 rounded-xl focus:border-sar-green focus:outline-none transition-colors ${
                    contactForm.telephone ? 'border-sar-green/50 bg-sar-green/5' : 'border-gray-200'
                  }`}
                  placeholder="Votre telephone *"
                  value={contactForm.telephone}
                  onChange={(e) => setContactForm({ ...contactForm, telephone: e.target.value })}
                />
              </div>

              {(!contactForm.nom || !contactForm.email || !contactForm.telephone || !contactForm.question) && (
                <p className="text-xs text-red-500">* Tous les champs sont obligatoires</p>
              )}

              <button
                onClick={handleSubmitContact}
                disabled={!contactForm.nom || !contactForm.email || !contactForm.telephone || !contactForm.question || isSubmitting}
                className={`w-full py-4 rounded-xl font-bold text-white flex items-center justify-center gap-2 transition-all ${
                  !contactForm.nom || !contactForm.email || !contactForm.telephone || !contactForm.question || isSubmitting
                    ? 'bg-gray-300 cursor-not-allowed'
                    : 'bg-sar-green hover:bg-sar-green-dark'
                }`}
              >
                {isSubmitting ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    Envoi en cours...
                  </>
                ) : (
                  <>
                    <Send size={18} />
                    Envoyer ma question
                  </>
                )}
              </button>
            </div>
          </>
        )}
        </div>
      </div>
    </div>
  )
}
