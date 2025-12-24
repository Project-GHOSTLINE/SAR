'use client'

import { useState } from 'react'
import { Phone, Mail, MapPin, Send, MessageCircle, AlertCircle } from 'lucide-react'
import Link from 'next/link'
import ContactModal from '@/components/ContactModal'
import { validateEmail, validateCanadianPhone } from '@/lib/validators'

export default function ContactPage() {
  const [formData, setFormData] = useState({
    nom: '',
    prenom: '',
    telephone: '',
    email: '',
    sujet: '',
    message: ''
  })
  const [errors, setErrors] = useState<{
    nom?: string
    prenom?: string
    telephone?: string
    email?: string
    sujet?: string
    message?: string
  }>({})
  const [touched, setTouched] = useState<{
    nom?: boolean
    prenom?: boolean
    telephone?: boolean
    email?: boolean
    sujet?: boolean
    message?: boolean
  }>({})
  const [submitted, setSubmitted] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isContactModalOpen, setIsContactModalOpen] = useState(false)

  const sujets = [
    { value: '', label: 'Sélectionnez un sujet...' },
    { value: 'report_paiement', label: 'Reporter un paiement' },
    { value: 'reduire_paiement', label: 'Réduire mes paiements' },
    { value: 'changement_info', label: 'Signaler un changement (adresse, courriel, téléphone)' },
    { value: 'releve_compte', label: 'Relevé ou solde de compte' },
    { value: 'arrangement', label: 'Arrangement de paiement' },
    { value: 'autre_question', label: 'Autre question ou demande générale' }
  ]

  // Validation temps réel
  const validateField = (field: 'nom' | 'prenom' | 'telephone' | 'email' | 'sujet' | 'message') => {
    const newErrors = { ...errors }

    if (field === 'nom') {
      if (!formData.nom || formData.nom.trim().length < 2) {
        newErrors.nom = 'Le nom doit contenir au moins 2 caractères'
      } else {
        delete newErrors.nom
      }
    }

    if (field === 'prenom') {
      if (!formData.prenom || formData.prenom.trim().length < 2) {
        newErrors.prenom = 'Le prénom doit contenir au moins 2 caractères'
      } else {
        delete newErrors.prenom
      }
    }

    if (field === 'telephone') {
      const phoneValidation = validateCanadianPhone(formData.telephone)
      if (!phoneValidation.valid) {
        newErrors.telephone = phoneValidation.error
      } else {
        delete newErrors.telephone
      }
    }

    if (field === 'email') {
      const emailValidation = validateEmail(formData.email)
      if (!emailValidation.valid) {
        newErrors.email = emailValidation.error
      } else {
        delete newErrors.email
      }
    }

    if (field === 'sujet') {
      if (!formData.sujet) {
        newErrors.sujet = 'Veuillez sélectionner un sujet'
      } else {
        delete newErrors.sujet
      }
    }

    if (field === 'message') {
      if (!formData.message || formData.message.trim().length < 10) {
        newErrors.message = 'Le message doit contenir au moins 10 caractères'
      } else {
        delete newErrors.message
      }
    }

    setErrors(newErrors)
  }

  const handleBlur = (field: 'nom' | 'prenom' | 'telephone' | 'email' | 'sujet' | 'message') => {
    setTouched({ ...touched, [field]: true })
    validateField(field)
  }

  const handleChange = (field: 'nom' | 'prenom' | 'telephone' | 'email' | 'sujet' | 'message', value: string) => {
    setFormData({ ...formData, [field]: value })
    if (touched[field]) {
      setTimeout(() => validateField(field), 0)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Marquer tous les champs comme touchés
    setTouched({ nom: true, prenom: true, telephone: true, email: true, sujet: true, message: true })

    // Valider tous les champs
    validateField('nom')
    validateField('prenom')
    validateField('telephone')
    validateField('email')
    validateField('sujet')
    validateField('message')

    // Vérifier s'il y a des erreurs
    const tempErrors: typeof errors = {}

    if (!formData.nom || formData.nom.trim().length < 2) {
      tempErrors.nom = 'Le nom doit contenir au moins 2 caractères'
    }

    if (!formData.prenom || formData.prenom.trim().length < 2) {
      tempErrors.prenom = 'Le prénom doit contenir au moins 2 caractères'
    }

    const phoneValidation = validateCanadianPhone(formData.telephone)
    if (!phoneValidation.valid) {
      tempErrors.telephone = phoneValidation.error
    }

    const emailValidation = validateEmail(formData.email)
    if (!emailValidation.valid) {
      tempErrors.email = emailValidation.error
    }

    if (!formData.sujet) {
      tempErrors.sujet = 'Veuillez sélectionner un sujet'
    }

    if (!formData.message || formData.message.trim().length < 10) {
      tempErrors.message = 'Le message doit contenir au moins 10 caractères'
    }

    if (Object.keys(tempErrors).length > 0) {
      setErrors(tempErrors)
      return
    }

    setIsSubmitting(true)

    try {
      const sujetLabel = sujets.find(s => s.value === formData.sujet)?.label || formData.sujet

      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nom: formData.nom,
          prenom: formData.prenom,
          telephone: formData.telephone,
          email: formData.email,
          sujet: sujetLabel,
          message: formData.message,
          contactMethod: 'email',
          contact: formData.email,
          source: 'nous-joindre',
          clientMetadata: {
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            screenResolution: `${window.screen.width}x${window.screen.height}`
          }
        })
      })

      if (response.ok) {
        setSubmitted(true)
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

  const resetForm = () => {
    setFormData({ nom: '', prenom: '', telephone: '', email: '', sujet: '', message: '' })
    setErrors({})
    setTouched({})
    setSubmitted(false)
  }

  return (
    <div className="py-16">
      <div className="container mx-auto px-4">
        <h1 className="section-title text-center">Nous joindre</h1>
        <p className="section-subtitle text-center">Nous sommes la pour vous ecouter sans jugement</p>

        <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Contact Info */}
          <div>
            <h2 className="text-2xl font-semibold mb-6">Informations de contact</h2>

            <div className="space-y-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-sar-green rounded-full flex items-center justify-center flex-shrink-0">
                  <Mail className="text-white" />
                </div>
                <div>
                  <h3 className="font-semibold mb-1">Courriel</h3>
                  <a href="mailto:info@solutionargentrapide.ca" className="text-sar-green hover:underline">
                    info@solutionargentrapide.ca
                  </a>
                </div>
              </div>

              <button
                onClick={() => setIsContactModalOpen(true)}
                className="flex items-start gap-4 p-4 bg-sar-green/5 rounded-xl border-2 border-sar-green/20 hover:bg-sar-green/10 transition-colors w-full text-left"
              >
                <div className="w-12 h-12 bg-sar-green rounded-full flex items-center justify-center flex-shrink-0">
                  <MessageCircle className="text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-sar-green mb-1">Analyse et suivi de votre demande</h3>
                  <span className="inline-block bg-sar-green text-white px-4 py-2 rounded-lg font-bold">
                    Discuter avec nous
                  </span>
                  <p className="text-gray-600 text-sm mt-2">Disponible 24h/24, 7j/7</p>
                  <p className="text-gray-500 text-xs mt-1">Nouvelle demande, suivi de dossier, questions</p>
                </div>
              </button>

              <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-xl border border-gray-200">
                <div className="w-12 h-12 bg-sar-gold rounded-full flex items-center justify-center flex-shrink-0">
                  <Phone className="text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-700 mb-1">Administration / Comptabilite</h3>
                  <a href="tel:4509991107" className="text-gray-700 hover:text-sar-green hover:underline text-lg font-semibold">
                    450 999-1107
                  </a>
                  <p className="text-gray-600 text-sm mt-1">Lundi au vendredi: 8h - 16h</p>
                  <p className="text-orange-600 text-xs mt-2 font-medium">Questions de facturation et paiements uniquement</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-sar-green rounded-full flex items-center justify-center flex-shrink-0">
                  <MapPin className="text-white" />
                </div>
                <div>
                  <h3 className="font-semibold mb-1">Adresse</h3>
                  <p className="text-gray-600">1148 aime petit<br />Chambly, Qc, J3L 6K1</p>
                </div>
              </div>
            </div>

            <div className="mt-8 p-4 bg-sar-grey rounded-lg">
              <p className="text-gray-600">
                Avant de nous contacter, consultez notre{' '}
                <Link href="/faq" className="text-sar-green font-semibold hover:underline">
                  section FAQ
                </Link>{' '}
                pour trouver rapidement des reponses a vos questions.
              </p>
            </div>
          </div>

          {/* Contact Form */}
          <div>
            {/* Bouton Analyse et suivi */}
            <button
              onClick={() => setIsContactModalOpen(true)}
              className="w-full mb-6 p-6 bg-gradient-to-br from-sar-green to-sar-green-dark rounded-2xl text-white hover:shadow-2xl transition-all"
            >
              <div className="flex items-center justify-between">
                <div className="text-left">
                  <h3 className="text-xl font-bold mb-2">Analyse et suivi de votre demande</h3>
                  <p className="text-white/90 text-sm">Discuter avec nous - Disponible 24h/24, 7j/7</p>
                  <p className="text-white/80 text-xs mt-1">Nouvelle demande, suivi de dossier, questions</p>
                </div>
                <MessageCircle className="w-12 h-12" />
              </div>
            </button>

            {submitted ? (
              /* Success Message */
              <div className="card text-center py-8">
                <div className="w-16 h-16 bg-sar-green rounded-full flex items-center justify-center mx-auto mb-4">
                  <Send className="text-white" size={32} />
                </div>
                <h3 className="text-xl font-semibold mb-2">Message envoye!</h3>
                <p className="text-gray-600 mb-6">Nous vous repondrons dans les plus brefs delais.</p>
                <button
                  onClick={resetForm}
                  className="px-6 py-2 bg-sar-green text-white rounded-lg font-semibold hover:bg-sar-green-dark transition-colors"
                >
                  Envoyer un autre message
                </button>
              </div>
            ) : (
              /* Formulaire */
              <div className="card">
                <h2 className="text-2xl font-semibold mb-6">Contactez-nous</h2>
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium mb-2">Sujet de votre demande *</label>
                    <select
                      required
                      className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-sar-green focus:border-transparent ${
                        touched.sujet && errors.sujet
                          ? 'border-red-500 bg-red-50'
                          : 'border-gray-300'
                      }`}
                      value={formData.sujet}
                      onChange={(e) => handleChange('sujet', e.target.value)}
                      onBlur={() => handleBlur('sujet')}
                    >
                      {sujets.map((sujet) => (
                        <option key={sujet.value} value={sujet.value}>
                          {sujet.label}
                        </option>
                      ))}
                    </select>
                    {touched.sujet && errors.sujet && (
                      <div className="mt-2 flex items-center gap-2 text-red-600 text-sm">
                        <AlertCircle size={16} />
                        <span>{errors.sujet}</span>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Nom *</label>
                    <input
                      type="text"
                      required
                      placeholder="Votre nom de famille"
                      value={formData.nom}
                      onChange={(e) => handleChange('nom', e.target.value)}
                      onBlur={() => handleBlur('nom')}
                      className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-sar-green focus:border-transparent ${
                        touched.nom && errors.nom
                          ? 'border-red-500 bg-red-50'
                          : 'border-gray-300'
                      }`}
                    />
                    {touched.nom && errors.nom && (
                      <div className="mt-2 flex items-center gap-2 text-red-600 text-sm">
                        <AlertCircle size={16} />
                        <span>{errors.nom}</span>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Prénom *</label>
                    <input
                      type="text"
                      required
                      placeholder="Votre prénom"
                      value={formData.prenom}
                      onChange={(e) => handleChange('prenom', e.target.value)}
                      onBlur={() => handleBlur('prenom')}
                      className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-sar-green focus:border-transparent ${
                        touched.prenom && errors.prenom
                          ? 'border-red-500 bg-red-50'
                          : 'border-gray-300'
                      }`}
                    />
                    {touched.prenom && errors.prenom && (
                      <div className="mt-2 flex items-center gap-2 text-red-600 text-sm">
                        <AlertCircle size={16} />
                        <span>{errors.prenom}</span>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Numéro de téléphone (Canada) *</label>
                    <input
                      type="tel"
                      required
                      placeholder="(514) 123-4567"
                      value={formData.telephone}
                      onChange={(e) => handleChange('telephone', e.target.value)}
                      onBlur={() => handleBlur('telephone')}
                      className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-sar-green focus:border-transparent ${
                        touched.telephone && errors.telephone
                          ? 'border-red-500 bg-red-50'
                          : 'border-gray-300'
                      }`}
                    />
                    {touched.telephone && errors.telephone && (
                      <div className="mt-2 flex items-center gap-2 text-red-600 text-sm">
                        <AlertCircle size={16} />
                        <span>{errors.telephone}</span>
                      </div>
                    )}
                    {!errors.telephone && formData.telephone && (
                      <p className="mt-2 text-sm text-gray-500">
                        📞 Formats acceptés: 514-123-4567, (514) 123-4567, +1 514 123 4567
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Votre message *</label>
                    <textarea
                      required
                      rows={5}
                      className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-sar-green focus:border-transparent ${
                        touched.message && errors.message
                          ? 'border-red-500 bg-red-50'
                          : 'border-gray-300'
                      }`}
                      placeholder="Prenez votre temps pour nous écrire..."
                      value={formData.message}
                      onChange={(e) => handleChange('message', e.target.value)}
                      onBlur={() => handleBlur('message')}
                    />
                    {touched.message && errors.message && (
                      <div className="mt-2 flex items-center gap-2 text-red-600 text-sm">
                        <AlertCircle size={16} />
                        <span>{errors.message}</span>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Adresse courriel *</label>
                    <input
                      type="email"
                      required
                      placeholder="votre@email.com"
                      value={formData.email}
                      onChange={(e) => handleChange('email', e.target.value)}
                      onBlur={() => handleBlur('email')}
                      className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-sar-green focus:border-transparent ${
                        touched.email && errors.email
                          ? 'border-red-500 bg-red-50'
                          : 'border-gray-300'
                      }`}
                    />
                    {touched.email && errors.email && (
                      <div className="mt-2 flex items-center gap-2 text-red-600 text-sm">
                        <AlertCircle size={16} />
                        <span>{errors.email}</span>
                      </div>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        Envoi en cours...
                      </>
                    ) : (
                      <>
                        <Send size={18} />
                        Envoyer le message
                      </>
                    )}
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Contact Modal */}
      <ContactModal
        isOpen={isContactModalOpen}
        onClose={() => setIsContactModalOpen(false)}
      />
    </div>
  )
}
