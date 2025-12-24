'use client'

import { useState } from 'react'
import { Phone, Mail, MapPin, Clock, Send, MessageCircle, AlertCircle, Calendar, CreditCard, FileText, HeartHandshake, ArrowRight, ChevronLeft, Check, Shield } from 'lucide-react'
import Link from 'next/link'
import ContactModal from '@/components/ContactModal'
import { validateEmail, validateCanadianPhone, formatCanadianPhone } from '@/lib/validators'

export default function ContactPage() {
  const [selectedAction, setSelectedAction] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    nom: '',
    email: '',
    telephone: '',
    message: '',
    contactMethod: 'email',
    contact: ''
  })
  const [errors, setErrors] = useState<{
    nom?: string
    email?: string
    telephone?: string
    message?: string
    contact?: string
  }>({})
  const [touched, setTouched] = useState<{
    nom?: boolean
    email?: boolean
    telephone?: boolean
    message?: boolean
    contact?: boolean
  }>({})
  const [submitted, setSubmitted] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isContactModalOpen, setIsContactModalOpen] = useState(false)

  const actions = [
    {
      id: 'report_paiement',
      icon: <Calendar className="w-8 h-8" />,
      title: 'Reporter un paiement',
      description: 'Demander un delai pour votre prochain paiement',
      color: 'from-blue-500 to-blue-600'
    },
    {
      id: 'reduire_paiement',
      icon: <CreditCard className="w-8 h-8" />,
      title: 'Reduire mes paiements',
      description: 'Ajuster le montant de vos versements',
      color: 'from-emerald-500 to-emerald-600'
    },
    {
      id: 'changement_info',
      icon: <MapPin className="w-8 h-8" />,
      title: 'Signaler un changement',
      description: 'Adresse, courriel, telephone, etc.',
      color: 'from-violet-500 to-violet-600'
    },
    {
      id: 'releve_compte',
      icon: <FileText className="w-8 h-8" />,
      title: 'Releve ou solde de compte',
      description: 'Obtenir votre solde actuel ou un releve',
      color: 'from-amber-500 to-amber-600'
    },
    {
      id: 'arrangement',
      icon: <HeartHandshake className="w-8 h-8" />,
      title: 'Arrangement de paiement',
      description: 'Trouver une solution pour un compte en souffrance',
      color: 'from-rose-500 to-rose-600'
    },
    {
      id: 'autre_question',
      icon: <MessageCircle className="w-8 h-8" />,
      title: 'Autre question',
      description: 'Discuter avec le service a la clientele',
      color: 'from-gray-500 to-gray-600'
    }
  ]

  // Validation temps réel
  const validateField = (field: 'nom' | 'email' | 'telephone' | 'message' | 'contact') => {
    const newErrors = { ...errors }

    if (field === 'nom') {
      if (!formData.nom || formData.nom.trim().length < 2) {
        newErrors.nom = 'Le nom doit contenir au moins 2 caractères'
      } else {
        delete newErrors.nom
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

    if (field === 'telephone') {
      const phoneValidation = validateCanadianPhone(formData.telephone)
      if (!phoneValidation.valid) {
        newErrors.telephone = phoneValidation.error
      } else {
        delete newErrors.telephone
      }
    }

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

  const handleBlur = (field: 'nom' | 'email' | 'telephone' | 'message' | 'contact') => {
    setTouched({ ...touched, [field]: true })
    validateField(field)
  }

  const handleChange = (field: 'nom' | 'email' | 'telephone' | 'message' | 'contact', value: string) => {
    setFormData({ ...formData, [field]: value })
    if (field !== 'message' && touched[field as 'nom' | 'email' | 'telephone' | 'contact']) {
      setTimeout(() => validateField(field as 'nom' | 'email' | 'telephone' | 'message' | 'contact'), 0)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Si une action est sélectionnée, utiliser la validation complète
    if (selectedAction) {
      // Marquer tous les champs comme touchés
      setTouched({ nom: true, email: true, telephone: true })

      // Valider tous les champs
      validateField('nom')
      validateField('email')
      validateField('telephone')

      // Vérifier s'il y a des erreurs
      const tempErrors: typeof errors = {}

      if (!formData.nom || formData.nom.trim().length < 2) {
        tempErrors.nom = 'Le nom doit contenir au moins 2 caractères'
      }

      const emailValidation = validateEmail(formData.email)
      if (!emailValidation.valid) {
        tempErrors.email = emailValidation.error
      }

      const phoneValidation = validateCanadianPhone(formData.telephone)
      if (!phoneValidation.valid) {
        tempErrors.telephone = phoneValidation.error
      }

      if (Object.keys(tempErrors).length > 0) {
        setErrors(tempErrors)
        return
      }

      setIsSubmitting(true)

      try {
        const actionLabel = actions.find(a => a.id === selectedAction)?.title || selectedAction

        const response = await fetch('/api/contact-analyse', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            nom: formData.nom,
            email: formData.email,
            telephone: formData.telephone,
            question: `Nous Joindre - ${actionLabel}`,
            questionAutre: formData.message || '',
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
    } else {
      // Ancien formulaire simple
      setTouched({ message: true, contact: true })
      validateField('message')
      validateField('contact')

      const hasErrors = Object.keys(errors).length > 0 ||
                        !formData.message ||
                        formData.message.trim().length < 10 ||
                        !formData.contact

      if (hasErrors) {
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
            message: formData.message,
            contactMethod: formData.contactMethod,
            contact: formData.contact,
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
  }

  const resetForm = () => {
    setSelectedAction(null)
    setFormData({ nom: '', email: '', telephone: '', message: '', contactMethod: 'email', contact: '' })
    setErrors({})
    setTouched({})
    setSubmitted(false)
  }

  return (
    <div className="py-16">
      <div className="container mx-auto px-4">
        <h1 className="section-title text-center">Nous joindre</h1>
        <p className="section-subtitle text-center">Nous sommes la pour vous ecouter sans jugement</p>

        {/* Options d'actions - Affichées si aucune action n'est sélectionnée et formulaire non soumis */}
        {!selectedAction && !submitted && (
          <div className="max-w-6xl mx-auto mb-12">
            <h2 className="text-2xl font-bold text-center mb-2 text-gray-800">Comment pouvons-nous vous aider?</h2>
            <p className="text-center text-gray-600 mb-8">Selectionnez une option pour nous contacter</p>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
              {actions.map((action) => (
                <button
                  key={action.id}
                  onClick={() => setSelectedAction(action.id)}
                  className="group relative overflow-hidden rounded-3xl p-6 md:p-8 text-left transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl"
                  style={{
                    background: 'rgba(255, 255, 255, 0.7)',
                    backdropFilter: 'blur(20px)',
                    border: '1px solid rgba(255, 255, 255, 0.8)',
                    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.08), inset 0 1px 1px rgba(255, 255, 255, 0.9)'
                  }}
                >
                  {/* Gradient overlay on hover */}
                  <div className={`absolute inset-0 bg-gradient-to-br ${action.color} opacity-0 group-hover:opacity-10 transition-opacity duration-300`} />

                  {/* Icon */}
                  <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${action.color} flex items-center justify-center text-white mb-5 shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                    {action.icon}
                  </div>

                  {/* Content */}
                  <h3 className="text-xl font-bold text-gray-800 mb-2 group-hover:text-gray-900">
                    {action.title}
                  </h3>
                  <p className="text-gray-500 text-sm mb-4">
                    {action.description}
                  </p>

                  {/* Arrow */}
                  <div className="flex items-center text-sar-green font-semibold text-sm">
                    <span>Selectionner</span>
                    <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                  </div>

                  {/* Shine effect */}
                  <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white to-transparent opacity-50" />
                </button>
              ))}
            </div>
          </div>
        )}

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
            {submitted ? (
              /* Success Message */
              <div
                className="rounded-3xl p-10 text-center"
                style={{
                  background: 'rgba(255, 255, 255, 0.8)',
                  backdropFilter: 'blur(20px)',
                  border: '1px solid rgba(255, 255, 255, 0.9)',
                  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)'
                }}
              >
                <div className="w-20 h-20 bg-gradient-to-br from-sar-green to-sar-green-dark rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl">
                  <Check className="w-10 h-10 text-white" strokeWidth={3} />
                </div>

                <h2 className="text-2xl font-bold text-gray-800 mb-3">
                  Demande envoyee!
                </h2>
                <p className="text-gray-600 mb-8">
                  Notre equipe a bien recu votre demande et vous contactera dans les plus brefs delais.
                </p>

                <button
                  onClick={resetForm}
                  className="px-8 py-4 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition-colors"
                >
                  Faire une autre demande
                </button>
              </div>
            ) : selectedAction ? (
              /* Form avec action sélectionnée */
              <div
                className="rounded-3xl p-8 md:p-10"
                style={{
                  background: 'rgba(255, 255, 255, 0.8)',
                  backdropFilter: 'blur(20px)',
                  border: '1px solid rgba(255, 255, 255, 0.9)',
                  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1), inset 0 1px 1px rgba(255, 255, 255, 0.9)'
                }}
              >
                <button
                  onClick={resetForm}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg mb-6 transition-colors font-medium"
                >
                  <ChevronLeft className="w-5 h-5" />
                  Retour aux options
                </button>

                {/* Selected action header */}
                <div className="flex items-center gap-4 mb-8">
                  <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${actions.find(a => a.id === selectedAction)?.color} flex items-center justify-center text-white shadow-lg`}>
                    {actions.find(a => a.id === selectedAction)?.icon}
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-800">
                      {actions.find(a => a.id === selectedAction)?.title}
                    </h2>
                    <p className="text-gray-500 text-sm">
                      {actions.find(a => a.id === selectedAction)?.description}
                    </p>
                  </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Nom complet *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Votre nom"
                      value={formData.nom}
                      onChange={(e) => handleChange('nom', e.target.value)}
                      onBlur={() => handleBlur('nom')}
                      className={`w-full px-5 py-4 bg-white/80 border-2 rounded-xl text-gray-800 placeholder-gray-400 focus:border-sar-green focus:ring-4 focus:ring-sar-green/10 outline-none transition-all ${
                        touched.nom && errors.nom
                          ? 'border-red-500 bg-red-50'
                          : 'border-gray-100'
                      }`}
                    />
                    {touched.nom && errors.nom && (
                      <div className="mt-2 flex items-center gap-2 text-red-600 text-sm">
                        <AlertCircle size={14} />
                        <span>{errors.nom}</span>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Courriel *
                    </label>
                    <input
                      type="email"
                      required
                      placeholder="votre@courriel.com"
                      value={formData.email}
                      onChange={(e) => handleChange('email', e.target.value)}
                      onBlur={() => handleBlur('email')}
                      className={`w-full px-5 py-4 bg-white/80 border-2 rounded-xl text-gray-800 placeholder-gray-400 focus:border-sar-green focus:ring-4 focus:ring-sar-green/10 outline-none transition-all ${
                        touched.email && errors.email
                          ? 'border-red-500 bg-red-50'
                          : 'border-gray-100'
                      }`}
                    />
                    {touched.email && errors.email && (
                      <div className="mt-2 flex items-center gap-2 text-red-600 text-sm">
                        <AlertCircle size={14} />
                        <span>{errors.email}</span>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Téléphone (Canada) *
                    </label>
                    <input
                      type="tel"
                      required
                      placeholder="(514) 123-4567"
                      value={formData.telephone}
                      onChange={(e) => handleChange('telephone', e.target.value)}
                      onBlur={() => handleBlur('telephone')}
                      className={`w-full px-5 py-4 bg-white/80 border-2 rounded-xl text-gray-800 placeholder-gray-400 focus:border-sar-green focus:ring-4 focus:ring-sar-green/10 outline-none transition-all ${
                        touched.telephone && errors.telephone
                          ? 'border-red-500 bg-red-50'
                          : 'border-gray-100'
                      }`}
                    />
                    {touched.telephone && errors.telephone && (
                      <div className="mt-2 flex items-center gap-2 text-red-600 text-sm">
                        <AlertCircle size={14} />
                        <span>{errors.telephone}</span>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Message ou details (optionnel)
                    </label>
                    <textarea
                      rows={4}
                      placeholder="Decrivez votre situation ou ajoutez des details..."
                      value={formData.message}
                      onChange={(e) => handleChange('message', e.target.value)}
                      className="w-full px-5 py-4 bg-white/80 border-2 border-gray-100 rounded-xl text-gray-800 placeholder-gray-400 focus:border-sar-green focus:ring-4 focus:ring-sar-green/10 outline-none transition-all resize-none"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting || !formData.nom || !formData.email || !formData.telephone}
                    className="w-full py-5 rounded-xl font-bold text-lg bg-gradient-to-r from-sar-green to-sar-green-dark text-white shadow-xl hover:shadow-2xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {isSubmitting ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Envoi en cours...
                      </>
                    ) : (
                      <>
                        Envoyer ma demande
                        <ArrowRight className="w-5 h-5" />
                      </>
                    )}
                  </button>

                  <p className="text-center text-gray-400 text-sm flex items-center justify-center gap-2">
                    <Shield className="w-4 h-4" />
                    Vos informations sont protegees
                  </p>
                </form>
              </div>
            ) : (
              /* Formulaire simple (ancien) */
              <div className="card">
                <h2 className="text-2xl font-semibold mb-6">Contactez-nous</h2>
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
