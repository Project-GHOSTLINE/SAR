'use client'

import { useState } from 'react'
import { ArrowLeft } from 'lucide-react'
import { useRouter } from 'next/navigation'

export default function TestMargillPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)

  // Form state
  const [formData, setFormData] = useState({
    // Montant
    loan_amount: '500',

    // Identité
    first_name: 'Fred',
    last_name: 'Rosa',
    email: 'info@solutionargentrapide.ca',
    email_confirm: 'info@solutionargentrapide.ca',

    // Téléphones
    phone_1: '514',
    phone_2: '123',
    phone_3: '4567',
    phone_work_1: '514',
    phone_work_2: '987',
    phone_work_3: '6543',

    // Date de naissance
    birth_year: '1990',
    birth_month: '05',
    birth_day: '15',

    // Informations financières
    income_source: 'Emploi à temps plein',
    time_at_job: 'Plus de 2 ans',
    number_of_loans: '0',
    stop_payments_nsf: 'Non',
    consumer_proposal: 'Non',
    canadian_resident: 'Oui',

    // Adresse
    address_line1: '115 Drumlin Circle',
    address_line2: '',
    address_city: 'Vaughan',
    address_province: 'Ontario',
    address_postal: 'L4K 3E6',

    // Emploi
    employer_name: 'Solution Argent Rapide',
    hire_year: '2022',
    hire_month: '06',
    hire_day: '09',

    // Autres
    reason_for_loan: 'Dépenses imprévues',
    how_did_you_hear: 'Recherche Google',

    // Optionnels (absents du formulaire iframe)
    monthly_income: '',
    education_level: '',
    credit_score: '',
    sin: ''
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setResult(null)

    try {
      const response = await fetch('/api/test-margill/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      const data = await response.json()
      setResult(data)
    } catch (error) {
      setResult({
        success: false,
        error: 'Erreur de connexion',
        details: error instanceof Error ? error.message : 'Unknown error'
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.push('/admin')}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft size={20} />
            Retour admin
          </button>
          <h1 className="text-3xl font-bold text-gray-900">🧪 Test Formulaire Margill</h1>
          <p className="text-gray-600 mt-2">
            Formulaire de test pour vérifier le payload JSON envoyé à Margill
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Montant */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">💰 Montant du Prêt</h2>
            <div className="grid grid-cols-4 gap-2">
              {['300', '500', '750', '1000', '1250', '1500', '1750', '2000', '2500', '3000', '4000', '5000', '6000'].map(amount => (
                <button
                  key={amount}
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, loan_amount: amount }))}
                  className={`py-2 px-4 rounded border ${
                    formData.loan_amount === amount
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-gray-700 border-gray-300 hover:border-blue-500'
                  }`}
                >
                  {amount}$
                </button>
              ))}
            </div>
            <p className="mt-2 text-sm text-gray-600">Montant sélectionné: <strong>{formData.loan_amount}$</strong></p>
          </div>

          {/* Identité */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">👤 Identité</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Prénom *</label>
                <input
                  type="text"
                  name="first_name"
                  value={formData.first_name}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nom *</label>
                <input
                  type="text"
                  name="last_name"
                  value={formData.last_name}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Confirmer Email *</label>
                <input
                  type="email"
                  name="email_confirm"
                  value={formData.email_confirm}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
            </div>
          </div>

          {/* Date de naissance */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">📅 Date de Naissance</h2>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Année</label>
                <input
                  type="text"
                  name="birth_year"
                  value={formData.birth_year}
                  onChange={handleChange}
                  placeholder="1990"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Mois</label>
                <select
                  name="birth_month"
                  value={formData.birth_month}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="01">Janvier</option>
                  <option value="02">Février</option>
                  <option value="03">Mars</option>
                  <option value="04">Avril</option>
                  <option value="05">Mai</option>
                  <option value="06">Juin</option>
                  <option value="07">Juillet</option>
                  <option value="08">Août</option>
                  <option value="09">Septembre</option>
                  <option value="10">Octobre</option>
                  <option value="11">Novembre</option>
                  <option value="12">Décembre</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Jour</label>
                <input
                  type="text"
                  name="birth_day"
                  value={formData.birth_day}
                  onChange={handleChange}
                  placeholder="15"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
            </div>
          </div>

          {/* Téléphones */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">📞 Téléphones</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Téléphone Principal *</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    name="phone_1"
                    value={formData.phone_1}
                    onChange={handleChange}
                    placeholder="514"
                    maxLength={3}
                    className="w-20 px-3 py-2 border border-gray-300 rounded-md"
                  />
                  <span className="py-2">-</span>
                  <input
                    type="text"
                    name="phone_2"
                    value={formData.phone_2}
                    onChange={handleChange}
                    placeholder="123"
                    maxLength={3}
                    className="w-20 px-3 py-2 border border-gray-300 rounded-md"
                  />
                  <span className="py-2">-</span>
                  <input
                    type="text"
                    name="phone_3"
                    value={formData.phone_3}
                    onChange={handleChange}
                    placeholder="4567"
                    maxLength={4}
                    className="w-24 px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Téléphone Travail</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    name="phone_work_1"
                    value={formData.phone_work_1}
                    onChange={handleChange}
                    placeholder="514"
                    maxLength={3}
                    className="w-20 px-3 py-2 border border-gray-300 rounded-md"
                  />
                  <span className="py-2">-</span>
                  <input
                    type="text"
                    name="phone_work_2"
                    value={formData.phone_work_2}
                    onChange={handleChange}
                    placeholder="987"
                    maxLength={3}
                    className="w-20 px-3 py-2 border border-gray-300 rounded-md"
                  />
                  <span className="py-2">-</span>
                  <input
                    type="text"
                    name="phone_work_3"
                    value={formData.phone_work_3}
                    onChange={handleChange}
                    placeholder="6543"
                    maxLength={4}
                    className="w-24 px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Informations Financières */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">💼 Informations Financières</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Source de revenu</label>
                <select
                  name="income_source"
                  value={formData.income_source}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="">Sélectionner...</option>
                  <option value="Emploi à temps plein">Emploi à temps plein</option>
                  <option value="Emploi à temps partiel">Emploi à temps partiel</option>
                  <option value="Travailleur autonome">Travailleur autonome</option>
                  <option value="Retraite">Retraite</option>
                  <option value="Aide sociale">Aide sociale</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ancienneté emploi actuel</label>
                <select
                  name="time_at_job"
                  value={formData.time_at_job}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="">Sélectionner...</option>
                  <option value="Moins de 6 mois">Moins de 6 mois</option>
                  <option value="6 mois à 1 an">6 mois à 1 an</option>
                  <option value="1 à 2 ans">1 à 2 ans</option>
                  <option value="Plus de 2 ans">Plus de 2 ans</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre de prêts actuels</label>
                <select
                  name="number_of_loans"
                  value={formData.number_of_loans}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="0">0</option>
                  <option value="1">1</option>
                  <option value="2">2</option>
                  <option value="3+">3+</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Arrêts de paiement/NSF (3 mois)</label>
                <select
                  name="stop_payments_nsf"
                  value={formData.stop_payments_nsf}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="Non">Non</option>
                  <option value="Oui">Oui</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Proposition/Faillite</label>
                <select
                  name="consumer_proposal"
                  value={formData.consumer_proposal}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="Non">Non</option>
                  <option value="Oui">Oui</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Citoyen/Résident permanent *</label>
                <select
                  name="canadian_resident"
                  value={formData.canadian_resident}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="Oui">Oui</option>
                  <option value="Non">Non</option>
                </select>
              </div>
            </div>
          </div>

          {/* Adresse */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">🏠 Adresse</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Adresse ligne 1</label>
                <input
                  type="text"
                  name="address_line1"
                  value={formData.address_line1}
                  onChange={handleChange}
                  placeholder="115 Drumlin Circle"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Appartement (optionnel)</label>
                <input
                  type="text"
                  name="address_line2"
                  value={formData.address_line2}
                  onChange={handleChange}
                  placeholder="Apt. 2"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Ville</label>
                  <input
                    type="text"
                    name="address_city"
                    value={formData.address_city}
                    onChange={handleChange}
                    placeholder="Vaughan"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Province</label>
                  <select
                    name="address_province"
                    value={formData.address_province}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  >
                    <option value="Ontario">Ontario</option>
                    <option value="Québec">Québec</option>
                    <option value="Alberta">Alberta</option>
                    <option value="Colombie-Britannique">Colombie-Britannique</option>
                    <option value="Manitoba">Manitoba</option>
                    <option value="Nouveau-Brunswick">Nouveau-Brunswick</option>
                    <option value="Terre-Neuve-et-Labrador">Terre-Neuve-et-Labrador</option>
                    <option value="Nouvelle-Écosse">Nouvelle-Écosse</option>
                    <option value="Île-du-Prince-Édouard">Île-du-Prince-Édouard</option>
                    <option value="Saskatchewan">Saskatchewan</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Code postal</label>
                  <input
                    type="text"
                    name="address_postal"
                    value={formData.address_postal}
                    onChange={handleChange}
                    placeholder="L4K 3E6"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Emploi */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">💼 Informations Emploi</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nom de l'employeur</label>
                <input
                  type="text"
                  name="employer_name"
                  value={formData.employer_name}
                  onChange={handleChange}
                  placeholder="Solution Argent Rapide"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date d'embauche</label>
                <div className="grid grid-cols-3 gap-4">
                  <input
                    type="text"
                    name="hire_year"
                    value={formData.hire_year}
                    onChange={handleChange}
                    placeholder="2022"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                  <select
                    name="hire_month"
                    value={formData.hire_month}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  >
                    <option value="01">Janvier</option>
                    <option value="02">Février</option>
                    <option value="03">Mars</option>
                    <option value="04">Avril</option>
                    <option value="05">Mai</option>
                    <option value="06">Juin</option>
                    <option value="07">Juillet</option>
                    <option value="08">Août</option>
                    <option value="09">Septembre</option>
                    <option value="10">Octobre</option>
                    <option value="11">Novembre</option>
                    <option value="12">Décembre</option>
                  </select>
                  <input
                    type="text"
                    name="hire_day"
                    value={formData.hire_day}
                    onChange={handleChange}
                    placeholder="09"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Autres */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">📝 Autres Informations</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Raison du prêt</label>
                <select
                  name="reason_for_loan"
                  value={formData.reason_for_loan}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="">Sélectionner...</option>
                  <option value="Dépenses imprévues">Dépenses imprévues</option>
                  <option value="Dépenses d'études">Dépenses d'études</option>
                  <option value="Rénovations">Rénovations</option>
                  <option value="Consolidation de dettes">Consolidation de dettes</option>
                  <option value="Voyage">Voyage</option>
                  <option value="Autre">Autre</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Comment avez-vous entendu parler de nous?</label>
                <select
                  name="how_did_you_hear"
                  value={formData.how_did_you_hear}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="">Sélectionner...</option>
                  <option value="Recherche Google">Recherche Google</option>
                  <option value="Publicité Facebook">Publicité Facebook</option>
                  <option value="Recommandation">Recommandation</option>
                  <option value="Autre">Autre</option>
                </select>
              </div>
            </div>
          </div>

          {/* Champs optionnels (absents du formulaire iframe) */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-2 text-yellow-900">⚠️ Champs Optionnels (Absent de l'iframe)</h2>
            <p className="text-sm text-yellow-800 mb-4">Ces champs sont dans le document Margill mais absents du formulaire iframe actuel</p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Revenu mensuel</label>
                <input
                  type="text"
                  name="monthly_income"
                  value={formData.monthly_income}
                  onChange={handleChange}
                  placeholder="(vide)"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Niveau d'éducation</label>
                <input
                  type="text"
                  name="education_level"
                  value={formData.education_level}
                  onChange={handleChange}
                  placeholder="(vide)"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Cote de crédit</label>
                <input
                  type="text"
                  name="credit_score"
                  value={formData.credit_score}
                  onChange={handleChange}
                  placeholder="(vide)"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">NAS (Numéro d'assurance sociale)</label>
                <input
                  type="text"
                  name="sin"
                  value={formData.sin}
                  onChange={handleChange}
                  placeholder="(vide)"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white"
                />
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <div className="bg-white rounded-lg shadow p-6">
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-semibold text-lg"
            >
              {loading ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  Traitement...
                </div>
              ) : (
                '🚀 Tester le Payload Margill'
              )}
            </button>
          </div>
        </form>

        {/* Results */}
        {result && (
          <div className="mt-8 bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">📊 Résultat du Test</h2>

            {result.success ? (
              <div className="space-y-4">
                <div className="p-4 bg-green-50 border border-green-200 rounded">
                  <p className="text-green-800 font-semibold">✅ Test réussi!</p>
                </div>

                {/* Payload JSON */}
                <div>
                  <h3 className="font-semibold mb-2">Payload JSON envoyé à Margill:</h3>
                  <pre className="bg-gray-900 text-green-400 p-4 rounded overflow-x-auto text-xs">
{JSON.stringify(result.margillPayload, null, 2)}
                  </pre>
                </div>

                {/* Validation */}
                {result.validation && (
                  <div>
                    <h3 className="font-semibold mb-2">Validation:</h3>
                    <div className="space-y-2">
                      {result.validation.map((item: any, i: number) => (
                        <div key={i} className={`p-3 rounded ${item.valid ? 'bg-green-50 border border-green-200' : 'bg-yellow-50 border border-yellow-200'}`}>
                          <p className={`font-medium ${item.valid ? 'text-green-800' : 'text-yellow-800'}`}>
                            {item.valid ? '✅' : '⚠️'} {item.field}
                          </p>
                          {item.message && <p className="text-sm text-gray-600">{item.message}</p>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-4 bg-red-50 border border-red-200 rounded">
                <p className="text-red-800 font-semibold">❌ Erreur: {result.error}</p>
                {result.details && <p className="text-sm text-red-600 mt-2">{result.details}</p>}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
