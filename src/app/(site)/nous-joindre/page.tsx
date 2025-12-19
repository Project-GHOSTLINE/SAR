'use client'

import { useState } from 'react'
import { Phone, Mail, MapPin, Clock, Send, MessageCircle, AlertCircle } from 'lucide-react'
import Link from 'next/link'
import ContactModal from '@/components/ContactModal'
import { validateEmail, validateCanadianPhone, formatCanadianPhone } from '@/lib/validators'

export default function ContactPage() {
  const [formData, setFormData] = useState({
    message: '',
    contactMethod: 'email',
    contact: ''
  })
  const [errors, setErrors] = useState<{
    message?: string
    contact?: string
  }>({})
  const [touched, setTouched] = useState<{
    message?: boolean
    contact?: boolean
  }>({})
  const [submitted, setSubmitted] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isContactModalOpen, setIsContactModalOpen] = useState(false)

  // Validation temps réel
  const validateField = (field: 'message' | 'contact') => {
    const newErrors = { ...errors }

    if (field === 'message') {
      if (!formData.message || formData.message.trim().length < 10) {
        newErrors.message = 'Le message doit contenir au moins 10 caractères'
      } else {
        delete newErrors.message
      }
    }

    if (field === 'contact') {
      if (formData.contactMethod === 'email') {
        const emailValidation = validateEmail(formData.contact)
        if (!emailValidation.valid) {
          newErrors.contact = emailValidation.error
        } else {
          delete newErrors.contact
        }
      } else {
        const phoneValidation = validateCanadianPhone(formData.contact)
        if (!phoneValidation.valid) {
          newErrors.contact = phoneValidation.error
        } else {
          delete newErrors.contact
        }
      }
    }

    setErrors(newErrors)
  }

  const handleBlur = (field: 'message' | 'contact') => {
    setTouched({ ...touched, [field]: true })
    validateField(field)
  }

  const handleChange = (field: 'message' | 'contact', value: string) => {
    setFormData({ ...formData, [field]: value })
    if (touched[field]) {
      // Re-valider immédiatement si le champ a déjà été touché
      setTimeout(() => validateField(field), 0)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Marquer tous les champs comme touchés
    setTouched({ message: true, contact: true })

    // Valider tous les champs
    validateField('message')
    validateField('contact')

    // Vérifier s'il y a des erreurs
    const hasErrors = Object.keys(errors).length > 0 ||
                      !formData.message ||
                      formData.message.trim().length < 10 ||
                      !formData.contact

    if (hasErrors) {
      // Forcer une nouvelle validation pour afficher toutes les erreurs
      const tempErrors: typeof errors = {}

      if (!formData.message || formData.message.trim().length < 10) {
        tempErrors.message = 'Le message doit contenir au moins 10 caractères'
      }

      if (formData.contactMethod === 'email') {
        const emailValidation = validateEmail(formData.contact)
        if (!emailValidation.valid) {
          tempErrors.contact = emailValidation.error
        }
      } else {
        const phoneValidation = validateCanadianPhone(formData.contact)
        if (!phoneValidation.valid) {
          tempErrors.contact = phoneValidation.error
        }
      }

      setErrors(tempErrors)
      return
    }

    setIsSubmitting(true)

    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
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
            <div className="card">
              <h2 className="text-2xl font-semibold mb-6">Contactez-nous</h2>

              {submitted ? (
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-sar-green rounded-full flex items-center justify-center mx-auto mb-4">
                    <Send className="text-white" size={32} />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">Message envoye!</h3>
                  <p className="text-gray-600">Nous vous repondrons dans les plus brefs delais.</p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-6">
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
                    <label className="block text-sm font-medium mb-2">Méthode de contact préférée</label>
                    <select
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sar-green focus:border-transparent"
                      value={formData.contactMethod}
                      onChange={(e) => {
                        setFormData({ ...formData, contactMethod: e.target.value, contact: '' })
                        setErrors({})
                        setTouched({ ...touched, contact: false })
                      }}
                    >
                      <option value="email">Courriel</option>
                      <option value="phone">Téléphone</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">
                      {formData.contactMethod === 'email' ? 'Adresse courriel' : 'Numéro de téléphone (Canada)'} *
                    </label>
                    <input
                      type={formData.contactMethod === 'email' ? 'email' : 'tel'}
                      required
                      className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-sar-green focus:border-transparent ${
                        touched.contact && errors.contact
                          ? 'border-red-500 bg-red-50'
                          : 'border-gray-300'
                      }`}
                      placeholder={formData.contactMethod === 'email' ? 'votre@email.com' : '(514) 123-4567'}
                      value={formData.contact}
                      onChange={(e) => handleChange('contact', e.target.value)}
                      onBlur={() => handleBlur('contact')}
                    />
                    {touched.contact && errors.contact && (
                      <div className="mt-2 flex items-center gap-2 text-red-600 text-sm">
                        <AlertCircle size={16} />
                        <span>{errors.contact}</span>
                      </div>
                    )}
                    {formData.contactMethod === 'phone' && !errors.contact && formData.contact && (
                      <p className="mt-2 text-sm text-gray-500">
                        📞 Formats acceptés: 514-123-4567, (514) 123-4567, +1 514 123 4567
                      </p>
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
              )}
            </div>
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
