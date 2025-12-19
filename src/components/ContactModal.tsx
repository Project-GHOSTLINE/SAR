'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { X, Send, MessageCircle, CheckCircle, ExternalLink, AlertCircle } from 'lucide-react'
import { validateEmail, validateCanadianPhone } from '@/lib/validators'

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
  const [errors, setErrors] = useState<{
    nom?: string
    email?: string
    telephone?: string
  }>({})
  const [touched, setTouched] = useState<{
    nom?: boolean
    email?: boolean
    telephone?: boolean
  }>({})
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

  // Validation temps réel
  const validateField = (field: 'nom' | 'email' | 'telephone') => {
    const newErrors = { ...errors }

    if (field === 'nom') {
      if (!contactForm.nom || contactForm.nom.trim().length < 2) {
        newErrors.nom = 'Le nom doit contenir au moins 2 caractères'
      } else {
        delete newErrors.nom
      }
    }

    if (field === 'email') {
      const emailValidation = validateEmail(contactForm.email)
      if (!emailValidation.valid) {
        newErrors.email = emailValidation.error
      } else {
        delete newErrors.email
      }
    }

    if (field === 'telephone') {
      const phoneValidation = validateCanadianPhone(contactForm.telephone)
      if (!phoneValidation.valid) {
        newErrors.telephone = phoneValidation.error
      } else {
        delete newErrors.telephone
      }
    }

    setErrors(newErrors)
  }

  const handleBlur = (field: 'nom' | 'email' | 'telephone') => {
    setTouched({ ...touched, [field]: true })
    validateField(field)
  }

  const handleChange = (field: 'nom' | 'email' | 'telephone', value: string) => {
    setContactForm({ ...contactForm, [field]: value })
    if (touched[field]) {
      setTimeout(() => validateField(field), 0)
    }
  }

  const handleSubmitContact = async () => {
    // Marquer tous les champs comme touchés
    setTouched({ nom: true, email: true, telephone: true })

    // Valider tous les champs
    validateField('nom')
    validateField('email')
    validateField('telephone')

    // Vérifier s'il y a des erreurs
    const tempErrors: typeof errors = {}

    if (!contactForm.nom || contactForm.nom.trim().length < 2) {
      tempErrors.nom = 'Le nom doit contenir au moins 2 caractères'
    }

    const emailValidation = validateEmail(contactForm.email)
    if (!emailValidation.valid) {
      tempErrors.email = emailValidation.error
    }

    const phoneValidation = validateCanadianPhone(contactForm.telephone)
    if (!phoneValidation.valid) {
      tempErrors.telephone = phoneValidation.error
    }

    if (Object.keys(tempErrors).length > 0 || !contactForm.question) {
      setErrors(tempErrors)
      return
    }

    setIsSubmitting(true)
    try {
      const response = await fetch('/api/contact-analyse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...contactForm,
          source: 'analyse-suivi',
          clientMetadata: {
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            screenResolution: `${window.screen.width}x${window.screen.height}`
          }
        })
      })

      if (response.ok) {
        setIsSuccess(true)
        setTimeout(() => {
          onClose()
          setIsSuccess(false)
          setContactForm({ nom: '', email: '', telephone: '', question: '', questionAutre: '' })
          setErrors({})
          setTouched({})
        }, 2000)
      } else {
        const data = await response.json()
        alert(data.error || 'Erreur lors de l\'envoi. Veuillez réessayer.')
      }
    } catch (error) {
      console.error('Error:', error)
      alert('Erreur lors de l\'envoi. Veuillez réessayer.')
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
                <div>
                  <input
                    type="text"
                    className={`w-full px-4 py-3 border-2 rounded-xl focus:border-sar-green focus:outline-none transition-colors ${
                      touched.nom && errors.nom
                        ? 'border-red-500 bg-red-50'
                        : contactForm.nom
                          ? 'border-sar-green/50 bg-sar-green/5'
                          : 'border-gray-200'
                    }`}
                    placeholder="Votre nom complet *"
                    value={contactForm.nom}
                    onChange={(e) => handleChange('nom', e.target.value)}
                    onBlur={() => handleBlur('nom')}
                  />
                  {touched.nom && errors.nom && (
                    <div className="mt-1 flex items-center gap-1 text-red-600 text-xs">
                      <AlertCircle size={12} />
                      <span>{errors.nom}</span>
                    </div>
                  )}
                </div>

                <div>
                  <input
                    type="email"
                    className={`w-full px-4 py-3 border-2 rounded-xl focus:border-sar-green focus:outline-none transition-colors ${
                      touched.email && errors.email
                        ? 'border-red-500 bg-red-50'
                        : contactForm.email
                          ? 'border-sar-green/50 bg-sar-green/5'
                          : 'border-gray-200'
                    }`}
                    placeholder="Votre courriel *"
                    value={contactForm.email}
                    onChange={(e) => handleChange('email', e.target.value)}
                    onBlur={() => handleBlur('email')}
                  />
                  {touched.email && errors.email && (
                    <div className="mt-1 flex items-center gap-1 text-red-600 text-xs">
                      <AlertCircle size={12} />
                      <span>{errors.email}</span>
                    </div>
                  )}
                </div>

                <div>
                  <input
                    type="tel"
                    className={`w-full px-4 py-3 border-2 rounded-xl focus:border-sar-green focus:outline-none transition-colors ${
                      touched.telephone && errors.telephone
                        ? 'border-red-500 bg-red-50'
                        : contactForm.telephone
                          ? 'border-sar-green/50 bg-sar-green/5'
                          : 'border-gray-200'
                    }`}
                    placeholder="Téléphone (Canada) *"
                    value={contactForm.telephone}
                    onChange={(e) => handleChange('telephone', e.target.value)}
                    onBlur={() => handleBlur('telephone')}
                  />
                  {touched.telephone && errors.telephone && (
                    <div className="mt-1 flex items-center gap-1 text-red-600 text-xs">
                      <AlertCircle size={12} />
                      <span>{errors.telephone}</span>
                    </div>
                  )}
                </div>
              </div>

              {(!contactForm.nom || !contactForm.email || !contactForm.telephone || !contactForm.question) && Object.keys(errors).length === 0 && (
                <p className="text-xs text-gray-500">* Tous les champs sont obligatoires</p>
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
