'use client'

import { useState } from 'react'
import { CheckCircle, ArrowRight, ArrowLeft, User, Briefcase, DollarSign, FileText } from 'lucide-react'

const steps = [
  { id: 1, title: 'Informations personnelles', icon: User },
  { id: 2, title: 'Emploi', icon: Briefcase },
  { id: 3, title: 'Montant souhaite', icon: DollarSign },
  { id: 4, title: 'Confirmation', icon: FileText },
]

export default function CreditRequestPage() {
  const [currentStep, setCurrentStep] = useState(1)
  const [submitted, setSubmitted] = useState(false)
  const [formData, setFormData] = useState({
    // Personal info
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    dateOfBirth: '',
    address: '',
    city: '',
    postalCode: '',
    // Employment
    employerName: '',
    employerPhone: '',
    jobTitle: '',
    employmentDuration: '',
    payFrequency: '',
    // Loan
    loanAmount: '',
    loanPurpose: '',
    // Agreement
    acceptTerms: false,
  })

  const updateFormData = (field: string, value: string | boolean) => {
    setFormData({ ...formData, [field]: value })
  }

  const nextStep = () => {
    if (currentStep < 4) setCurrentStep(currentStep + 1)
  }

  const prevStep = () => {
    if (currentStep > 1) setCurrentStep(currentStep - 1)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    // TODO: Integrate with Supabase
    setSubmitted(true)
  }

  if (submitted) {
    return (
      <div className="py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-2xl mx-auto text-center">
            <div className="w-20 h-20 bg-sar-green rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="text-white" size={48} />
            </div>
            <h1 className="text-3xl font-bold mb-4">Demande envoyee avec succes!</h1>
            <p className="text-gray-600 mb-6">
              Votre demande a ete recue. Vous recevrez un courriel de confirmation sous peu.
              Notre equipe analysera votre dossier et vous contactera dans les 24 heures.
            </p>
            <div className="card">
              <h3 className="font-semibold mb-4">Prochaines etapes:</h3>
              <ol className="text-left space-y-3">
                <li className="flex items-start gap-3">
                  <span className="w-6 h-6 bg-sar-green text-white rounded-full flex items-center justify-center text-sm flex-shrink-0">1</span>
                  <span>Verifiez votre boite courriel pour le lien de verification bancaire (IBV)</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="w-6 h-6 bg-sar-green text-white rounded-full flex items-center justify-center text-sm flex-shrink-0">2</span>
                  <span>Completez la verification bancaire pour accelerer le processus</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="w-6 h-6 bg-sar-green text-white rounded-full flex items-center justify-center text-sm flex-shrink-0">3</span>
                  <span>Si approuve, signez le contrat electroniquement</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="w-6 h-6 bg-sar-green text-white rounded-full flex items-center justify-center text-sm flex-shrink-0">4</span>
                  <span>Recevez vos fonds par virement Interac</span>
                </li>
              </ol>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="py-16 bg-sar-grey min-h-screen">
      <div className="container mx-auto px-4">
        <h1 className="section-title text-center">Demandez votre credit</h1>
        <p className="section-subtitle text-center">Remplissez le formulaire en quelques minutes</p>

        {/* Progress Steps */}
        <div className="max-w-3xl mx-auto mb-8">
          <div className="flex justify-between">
            {steps.map((step) => (
              <div key={step.id} className="flex flex-col items-center">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-2 ${
                  currentStep >= step.id ? 'bg-sar-green text-white' : 'bg-gray-300 text-gray-600'
                }`}>
                  <step.icon size={24} />
                </div>
                <span className={`text-xs text-center hidden sm:block ${
                  currentStep >= step.id ? 'text-sar-green font-semibold' : 'text-gray-500'
                }`}>
                  {step.title}
                </span>
              </div>
            ))}
          </div>
          <div className="mt-4 h-2 bg-gray-300 rounded-full">
            <div
              className="h-full bg-sar-green rounded-full transition-all duration-300"
              style={{ width: `${((currentStep - 1) / 3) * 100}%` }}
            />
          </div>
        </div>

        {/* Form */}
        <div className="max-w-2xl mx-auto">
          <form onSubmit={handleSubmit}>
            <div className="card">
              {/* Step 1: Personal Info */}
              {currentStep === 1 && (
                <div className="space-y-6">
                  <h2 className="text-xl font-semibold mb-4">Informations personnelles</h2>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">Prenom *</label>
                      <input
                        type="text"
                        required
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sar-green focus:border-transparent"
                        value={formData.firstName}
                        onChange={(e) => updateFormData('firstName', e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Nom *</label>
                      <input
                        type="text"
                        required
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sar-green focus:border-transparent"
                        value={formData.lastName}
                        onChange={(e) => updateFormData('lastName', e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">Courriel *</label>
                      <input
                        type="email"
                        required
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sar-green focus:border-transparent"
                        value={formData.email}
                        onChange={(e) => updateFormData('email', e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Telephone *</label>
                      <input
                        type="tel"
                        required
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sar-green focus:border-transparent"
                        placeholder="514-XXX-XXXX"
                        value={formData.phone}
                        onChange={(e) => updateFormData('phone', e.target.value)}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Date de naissance *</label>
                    <input
                      type="date"
                      required
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sar-green focus:border-transparent"
                      value={formData.dateOfBirth}
                      onChange={(e) => updateFormData('dateOfBirth', e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Adresse *</label>
                    <input
                      type="text"
                      required
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sar-green focus:border-transparent"
                      value={formData.address}
                      onChange={(e) => updateFormData('address', e.target.value)}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">Ville *</label>
                      <input
                        type="text"
                        required
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sar-green focus:border-transparent"
                        value={formData.city}
                        onChange={(e) => updateFormData('city', e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Code postal *</label>
                      <input
                        type="text"
                        required
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sar-green focus:border-transparent"
                        placeholder="H1A 1A1"
                        value={formData.postalCode}
                        onChange={(e) => updateFormData('postalCode', e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Step 2: Employment */}
              {currentStep === 2 && (
                <div className="space-y-6">
                  <h2 className="text-xl font-semibold mb-4">Informations sur l&apos;emploi</h2>

                  <div>
                    <label className="block text-sm font-medium mb-2">Nom de l&apos;employeur *</label>
                    <input
                      type="text"
                      required
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sar-green focus:border-transparent"
                      value={formData.employerName}
                      onChange={(e) => updateFormData('employerName', e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Telephone de l&apos;employeur *</label>
                    <input
                      type="tel"
                      required
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sar-green focus:border-transparent"
                      value={formData.employerPhone}
                      onChange={(e) => updateFormData('employerPhone', e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Titre du poste *</label>
                    <input
                      type="text"
                      required
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sar-green focus:border-transparent"
                      value={formData.jobTitle}
                      onChange={(e) => updateFormData('jobTitle', e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Duree de l&apos;emploi *</label>
                    <select
                      required
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sar-green focus:border-transparent"
                      value={formData.employmentDuration}
                      onChange={(e) => updateFormData('employmentDuration', e.target.value)}
                    >
                      <option value="">Selectionnez...</option>
                      <option value="3-6">3 a 6 mois</option>
                      <option value="6-12">6 mois a 1 an</option>
                      <option value="1-2">1 a 2 ans</option>
                      <option value="2-5">2 a 5 ans</option>
                      <option value="5+">Plus de 5 ans</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Frequence de paie *</label>
                    <select
                      required
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sar-green focus:border-transparent"
                      value={formData.payFrequency}
                      onChange={(e) => updateFormData('payFrequency', e.target.value)}
                    >
                      <option value="">Selectionnez...</option>
                      <option value="weekly">Hebdomadaire</option>
                      <option value="biweekly">Aux deux semaines</option>
                      <option value="semimonthly">Bi-mensuel</option>
                      <option value="monthly">Mensuel</option>
                    </select>
                  </div>
                </div>
              )}

              {/* Step 3: Loan Details */}
              {currentStep === 3 && (
                <div className="space-y-6">
                  <h2 className="text-xl font-semibold mb-4">Montant souhaite</h2>

                  <div>
                    <label className="block text-sm font-medium mb-2">Montant du pret desire *</label>
                    <select
                      required
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sar-green focus:border-transparent"
                      value={formData.loanAmount}
                      onChange={(e) => updateFormData('loanAmount', e.target.value)}
                    >
                      <option value="">Selectionnez...</option>
                      <option value="300">300$</option>
                      <option value="500">500$</option>
                      <option value="750">750$</option>
                      <option value="1000">1 000$</option>
                      <option value="1500">1 500$</option>
                      <option value="2000">2 000$</option>
                      <option value="2500">2 500$</option>
                      <option value="3000">3 000$</option>
                      <option value="4000">4 000$</option>
                      <option value="5000">5 000$</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Raison du pret</label>
                    <select
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sar-green focus:border-transparent"
                      value={formData.loanPurpose}
                      onChange={(e) => updateFormData('loanPurpose', e.target.value)}
                    >
                      <option value="">Selectionnez...</option>
                      <option value="urgence">Urgence financiere</option>
                      <option value="factures">Factures a payer</option>
                      <option value="reparation">Reparation auto/maison</option>
                      <option value="medical">Frais medicaux/dentaires</option>
                      <option value="consolidation">Consolidation de dettes</option>
                      <option value="autre">Autre</option>
                    </select>
                  </div>

                  <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                    <p className="text-sm text-yellow-800">
                      <strong>Rappel:</strong> Le taux d&apos;interet annuel (TAEG) est de 18,99%. Des frais d&apos;adhesion hebdomadaires de 22,50$ s&apos;appliquent tant qu&apos;un solde existe.
                    </p>
                  </div>
                </div>
              )}

              {/* Step 4: Confirmation */}
              {currentStep === 4 && (
                <div className="space-y-6">
                  <h2 className="text-xl font-semibold mb-4">Confirmation</h2>

                  <div className="space-y-4">
                    <div className="p-4 bg-sar-grey rounded-lg">
                      <h3 className="font-semibold mb-2">Informations personnelles</h3>
                      <p>{formData.firstName} {formData.lastName}</p>
                      <p>{formData.email}</p>
                      <p>{formData.phone}</p>
                      <p>{formData.address}, {formData.city}, {formData.postalCode}</p>
                    </div>

                    <div className="p-4 bg-sar-grey rounded-lg">
                      <h3 className="font-semibold mb-2">Emploi</h3>
                      <p>{formData.jobTitle} chez {formData.employerName}</p>
                      <p>Duree: {formData.employmentDuration}</p>
                    </div>

                    <div className="p-4 bg-sar-grey rounded-lg">
                      <h3 className="font-semibold mb-2">Pret demande</h3>
                      <p className="text-2xl font-bold text-sar-green">{formData.loanAmount}$</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      id="terms"
                      required
                      className="mt-1"
                      checked={formData.acceptTerms}
                      onChange={(e) => updateFormData('acceptTerms', e.target.checked)}
                    />
                    <label htmlFor="terms" className="text-sm text-gray-600">
                      J&apos;accepte les conditions d&apos;utilisation et je comprends que cette demande sera analysee par l&apos;equipe de Solution Argent Rapide. Je consens a la verification de mon emploi et a la verification bancaire instantanee (IBV).
                    </label>
                  </div>
                </div>
              )}

              {/* Navigation Buttons */}
              <div className="flex justify-between mt-8">
                {currentStep > 1 ? (
                  <button
                    type="button"
                    onClick={prevStep}
                    className="flex items-center gap-2 px-6 py-3 text-gray-600 hover:text-gray-800"
                  >
                    <ArrowLeft size={18} />
                    Precedent
                  </button>
                ) : (
                  <div />
                )}

                {currentStep < 4 ? (
                  <button
                    type="button"
                    onClick={nextStep}
                    className="btn-primary flex items-center gap-2"
                  >
                    Suivant
                    <ArrowRight size={18} />
                  </button>
                ) : (
                  <button
                    type="submit"
                    className="btn-primary flex items-center gap-2"
                    disabled={!formData.acceptTerms}
                  >
                    Soumettre ma demande
                    <CheckCircle size={18} />
                  </button>
                )}
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
