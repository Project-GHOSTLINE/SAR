'use client'

import React, { useState } from 'react'
import {
  Calendar, CreditCard, MapPin, FileText, HeartHandshake,
  ArrowRight, ChevronLeft, Check, Shield,
  Home, MessageCircle, AlertCircle
} from 'lucide-react'
import { validateEmail, validateCanadianPhone } from '@/lib/validators'

export default function ClientPortal() {
  const [selectedAction, setSelectedAction] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    nom: '',
    email: '',
    telephone: '',
    message: ''
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
  const validateField = (field: 'nom' | 'email' | 'telephone') => {
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

    setErrors(newErrors)
  }

  const handleBlur = (field: 'nom' | 'email' | 'telephone') => {
    setTouched({ ...touched, [field]: true })
    validateField(field)
  }

  const handleChange = (field: 'nom' | 'email' | 'telephone' | 'message', value: string) => {
    setFormData({ ...formData, [field]: value })
    if (field !== 'message' && touched[field as 'nom' | 'email' | 'telephone']) {
      setTimeout(() => validateField(field as 'nom' | 'email' | 'telephone'), 0)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

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

    if (Object.keys(tempErrors).length > 0 || !selectedAction) {
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
          question: `Espace Client - ${actionLabel}`,
          questionAutre: formData.message || '',
          source: 'espace-client',
          clientMetadata: {
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            screenResolution: `${window.screen.width}x${window.screen.height}`
          }
        })
      })

      if (response.ok) {
        setIsSuccess(true)
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
    setSelectedAction(null)
    setFormData({ nom: '', email: '', telephone: '', message: '' })
    setErrors({})
    setTouched({})
    setIsSuccess(false)
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white -mt-[104px]">
      {/* Header avec logo */}
      <div className="bg-white border-b border-gray-100 py-4 px-4">
        <div className="container mx-auto max-w-4xl">
          <a href="https://solutionargentrapide.ca" className="inline-block">
            <span className="text-2xl font-bold text-sar-green">Solution</span>
            <span className="text-2xl font-bold text-sar-gold ml-1">Argent Rapide</span>
          </a>
        </div>
      </div>

      {/* Hero Section */}
      <section className="pt-6 pb-12 md:pb-16 px-4">
        <div className="container mx-auto max-w-4xl">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-6">
            <a href="https://solutionargentrapide.ca" className="flex items-center gap-1 hover:text-sar-green transition-colors">
              <Home className="w-4 h-4" />
              Accueil
            </a>
            <span>/</span>
            <a href="https://client.solutionargentrapide.ca" className="text-gray-800 font-medium hover:text-sar-green transition-colors">
              Espace Client
            </a>
          </div>

          <div className="text-center mb-12">
            <h1 className="text-3xl md:text-5xl font-bold text-gray-900 mb-4">
              Espace Client
            </h1>
            <p className="text-gray-600 text-lg max-w-xl mx-auto">
              Gerez votre compte facilement. Selectionnez une option ci-dessous.
            </p>
          </div>

          {!selectedAction && !isSuccess && (
            /* Action Cards - Liquid Glass Style */
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
          )}

          {selectedAction && !isSuccess && (
            /* Form */
            <div
              className="max-w-lg mx-auto rounded-3xl p-8 md:p-10"
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
                    onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
                    className="w-full px-5 py-4 bg-white/80 border-2 border-gray-100 rounded-xl text-gray-800 placeholder-gray-400 focus:border-sar-green focus:ring-4 focus:ring-sar-green/10 outline-none transition-all"
                  />
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
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-5 py-4 bg-white/80 border-2 border-gray-100 rounded-xl text-gray-800 placeholder-gray-400 focus:border-sar-green focus:ring-4 focus:ring-sar-green/10 outline-none transition-all"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Telephone *
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="514-555-1234"
                    value={formData.telephone}
                    onChange={(e) => setFormData({ ...formData, telephone: e.target.value })}
                    className="w-full px-5 py-4 bg-white/80 border-2 border-gray-100 rounded-xl text-gray-800 placeholder-gray-400 focus:border-sar-green focus:ring-4 focus:ring-sar-green/10 outline-none transition-all"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Message ou details (optionnel)
                  </label>
                  <textarea
                    rows={4}
                    placeholder="Decrivez votre situation ou ajoutez des details..."
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
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
          )}

          {isSuccess && (
            /* Success Message */
            <div
              className="max-w-lg mx-auto rounded-3xl p-10 text-center"
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
          )}
        </div>
      </section>

    </div>
  )
}
