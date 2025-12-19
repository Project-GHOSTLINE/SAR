'use client'

import Link from 'next/link'
import { useState } from 'react'
import { CheckCircle, Shield, Lock, Phone, Zap, BadgeCheck, Star, X, MessageCircle } from 'lucide-react'

// Format number consistently for SSR/CSR
function formatAmount(num: number): string {
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
}

export default function Home() {
  const [amount, setAmount] = useState(4700)
  const [activeTab, setActiveTab] = useState(0)
  const [showContactModal, setShowContactModal] = useState(false)
  const [contactForm, setContactForm] = useState({
    nom: '',
    email: '',
    telephone: '',
    question: '',
    questionAutre: ''
  })
  const [formSubmitted, setFormSubmitted] = useState(false)

  const questionsPreetablies = [
    "Où en est ma demande de crédit?",
    "Je veux modifier le montant demandé",
    "J'ai un problème avec la vérification bancaire",
    "Quand vais-je recevoir mon argent?",
    "Je veux annuler ma demande",
    "Question sur mon remboursement",
    "Autre question"
  ]

  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      const response = await fetch('/api/contact-analyse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(contactForm)
      })

      if (!response.ok) {
        throw new Error('Erreur envoi')
      }

      setFormSubmitted(true)
    } catch (error) {
      console.error('Erreur:', error)
      alert('Erreur lors de l\'envoi. Veuillez appeler le 1-888-900-1516')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <>
      {/* Hero Section - Liquid Glass */}
      <section
        className="min-h-screen relative pt-8 pb-16 -mt-[104px]"
        style={{ background: 'linear-gradient(135deg, #00874e 0%, #059669 50%, #10b981 100%)' }}
      >
        {/* Decorative circles */}
        <div className="absolute top-10 left-10 w-64 h-64 rounded-full opacity-30" style={{ background: 'radial-gradient(circle, #22c55e 0%, transparent 70%)' }}></div>
        <div className="absolute bottom-10 right-10 w-96 h-96 rounded-full opacity-20" style={{ background: 'radial-gradient(circle, #ffffff 0%, transparent 70%)' }}></div>
        <div className="absolute top-1/2 left-1/4 w-48 h-48 rounded-full opacity-20 hidden md:block" style={{ background: 'radial-gradient(circle, #10b981 0%, transparent 70%)' }}></div>

        {/* Content */}
        <div className="relative z-10 pt-28 md:pt-32 px-4">
          <div className="max-w-5xl mx-auto">

            {/* Badge */}
            <div className="text-center mb-6 md:mb-8">
              <span
                className="inline-flex items-center gap-2 md:gap-3 px-5 md:px-8 py-2.5 md:py-3.5 rounded-full text-base md:text-lg"
                style={{
                  background: 'rgba(255,255,255,0.25)',
                  border: '2px solid rgba(255,255,255,0.5)',
                  boxShadow: '0 4px 20px rgba(0,0,0,0.15)'
                }}
              >
                <span className="w-3 h-3 bg-white rounded-full animate-pulse"></span>
                <span className="text-white font-semibold" style={{ textShadow: '0 1px 3px rgba(0,0,0,0.3)' }}>On est là pour vous aider</span>
              </span>
            </div>

            {/* Heading */}
            <div className="text-center mb-8 md:mb-12">
              <h1
                className="text-4xl md:text-6xl lg:text-7xl font-extrabold text-white mb-6 md:mb-8 leading-tight tracking-tight"
                style={{ textShadow: '0 4px 30px rgba(0,0,0,0.4), 0 2px 4px rgba(0,0,0,0.2)' }}
              >
                L&apos;argent qu&apos;il te faut,
                <br />
                quand tu en as besoin.
              </h1>
              <p
                className="text-lg md:text-2xl text-white max-w-2xl mx-auto px-4 font-medium"
                style={{ textShadow: '0 2px 10px rgba(0,0,0,0.3)' }}
              >
                De <span className="font-bold">300$</span> à <span className="font-bold">5 000$</span> sans enquête de crédit.
                <br className="hidden md:block" />
                Demande en ligne, réponse rapide, argent en 24h.
              </p>
            </div>

            {/* Glass Card with Amount Selector */}
            <div className="max-w-md mx-auto">
              <div
                className="rounded-3xl overflow-hidden"
                style={{
                  background: 'rgba(255,255,255,0.2)',
                  border: '2px solid rgba(255,255,255,0.4)',
                  boxShadow: '0 25px 50px rgba(0,0,0,0.15), inset 0 1px 1px rgba(255,255,255,0.4)'
                }}
              >
                {/* Top shine line */}
                <div style={{ height: '2px', background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.6), transparent)' }}></div>

                <div className="p-6 md:p-10">
                  <div className="flex items-center justify-between mb-5 md:mb-6">
                    <span className="text-white font-semibold text-base md:text-lg" style={{ textShadow: '0 1px 3px rgba(0,0,0,0.3)' }}>Montant souhaité</span>
                    <span
                      className="text-sm md:text-base text-white font-bold px-4 md:px-5 py-1.5 md:py-2 rounded-full"
                      style={{ background: 'rgba(255,255,255,0.25)', border: '2px solid rgba(255,255,255,0.5)' }}
                    >
                      Max: 5 000$
                    </span>
                  </div>

                  {/* Amount Display */}
                  <div
                    className="text-center py-10 md:py-12 rounded-2xl mb-6 md:mb-8"
                    style={{
                      background: 'rgba(255,255,255,0.2)',
                      border: '2px solid rgba(255,255,255,0.4)',
                      boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.1)'
                    }}
                  >
                    <span className="text-6xl md:text-8xl font-extrabold text-white" style={{ textShadow: '0 4px 20px rgba(0,0,0,0.3)' }}>
                      {formatAmount(amount)}
                    </span>
                    <span className="text-4xl md:text-6xl font-extrabold text-white">$</span>
                    <p className="text-white text-sm md:text-base mt-3 font-semibold" style={{ textShadow: '0 1px 3px rgba(0,0,0,0.3)' }}>Dépôt en 24h</p>
                  </div>

                  {/* Slider */}
                  <div className="mb-6 md:mb-8 relative">
                    <div className="relative h-3 md:h-4 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.3)' }}>
                      <div
                        className="absolute top-0 left-0 h-full rounded-full transition-all"
                        style={{
                          width: `${((amount - 300) / 4700) * 100}%`,
                          background: 'linear-gradient(90deg, #ffffff, #e0e0e0)',
                          boxShadow: '0 0 10px rgba(255,255,255,0.5)'
                        }}
                      ></div>
                    </div>
                    <input
                      type="range"
                      min="300"
                      max="5000"
                      step="100"
                      value={amount}
                      onChange={(e) => setAmount(parseInt(e.target.value))}
                      className="w-full h-3 md:h-4 opacity-0 cursor-pointer absolute top-0 left-0"
                      aria-label="Montant du pret"
                    />
                    <div className="flex justify-between mt-3 md:mt-4 text-sm md:text-base text-white font-semibold" style={{ textShadow: '0 1px 3px rgba(0,0,0,0.3)' }}>
                      <span>300$</span>
                      <span>5 000$</span>
                    </div>
                  </div>

                  {/* Quick Amounts */}
                  <div className="flex flex-wrap gap-2 md:gap-3 mb-6 md:mb-8 justify-center">
                    {[500, 1000, 2000, 3000, 5000].map((val) => (
                      <button
                        key={val}
                        onClick={() => setAmount(val)}
                        className="px-4 md:px-6 py-2.5 md:py-3 rounded-xl text-sm md:text-base font-bold transition-all"
                        style={amount === val ? {
                          background: '#ffffff',
                          color: '#00874e',
                          boxShadow: '0 4px 20px rgba(255,255,255,0.5)'
                        } : {
                          background: 'rgba(255,255,255,0.2)',
                          color: '#ffffff',
                          border: '2px solid rgba(255,255,255,0.4)',
                          textShadow: '0 1px 3px rgba(0,0,0,0.3)'
                        }}
                      >
                        {formatAmount(val)}$
                      </button>
                    ))}
                  </div>

                  {/* CTA Button */}
                  <Link
                    href="https://solutionargentrapide.ca/demande-de-pret-en-ligne-formulaire"
                    className="block w-full py-5 md:py-6 rounded-2xl font-extrabold text-lg md:text-xl transition-all hover:scale-105 text-center"
                    style={{
                      background: 'linear-gradient(180deg, #ffffff 0%, #f0f0f0 100%)',
                      color: '#00874e',
                      boxShadow: '0 10px 30px rgba(0,0,0,0.25), inset 0 1px 1px rgba(255,255,255,1)'
                    }}
                  >
                    Commencer ma demande →
                  </Link>
                </div>

                {/* Bottom Bar */}
                <div style={{ background: 'rgba(255,255,255,0.15)', borderTop: '2px solid rgba(255,255,255,0.3)' }} className="px-4 md:px-8 py-5 md:py-6">
                  <div className="flex flex-col md:flex-row items-center justify-center gap-4 md:gap-10 text-sm md:text-base">
                    {['Sans enquête', '100% en ligne', 'Argent en 24h'].map((text, i) => (
                      <span key={i} className="flex items-center gap-2.5 text-white">
                        <span
                          className="w-6 h-6 md:w-7 md:h-7 rounded-full flex items-center justify-center text-sm font-bold"
                          style={{ background: 'rgba(255,255,255,0.25)', border: '2px solid rgba(255,255,255,0.5)' }}
                        >✓</span>
                        <span className="font-semibold" style={{ textShadow: '0 1px 3px rgba(0,0,0,0.3)' }}>{text}</span>
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Features Cards */}
            <div className="flex flex-wrap justify-center gap-3 md:gap-5 mt-10 md:mt-14 px-2">
              {[
                { icon: '⚡', title: 'Rapide', desc: 'Réponse rapide' },
                { icon: '🔒', title: 'Sécurisé', desc: 'SSL 256-bit' },
                { icon: '💳', title: 'Flexible', desc: 'Paiements adaptés' },
                { icon: '🎯', title: 'Simple', desc: '2 min en ligne' }
              ].map((item, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 md:gap-4 px-5 md:px-7 py-4 md:py-5 rounded-2xl transition-all hover:scale-105"
                  style={{
                    background: 'rgba(255,255,255,0.2)',
                    border: '2px solid rgba(255,255,255,0.4)',
                    boxShadow: '0 4px 15px rgba(0,0,0,0.1)'
                  }}
                >
                  <span className="text-3xl md:text-4xl">{item.icon}</span>
                  <div>
                    <p className="font-bold text-white text-base md:text-lg" style={{ textShadow: '0 1px 3px rgba(0,0,0,0.3)' }}>{item.title}</p>
                    <p className="text-sm md:text-base text-white font-medium" style={{ textShadow: '0 1px 3px rgba(0,0,0,0.3)' }}>{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>

          </div>
        </div>
      </section>

      {/* Why us - Empathy section */}
      <section className="py-12 md:py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-8 md:mb-12">
            <h2 className="section-title">On comprend votre situation</h2>
            <p className="text-gray-600 max-w-xl mx-auto">
              Une urgence peut arriver à n&apos;importe qui. On est là pour vous aider.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 max-w-4xl mx-auto">
            <div className="card text-center">
              <div className="text-3xl mb-3">🚗</div>
              <h3 className="font-semibold text-gray-800 mb-1">Réparation urgente</h3>
              <p className="text-gray-600 text-sm">Auto, maison, électroménager</p>
            </div>
            <div className="card text-center">
              <div className="text-3xl mb-3">💊</div>
              <h3 className="font-semibold text-gray-800 mb-1">Dépenses médicales</h3>
              <p className="text-gray-600 text-sm">Soins non couverts</p>
            </div>
            <div className="card text-center">
              <div className="text-3xl mb-3">📅</div>
              <h3 className="font-semibold text-gray-800 mb-1">Fin de mois</h3>
              <p className="text-gray-600 text-sm">Loyer, factures, épicerie</p>
            </div>
          </div>
        </div>
      </section>

      {/* Process - Simple 1-2-3 */}
      <section className="py-12 md:py-20 bg-gradient-to-b from-transparent to-sar-green/5">
        <div className="container mx-auto px-4">
          <div className="text-center mb-8 md:mb-12">
            <h2 className="section-title">Simple comme 1-2-3</h2>
            <p className="text-gray-600">Pas de paperasse. Pas d&apos;attente.</p>
          </div>

          <div className="max-w-3xl mx-auto">
            <div className="space-y-4 md:space-y-0 md:grid md:grid-cols-3 md:gap-6">
              <div className="glass p-5 md:p-6 text-center">
                <div className="w-12 h-12 bg-sar-green rounded-xl flex items-center justify-center mx-auto mb-3 text-white font-bold text-lg">
                  1
                </div>
                <h3 className="font-semibold text-gray-800 mb-1">Formulaire</h3>
                <p className="text-gray-600 text-sm">2 minutes en ligne</p>
              </div>

              <div className="glass p-5 md:p-6 text-center">
                <div className="w-12 h-12 bg-sar-green rounded-xl flex items-center justify-center mx-auto mb-3 text-white font-bold text-lg">
                  2
                </div>
                <h3 className="font-semibold text-gray-800 mb-1">Vérification</h3>
                <p className="text-gray-600 text-sm">Connexion bancaire sécurisée</p>
              </div>

              <div className="glass p-5 md:p-6 text-center">
                <div className="w-12 h-12 bg-sar-gold rounded-xl flex items-center justify-center mx-auto mb-3 text-white font-bold text-lg">
                  3
                </div>
                <h3 className="font-semibold text-gray-800 mb-1">Argent reçu</h3>
                <p className="text-gray-600 text-sm">Dépôt direct en 24h</p>
              </div>
            </div>

            <div className="text-center mt-8">
              <Link href="https://solutionargentrapide.ca/demande-de-pret-en-ligne-formulaire" className="btn-primary">
                Commencer maintenant
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Security section */}
      <section className="py-12 md:py-16">
        <div className="container mx-auto px-4">
          <div className="glass rounded-2xl md:rounded-3xl p-6 md:p-10 max-w-4xl mx-auto">
            <div className="flex items-start gap-4 mb-6">
              <div className="w-12 h-12 bg-sar-green/10 rounded-xl flex items-center justify-center flex-shrink-0">
                <BadgeCheck size={24} className="text-sar-green" />
              </div>
              <div>
                <h2 className="text-xl md:text-2xl font-bold text-gray-800 mb-2">Vos données sont protégées</h2>
                <p className="text-gray-600 text-sm md:text-base">Sécurité bancaire. Données jamais partagées.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                <CheckCircle size={18} className="text-sar-green flex-shrink-0" />
                <span className="text-sm text-gray-700">Chiffrement SSL 256-bit</span>
              </div>
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                <CheckCircle size={18} className="text-sar-green flex-shrink-0" />
                <span className="text-sm text-gray-700">Aucun accès à vos identifiants</span>
              </div>
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                <CheckCircle size={18} className="text-sar-green flex-shrink-0" />
                <span className="text-sm text-gray-700">Entreprise basée au Québec</span>
              </div>
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                <CheckCircle size={18} className="text-sar-green flex-shrink-0" />
                <span className="text-sm text-gray-700">Aucun impact sur votre credit</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Eligibility */}
      <section className="py-12 md:py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto">
            <div className="text-center mb-8">
              <h2 className="section-title">Êtes-vous éligible?</h2>
              <p className="text-gray-600">4 critères simples</p>
            </div>

            <div className="glass rounded-2xl p-5 md:p-8">
              <div className="space-y-3 md:space-y-4">
                <div className="flex items-center gap-4 p-3 md:p-4 bg-white/60 rounded-xl">
                  <CheckCircle size={22} className="text-sar-green flex-shrink-0" />
                  <p className="font-medium text-gray-800">Résident du Québec, 18+</p>
                </div>
                <div className="flex items-center gap-4 p-3 md:p-4 bg-white/60 rounded-xl">
                  <CheckCircle size={22} className="text-sar-green flex-shrink-0" />
                  <p className="font-medium text-gray-800">Emploi stable (3 mois min)</p>
                </div>
                <div className="flex items-center gap-4 p-3 md:p-4 bg-white/60 rounded-xl">
                  <CheckCircle size={22} className="text-sar-green flex-shrink-0" />
                  <p className="font-medium text-gray-800">Revenu 300$/semaine minimum</p>
                </div>
                <div className="flex items-center gap-4 p-3 md:p-4 bg-white/60 rounded-xl">
                  <CheckCircle size={22} className="text-sar-green flex-shrink-0" />
                  <p className="font-medium text-gray-800">Compte bancaire actif</p>
                </div>
              </div>

              <div className="mt-6 p-4 bg-sar-green/5 rounded-xl text-center">
                <p className="text-gray-700 text-sm md:text-base">
                  <strong className="text-sar-green">Mauvais crédit?</strong> Pas de problème! On ne fait pas d&apos;enquête traditionnelle.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-12 md:py-20 bg-gradient-to-b from-sar-green/5 to-transparent">
        <div className="container mx-auto px-4">
          <div className="text-center mb-8 md:mb-12">
            <h2 className="section-title">Ils nous font confiance</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 max-w-4xl mx-auto">
            <div className="testimonial-card">
              <div className="flex gap-0.5 mb-3">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} size={16} className="text-sar-gold fill-current" />
                ))}
              </div>
              <p className="text-gray-600 text-sm mb-4 italic">
                &quot;Réparation urgente sur ma voiture. En moins de 24h, j&apos;avais l&apos;argent. Merci!&quot;
              </p>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-sar-green/10 rounded-full flex items-center justify-center">
                  <span className="text-xs font-bold text-sar-green">EL</span>
                </div>
                <div>
                  <p className="font-medium text-gray-800 text-sm">Eric L.</p>
                  <p className="text-xs text-gray-500">Montreal</p>
                </div>
              </div>
            </div>

            <div className="testimonial-card">
              <div className="flex gap-0.5 mb-3">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} size={16} className="text-sar-gold fill-current" />
                ))}
              </div>
              <p className="text-gray-600 text-sm mb-4 italic">
                &quot;Service incroyable! L&apos;argent était dans mon compte le jour même.&quot;
              </p>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-sar-green/10 rounded-full flex items-center justify-center">
                  <span className="text-xs font-bold text-sar-green">CB</span>
                </div>
                <div>
                  <p className="font-medium text-gray-800 text-sm">Cynthia B.</p>
                  <p className="text-xs text-gray-500">Longueuil</p>
                </div>
              </div>
            </div>

            <div className="testimonial-card">
              <div className="flex gap-0.5 mb-3">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} size={16} className="text-sar-gold fill-current" />
                ))}
              </div>
              <p className="text-gray-600 text-sm mb-4 italic">
                &quot;Tout était clair et bien expliqué. Pas de surprises!&quot;
              </p>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-sar-green/10 rounded-full flex items-center justify-center">
                  <span className="text-xs font-bold text-sar-green">KB</span>
                </div>
                <div>
                  <p className="font-medium text-gray-800 text-sm">Kathy B.</p>
                  <p className="text-xs text-gray-500">Quebec</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Tabs - Modalites, Soutien, Politique */}
      <section className="py-12 md:py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto">
            <div className="text-center mb-8">
              <h2 className="section-title">Nos conditions</h2>
              <p className="text-gray-600">Transparence et clarté</p>
            </div>

            {/* Tabs navigation */}
            <div className="flex flex-col sm:flex-row gap-2 mb-6">
              <button
                onClick={() => setActiveTab(0)}
                className={`flex-1 py-3 px-4 rounded-xl text-sm font-medium transition-all ${
                  activeTab === 0
                    ? 'bg-sar-green text-white shadow-lg'
                    : 'bg-white/80 text-gray-600 hover:bg-white'
                }`}
              >
                Modalités de remboursement
              </button>
              <button
                onClick={() => setActiveTab(1)}
                className={`flex-1 py-3 px-4 rounded-xl text-sm font-medium transition-all ${
                  activeTab === 1
                    ? 'bg-sar-green text-white shadow-lg'
                    : 'bg-white/80 text-gray-600 hover:bg-white'
                }`}
              >
                Soutien et cote de crédit
              </button>
              <button
                onClick={() => setActiveTab(2)}
                className={`flex-1 py-3 px-4 rounded-xl text-sm font-medium transition-all ${
                  activeTab === 2
                    ? 'bg-sar-green text-white shadow-lg'
                    : 'bg-white/80 text-gray-600 hover:bg-white'
                }`}
              >
                Politique de remboursement
              </button>
            </div>

            {/* Tab content */}
            <div className="glass rounded-2xl p-5 md:p-8">
              {activeTab === 0 && (
                <div className="space-y-4">
                  <p className="text-gray-700 leading-relaxed">
                    Nous proposons un taux d&apos;intérêt annuel (TAEG) de <strong>18,99 %</strong>.
                  </p>
                  <p className="text-gray-700 leading-relaxed">
                    Chez Solution Argent Rapide, nous établissons vos paiements minimums en fonction de votre
                    capacité de paiement et de la durée de remboursement que vous préférez.
                  </p>
                  <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
                    <p className="text-yellow-800 text-sm">
                      <strong>Remarque :</strong> Les frais d&apos;adhésion sont applicables tant qu&apos;il reste
                      un solde à rembourser sur votre crédit.
                    </p>
                  </div>
                </div>
              )}

              {activeTab === 1 && (
                <div className="space-y-4">
                  <p className="text-gray-700 leading-relaxed">
                    Chez Solution Argent Rapide, nous adhérons strictement aux normes légales canadiennes.
                    Si une situation particulière se présente pendant votre période d&apos;utilisation de notre
                    option de crédit, notre service à la clientèle est à votre disposition pour vous assister
                    dans vos démarches, qu&apos;il s&apos;agisse d&apos;un report de paiement ou de toute autre demande.
                  </p>
                  <div className="bg-sar-green/10 border border-sar-green/20 rounded-xl p-4">
                    <p className="text-gray-700">
                      <strong className="text-sar-green">Bonne nouvelle :</strong> Les transactions effectuées avec
                      notre option de crédit n&apos;ont <strong>aucun impact sur votre cote de crédit</strong>,
                      car nous ne transmettons pas d&apos;informations aux bureaux de crédit.
                    </p>
                  </div>
                </div>
              )}

              {activeTab === 2 && (
                <div className="space-y-4">
                  <p className="text-gray-700 leading-relaxed">
                    <strong>Points importants :</strong>
                  </p>
                  <ul className="space-y-3">
                    <li className="flex items-start gap-3">
                      <CheckCircle size={18} className="text-sar-green flex-shrink-0 mt-0.5" />
                      <span className="text-gray-700 text-sm">Le montant remboursé ne peut être inférieur à 5 % du montant utilisé sur votre crédit.</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <CheckCircle size={18} className="text-sar-green flex-shrink-0 mt-0.5" />
                      <span className="text-gray-700 text-sm">Notre produit est conçu pour une utilisation ponctuelle et un remboursement complet en quelques semaines.</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <CheckCircle size={18} className="text-sar-green flex-shrink-0 mt-0.5" />
                      <span className="text-gray-700 text-sm">Les options de crédit sont généralement remboursées sur une période de 3 à 6 mois.</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <CheckCircle size={18} className="text-sar-green flex-shrink-0 mt-0.5" />
                      <span className="text-gray-700 text-sm">Vous pouvez rembourser le montant dû en totalité ou en partie à tout moment.</span>
                    </li>
                  </ul>
                  <div className="bg-gray-50 rounded-xl p-4 mt-4">
                    <p className="text-sm text-gray-600">
                      <strong>Exemple :</strong> Un retrait de 750 $ avec des remboursements bihebdomadaires de 110,75 $ sur 10 versements.
                      Les frais hebdomadaires d&apos;adhésion de 22,50 $ sont inclus dans les montants de remboursement indiqués.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Warning */}
      <section className="py-8 md:py-12">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto">
            <div className="glass-warning rounded-2xl p-5 md:p-6">
              <div className="flex gap-4">
                <span className="text-2xl flex-shrink-0">⚠️</span>
                <div>
                  <h3 className="font-semibold text-yellow-800 mb-2">Empruntez responsablement</h3>
                  <p className="text-yellow-700 text-sm leading-relaxed">
                    Nos solutions sont pour les urgences ponctuelles. Les taux sont plus élevés que les banques traditionnelles.
                    Assurez-vous de pouvoir rembourser avant de faire une demande.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-12 md:py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-8">
            <h2 className="section-title">Questions fréquentes</h2>
          </div>

          <div className="max-w-2xl mx-auto space-y-3 md:space-y-4">
            <div className="card">
              <h3 className="font-semibold text-gray-800 mb-2">Quand vais-je recevoir l&apos;argent?</h3>
              <p className="text-gray-600 text-sm">Dépôt direct dans les 24h suivant l&apos;approbation.</p>
            </div>
            <div className="card">
              <h3 className="font-semibold text-gray-800 mb-2">Est-ce que ça affecte mon crédit?</h3>
              <p className="text-gray-600 text-sm">Non. Pas d&apos;enquête traditionnelle, pas de rapport aux bureaux de crédit.</p>
            </div>
            <div className="card">
              <h3 className="font-semibold text-gray-800 mb-2">La vérification est-elle sécuritaire?</h3>
              <p className="text-gray-600 text-sm">Oui. Chiffrement SSL 256-bit. On n&apos;a jamais accès à vos identifiants.</p>
            </div>
          </div>

          <div className="text-center mt-8">
            <Link href="/faq" className="btn-secondary">
              Toutes les questions
            </Link>
          </div>
        </div>
      </section>

      {/* Contact */}
      <section className="py-12 md:py-16">
        <div className="container mx-auto px-4">
          <div className="glass rounded-2xl p-6 md:p-10 max-w-3xl mx-auto text-center">
            <h2 className="text-xl md:text-2xl font-bold text-gray-800 mb-6">Des questions?</h2>

            <div className="flex flex-col gap-4 justify-center max-w-md mx-auto">
              <div className="bg-sar-green/5 rounded-xl p-4 border-2 border-sar-green/20">
                <div className="flex flex-col sm:flex-row gap-2 mb-2">
                  <a href="tel:18889001516" className="btn-primary flex-1 flex items-center justify-center gap-2">
                    <Phone size={18} />
                    <span>1-888-900-1516</span>
                  </a>
                  <button
                    onClick={() => setShowContactModal(true)}
                    className="flex-1 bg-white border-2 border-sar-green text-sar-green font-semibold py-3 px-4 rounded-2xl flex items-center justify-center gap-2 hover:bg-sar-green hover:text-white transition-all"
                  >
                    <MessageCircle size={18} />
                    <span>Écrivez-nous</span>
                  </button>
                </div>
                <p className="text-xs text-gray-600 font-medium mb-1">Analyse et suivi de dossier</p>
                <div className="flex items-center justify-center gap-2 text-sm text-sar-green">
                  <span className="w-2 h-2 bg-sar-green rounded-full animate-pulse"></span>
                  Disponible 24h/24, 7j/7
                </div>
              </div>

              <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                <a href="tel:4509991107" className="btn-secondary flex items-center justify-center gap-2 mb-2">
                  <Phone size={18} />
                  <span><strong>Comptabilité:</strong> 450 999-1107</span>
                </a>
                <p className="text-xs text-gray-500">Lun-Jeu: 8h-16h | Ven: 8h-12h</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Modal Contact Analyse */}
      {showContactModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => {
              setShowContactModal(false)
              setFormSubmitted(false)
            }}
          ></div>

          {/* Modal */}
          <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="sticky top-0 bg-sar-green text-white p-5 rounded-t-3xl flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold">Analyse et suivi</h3>
                <p className="text-white/80 text-sm">Réponse rapide 24/7</p>
              </div>
              <button
                onClick={() => {
                  setShowContactModal(false)
                  setFormSubmitted(false)
                }}
                className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center hover:bg-white/30 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {formSubmitted ? (
              <div className="p-8 text-center">
                <div className="w-16 h-16 bg-sar-green/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="text-sar-green" size={32} />
                </div>
                <h4 className="text-xl font-bold text-gray-800 mb-2">Message envoyé!</h4>
                <p className="text-gray-600 mb-6">Nous vous répondrons dans les plus brefs délais.</p>
                <button
                  onClick={() => {
                    setShowContactModal(false)
                    setFormSubmitted(false)
                    setContactForm({ nom: '', email: '', telephone: '', question: '', questionAutre: '' })
                  }}
                  className="btn-primary"
                >
                  Fermer
                </button>
              </div>
            ) : (
              <form onSubmit={handleContactSubmit} className="p-5 md:p-6 space-y-4">
                {/* Questions pre-etablies */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-3">
                    Quelle est votre question?
                  </label>
                  <div className="space-y-2">
                    {questionsPreetablies.map((q, i) => (
                      <label
                        key={i}
                        className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all ${
                          contactForm.question === q
                            ? 'bg-sar-green/10 border-2 border-sar-green'
                            : 'bg-gray-50 border-2 border-transparent hover:bg-gray-100'
                        }`}
                      >
                        <input
                          type="radio"
                          name="question"
                          value={q}
                          checked={contactForm.question === q}
                          onChange={(e) => setContactForm({ ...contactForm, question: e.target.value })}
                          className="w-4 h-4 text-sar-green"
                        />
                        <span className="text-sm text-gray-700">{q}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Champ pour autre question */}
                {contactForm.question === "Autre question" && (
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Précisez votre question
                    </label>
                    <textarea
                      rows={3}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-sar-green focus:ring-0 outline-none transition-colors"
                      placeholder="Décrivez votre question..."
                      value={contactForm.questionAutre}
                      onChange={(e) => setContactForm({ ...contactForm, questionAutre: e.target.value })}
                    />
                  </div>
                )}

                {/* Coordonnees */}
                <div className="pt-4 border-t border-gray-100">
                  <p className="text-sm font-semibold text-gray-700 mb-3">Vos coordonnées <span className="text-red-500">*</span></p>

                  <div className="space-y-3">
                    <div>
                      <input
                        type="text"
                        required
                        placeholder="Votre nom complet *"
                        className={`w-full px-4 py-3 border-2 rounded-xl focus:border-sar-green focus:ring-0 outline-none transition-colors ${
                          contactForm.nom ? 'border-sar-green/50 bg-sar-green/5' : 'border-gray-200'
                        }`}
                        value={contactForm.nom}
                        onChange={(e) => setContactForm({ ...contactForm, nom: e.target.value })}
                      />
                    </div>
                    <div>
                      <input
                        type="email"
                        required
                        placeholder="Votre courriel *"
                        className={`w-full px-4 py-3 border-2 rounded-xl focus:border-sar-green focus:ring-0 outline-none transition-colors ${
                          contactForm.email ? 'border-sar-green/50 bg-sar-green/5' : 'border-gray-200'
                        }`}
                        value={contactForm.email}
                        onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
                      />
                    </div>
                    <div>
                      <input
                        type="tel"
                        required
                        placeholder="Votre téléphone *"
                        className={`w-full px-4 py-3 border-2 rounded-xl focus:border-sar-green focus:ring-0 outline-none transition-colors ${
                          contactForm.telephone ? 'border-sar-green/50 bg-sar-green/5' : 'border-gray-200'
                        }`}
                        value={contactForm.telephone}
                        onChange={(e) => setContactForm({ ...contactForm, telephone: e.target.value })}
                      />
                    </div>
                  </div>

                  {(!contactForm.nom || !contactForm.email || !contactForm.telephone) && (
                    <p className="text-xs text-red-500 mt-2">* Tous les champs sont obligatoires</p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={!contactForm.question || !contactForm.nom || !contactForm.email || !contactForm.telephone || isSubmitting}
                  className="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? 'Envoi en cours...' : 'Envoyer ma question'}
                </button>

                <p className="text-xs text-gray-500 text-center">
                  Ou appelez directement: <a href="tel:18889001516" className="text-sar-green font-semibold">1-888-900-1516</a>
                </p>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  )
}
