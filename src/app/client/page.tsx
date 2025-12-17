'use client'

import React, { useState } from 'react'
import {
  DollarSign, Phone, Mail, MapPin, Clock, Shield, Star,
  ChevronDown, ChevronLeft, ArrowRight, Check, Calendar,
  FileText, Plus, AlertTriangle, Wallet, Edit, MessageCircle
} from 'lucide-react'

export default function ClientPortal() {
  const [step, setStep] = useState(0)
  const [formData, setFormData] = useState({
    prenom: '',
    nom: '',
    telephone: '',
    courriel: '',
    sujet: '',
    message: '',
    dateReport: '',
    urgence: 'normal'
  })
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)
  const [reference, setReference] = useState('')

  const sujets = [
    { value: 'report_paiement', label: 'Report de paiement', icon: 'calendar', desc: 'Modifier ta date de paiement' },
    { value: 'depot_suivi', label: 'Depot / Suivi', icon: 'document', desc: 'Suivre ta demande ou contrat' },
    { value: 'nouvelle_demande', label: 'Nouvelle demande', icon: 'plus', desc: 'Faire une nouvelle demande' },
    { value: 'probleme_ibv', label: "Probleme d'IBV", icon: 'alert', desc: 'Probleme de verification bancaire' },
    { value: 'paiement_retard', label: 'Paiement en retard', icon: 'clock', desc: 'Trouver une entente' },
    { value: 'solde_compte', label: 'Solde / Etat de compte', icon: 'wallet', desc: 'Consulter ton solde' },
    { value: 'changement_info', label: "Changement d'info", icon: 'edit', desc: 'Modifier tes informations' },
    { value: 'autre', label: 'Autre chose', icon: 'chat', desc: 'Autre question ou demande' }
  ]

  const faqs = [
    { q: "Combien de temps pour recevoir une reponse?", a: "Notre equipe repond generalement dans les 24-48h ouvrables. Les demandes urgentes sont traitees en priorite." },
    { q: "Comment faire un report de paiement?", a: "Selectionne 'Report de paiement' dans le formulaire, choisis ta nouvelle date et explique ta situation. On s'occupe du reste!" },
    { q: "Mes informations sont-elles securisees?", a: "Absolument. Toutes les donnees sont chiffrees avec un protocole SSL 256-bit et ne sont jamais partagees." },
    { q: "Puis-je modifier ma demande apres l'envoi?", a: "Oui! Envoie une nouvelle demande en mentionnant ton numero de reference et les modifications souhaitees." }
  ]

  const getIcon = (iconName: string) => {
    const icons: Record<string, React.ReactNode> = {
      calendar: <Calendar className="w-6 h-6" />,
      document: <FileText className="w-6 h-6" />,
      plus: <Plus className="w-6 h-6" />,
      alert: <AlertTriangle className="w-6 h-6" />,
      clock: <Clock className="w-6 h-6" />,
      wallet: <Wallet className="w-6 h-6" />,
      edit: <Edit className="w-6 h-6" />,
      chat: <MessageCircle className="w-6 h-6" />
    }
    return icons[iconName] || <FileText className="w-6 h-6" />
  }

  const handleChange = (name: string, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const selectedSujet = sujets.find(s => s.value === formData.sujet)

  const handleSubmit = async () => {
    setLoading(true)
    // Generate reference
    const ref = 'SAR-' + Math.random().toString(36).substr(2, 6).toUpperCase()
    setReference(ref)

    // TODO: Send to API/Supabase
    await new Promise(resolve => setTimeout(resolve, 1000))

    setLoading(false)
    setStep(5)
  }

  // Header
  const Header = () => (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-b border-gray-100 shadow-sm">
      <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 bg-gradient-to-br from-sar-green to-sar-green-dark rounded-xl flex items-center justify-center shadow-lg">
            <DollarSign className="text-white w-7 h-7" />
          </div>
          <div>
            <h1 className="font-bold text-gray-800 text-sm tracking-tight">Solution Argent Rapide</h1>
            <p className="text-xs text-sar-green font-medium">Espace Client</p>
          </div>
        </div>
        <a href="tel:5145891946" className="w-10 h-10 bg-sar-green/10 rounded-full flex items-center justify-center text-sar-green hover:bg-sar-green hover:text-white transition-all">
          <Phone className="w-5 h-5" />
        </a>
      </div>
    </header>
  )

  // Hero
  const Hero = () => (
    <section className="pt-24 pb-16 px-4 bg-gradient-to-b from-green-50 via-white to-white">
      <div className="max-w-xl mx-auto text-center">
        <div className="flex items-center justify-center gap-3 mb-6 flex-wrap">
          <div className="flex items-center gap-1.5 px-4 py-2 bg-sar-green/10 rounded-full border border-sar-green/20">
            <Shield className="w-4 h-4 text-sar-green" />
            <span className="text-sm font-semibold text-sar-green">100% Securise</span>
          </div>
          <div className="flex items-center gap-1.5 px-4 py-2 bg-amber-50 rounded-full border border-amber-200">
            <Clock className="w-4 h-4 text-amber-500" />
            <span className="text-sm font-semibold text-amber-700">Reponse 24-48h</span>
          </div>
        </div>

        <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-5 leading-tight">
          Comment pouvons-nous{' '}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-sar-green to-sar-green-light">
            t&apos;aider
          </span>
          ?
        </h1>
        <p className="text-gray-500 mb-10 text-lg max-w-md mx-auto">
          Report de paiement, questions, suivi de dossier — notre equipe est la pour toi.
        </p>

        <button
          onClick={() => setStep(1)}
          className="group inline-flex items-center gap-3 bg-gradient-to-r from-sar-green to-sar-green-dark text-white px-10 py-5 rounded-2xl font-bold text-lg shadow-xl hover:shadow-2xl transition-all hover:-translate-y-1 active:translate-y-0"
        >
          Commencer ma demande
          <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
        </button>

        <div className="flex items-center justify-center gap-8 mt-12 pt-8 border-t border-gray-100 flex-wrap">
          <div className="text-center">
            <p className="text-3xl font-bold text-gray-900">15k+</p>
            <p className="text-sm text-gray-400">Clients satisfaits</p>
          </div>
          <div className="w-px h-12 bg-gray-200 hidden md:block"></div>
          <div className="text-center">
            <p className="text-3xl font-bold text-gray-900">4.9</p>
            <div className="flex items-center gap-0.5 justify-center text-sar-gold">
              {[...Array(5)].map((_, i) => <Star key={i} className="w-4 h-4 fill-current" />)}
            </div>
          </div>
          <div className="w-px h-12 bg-gray-200 hidden md:block"></div>
          <div className="text-center">
            <p className="text-3xl font-bold text-gray-900">&lt;2h</p>
            <p className="text-sm text-gray-400">Temps moyen</p>
          </div>
        </div>
      </div>
    </section>
  )

  // Quick Actions
  const QuickActions = () => (
    <section className="py-12 px-4 bg-white">
      <div className="max-w-xl mx-auto">
        <h2 className="text-xl font-bold text-gray-900 mb-6 text-center">Acces rapide</h2>
        <div className="grid grid-cols-2 gap-4">
          {sujets.slice(0, 4).map((sujet) => (
            <button
              key={sujet.value}
              onClick={() => { handleChange('sujet', sujet.value); setStep(1); }}
              className="group p-5 bg-gray-50 rounded-2xl border-2 border-transparent hover:border-sar-green/30 hover:bg-green-50 transition-all text-left"
            >
              <div className="w-14 h-14 bg-white rounded-xl flex items-center justify-center text-gray-400 group-hover:text-sar-green group-hover:bg-sar-green/10 shadow-sm mb-4 transition-all">
                {getIcon(sujet.icon)}
              </div>
              <p className="font-semibold text-gray-800 group-hover:text-sar-green">{sujet.label}</p>
              <p className="text-sm text-gray-400 mt-1">{sujet.desc}</p>
            </button>
          ))}
        </div>
      </div>
    </section>
  )

  // Progress Bar
  const ProgressBar = ({ current }: { current: number }) => (
    <div className="flex items-center gap-2 mb-6">
      {[1, 2, 3, 4].map(i => (
        <div key={i} className={`flex-1 h-1.5 rounded-full ${i <= current ? 'bg-sar-green' : 'bg-gray-200'}`}></div>
      ))}
    </div>
  )

  // Back Button
  const BackButton = ({ onClick }: { onClick: () => void }) => (
    <button onClick={onClick} className="flex items-center gap-2 text-gray-400 hover:text-sar-green mb-4 transition-colors">
      <ChevronLeft className="w-5 h-5" /> <span className="text-sm font-medium">Retour</span>
    </button>
  )

  // Step 1 - Subject Selection
  const Step1 = () => (
    <section className="pt-20 pb-8 px-4 min-h-screen bg-gray-50">
      <div className="max-w-xl mx-auto">
        <ProgressBar current={1} />
        <BackButton onClick={() => setStep(0)} />

        <h2 className="text-3xl font-bold text-gray-900 mb-2">C&apos;est pour quoi?</h2>
        <p className="text-gray-500 mb-8">Selectionne le motif de ta demande</p>

        <div className="space-y-3">
          {sujets.map((sujet) => (
            <button
              key={sujet.value}
              onClick={() => { handleChange('sujet', sujet.value); setStep(2); }}
              className={`w-full p-5 rounded-2xl border-2 transition-all flex items-center gap-4 text-left ${
                formData.sujet === sujet.value
                  ? 'bg-green-50 border-sar-green shadow-lg'
                  : 'bg-white border-gray-100 hover:border-gray-200 hover:shadow-md'
              }`}
            >
              <div className={`w-14 h-14 rounded-xl flex items-center justify-center transition-all ${
                formData.sujet === sujet.value
                  ? 'bg-sar-green text-white shadow-lg'
                  : 'bg-gray-100 text-gray-400'
              }`}>
                {getIcon(sujet.icon)}
              </div>
              <div className="flex-1">
                <p className={`font-semibold ${formData.sujet === sujet.value ? 'text-sar-green' : 'text-gray-800'}`}>
                  {sujet.label}
                </p>
                <p className="text-sm text-gray-400">{sujet.desc}</p>
              </div>
              {formData.sujet === sujet.value && <Check className="w-5 h-5 text-sar-green" />}
            </button>
          ))}
        </div>
      </div>
    </section>
  )

  // Step 2 - Contact Info
  const Step2 = () => (
    <section className="pt-20 pb-8 px-4 min-h-screen bg-gray-50">
      <div className="max-w-xl mx-auto">
        <ProgressBar current={2} />
        <BackButton onClick={() => setStep(1)} />

        <div className="inline-flex items-center gap-2 px-4 py-2 bg-sar-green/10 text-sar-green rounded-full text-sm font-semibold mb-6">
          {selectedSujet && getIcon(selectedSujet.icon)}
          {selectedSujet?.label}
        </div>

        <h2 className="text-3xl font-bold text-gray-900 mb-2">Tes informations</h2>
        <p className="text-gray-500 mb-8">Pour qu&apos;on puisse te contacter</p>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-semibold text-gray-700 mb-2 block">Prenom *</label>
              <input
                type="text"
                placeholder="Jean"
                value={formData.prenom}
                onChange={(e) => handleChange('prenom', e.target.value)}
                className="w-full px-5 py-4 bg-white border-2 border-gray-100 rounded-xl text-gray-800 placeholder-gray-300 focus:border-sar-green focus:ring-4 focus:ring-sar-green/10 outline-none transition-all"
              />
            </div>
            <div>
              <label className="text-sm font-semibold text-gray-700 mb-2 block">Nom *</label>
              <input
                type="text"
                placeholder="Tremblay"
                value={formData.nom}
                onChange={(e) => handleChange('nom', e.target.value)}
                className="w-full px-5 py-4 bg-white border-2 border-gray-100 rounded-xl text-gray-800 placeholder-gray-300 focus:border-sar-green focus:ring-4 focus:ring-sar-green/10 outline-none transition-all"
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-semibold text-gray-700 mb-2 block">Telephone *</label>
            <input
              type="tel"
              placeholder="(514) 555-1234"
              value={formData.telephone}
              onChange={(e) => handleChange('telephone', e.target.value)}
              className="w-full px-5 py-4 bg-white border-2 border-gray-100 rounded-xl text-gray-800 placeholder-gray-300 focus:border-sar-green focus:ring-4 focus:ring-sar-green/10 outline-none transition-all"
            />
          </div>

          <div>
            <label className="text-sm font-semibold text-gray-700 mb-2 block">Courriel *</label>
            <input
              type="email"
              placeholder="jean@exemple.com"
              value={formData.courriel}
              onChange={(e) => handleChange('courriel', e.target.value)}
              className="w-full px-5 py-4 bg-white border-2 border-gray-100 rounded-xl text-gray-800 placeholder-gray-300 focus:border-sar-green focus:ring-4 focus:ring-sar-green/10 outline-none transition-all"
            />
          </div>

          {formData.sujet === 'report_paiement' && (
            <div className="p-5 bg-amber-50 rounded-xl border-2 border-amber-200">
              <label className="text-sm font-semibold text-amber-800 mb-2 block">Date de report souhaitee *</label>
              <input
                type="date"
                value={formData.dateReport}
                onChange={(e) => handleChange('dateReport', e.target.value)}
                className="w-full px-5 py-4 bg-white border-2 border-amber-200 rounded-xl text-gray-800 focus:border-amber-400 outline-none transition-all"
              />
            </div>
          )}
        </div>

        <button
          onClick={() => setStep(3)}
          disabled={!formData.prenom || !formData.courriel || !formData.telephone}
          className={`w-full mt-8 py-5 rounded-xl font-bold text-lg transition-all flex items-center justify-center gap-2 ${
            formData.prenom && formData.courriel && formData.telephone
              ? 'bg-gradient-to-r from-sar-green to-sar-green-dark text-white shadow-xl hover:shadow-2xl'
              : 'bg-gray-200 text-gray-400 cursor-not-allowed'
          }`}
        >
          Continuer <ArrowRight className="w-5 h-5" />
        </button>
      </div>
    </section>
  )

  // Step 3 - Message
  const Step3 = () => (
    <section className="pt-20 pb-8 px-4 min-h-screen bg-gray-50">
      <div className="max-w-xl mx-auto">
        <ProgressBar current={3} />
        <BackButton onClick={() => setStep(2)} />

        <h2 className="text-3xl font-bold text-gray-900 mb-2">Ton message</h2>
        <p className="text-gray-500 mb-8">Explique-nous ta situation</p>

        <div className="space-y-6">
          <div>
            <label className="text-sm font-semibold text-gray-700 mb-2 block">Message *</label>
            <textarea
              placeholder="Decris ta situation ou ta question en detail..."
              value={formData.message}
              onChange={(e) => handleChange('message', e.target.value)}
              rows={6}
              className="w-full px-5 py-4 bg-white border-2 border-gray-100 rounded-xl text-gray-800 placeholder-gray-300 focus:border-sar-green focus:ring-4 focus:ring-sar-green/10 outline-none transition-all resize-none"
            />
          </div>

          <div>
            <label className="text-sm font-semibold text-gray-700 mb-3 block">Niveau d&apos;urgence</label>
            <div className="grid grid-cols-3 gap-3">
              {[
                { value: 'normal', label: 'Normal', emoji: '🟢' },
                { value: 'urgent', label: 'Urgent', emoji: '🟡' },
                { value: 'tres_urgent', label: 'Tres urgent', emoji: '🔴' }
              ].map((option) => (
                <button
                  key={option.value}
                  onClick={() => handleChange('urgence', option.value)}
                  className={`py-4 rounded-xl font-semibold transition-all ${
                    formData.urgence === option.value
                      ? 'bg-sar-green text-white shadow-lg'
                      : 'bg-white border-2 border-gray-100 text-gray-600 hover:border-gray-200'
                  }`}
                >
                  {option.emoji} {option.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <button
          onClick={() => setStep(4)}
          disabled={!formData.message}
          className={`w-full mt-8 py-5 rounded-xl font-bold text-lg transition-all flex items-center justify-center gap-2 ${
            formData.message
              ? 'bg-gradient-to-r from-sar-green to-sar-green-dark text-white shadow-xl hover:shadow-2xl'
              : 'bg-gray-200 text-gray-400 cursor-not-allowed'
          }`}
        >
          Verifier ma demande <ArrowRight className="w-5 h-5" />
        </button>
      </div>
    </section>
  )

  // Step 4 - Review
  const Step4 = () => (
    <section className="pt-20 pb-8 px-4 min-h-screen bg-gray-50">
      <div className="max-w-xl mx-auto">
        <ProgressBar current={4} />
        <BackButton onClick={() => setStep(3)} />

        <h2 className="text-3xl font-bold text-gray-900 mb-2">Verification</h2>
        <p className="text-gray-500 mb-8">Confirme que tout est correct</p>

        <div className="bg-white rounded-2xl border-2 border-gray-100 overflow-hidden shadow-lg mb-8">
          <div className="p-6 bg-gradient-to-r from-sar-green to-sar-green-dark text-white">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center">
                {selectedSujet && getIcon(selectedSujet.icon)}
              </div>
              <div>
                <p className="font-bold text-lg">{selectedSujet?.label}</p>
                <p className="text-green-200 text-sm">
                  {formData.urgence === 'tres_urgent' ? '🔴 Tres urgent' : formData.urgence === 'urgent' ? '🟡 Urgent' : '🟢 Normal'}
                </p>
              </div>
            </div>
          </div>

          <div className="p-6 space-y-4">
            {[
              ['Nom complet', `${formData.prenom} ${formData.nom}`],
              ['Telephone', formData.telephone],
              ['Courriel', formData.courriel],
              ...(formData.dateReport ? [['Date de report', formData.dateReport]] : [])
            ].map(([label, value]) => (
              <div key={label} className="flex justify-between py-3 border-b border-gray-100 last:border-0">
                <span className="text-gray-400">{label}</span>
                <span className="text-gray-800 font-medium">{value}</span>
              </div>
            ))}
            <div className="pt-3">
              <span className="text-gray-400 text-sm">Message:</span>
              <p className="text-gray-800 mt-2 bg-gray-50 p-4 rounded-xl">{formData.message}</p>
            </div>
          </div>
        </div>

        <button
          onClick={handleSubmit}
          disabled={loading}
          className="w-full py-5 rounded-xl font-bold text-lg bg-gradient-to-r from-sar-green to-sar-green-dark text-white shadow-xl hover:shadow-2xl transition-all flex items-center justify-center gap-2 disabled:opacity-70"
        >
          {loading ? 'Envoi en cours...' : '✓ Envoyer ma demande'}
        </button>

        <p className="text-center text-gray-400 text-sm mt-6 flex items-center justify-center gap-2">
          <Shield className="w-4 h-4" /> Tes informations sont protegees et confidentielles
        </p>
      </div>
    </section>
  )

  // Success
  const Success = () => (
    <section className="pt-20 pb-8 px-4 min-h-screen bg-gradient-to-b from-green-50 to-white flex items-center">
      <div className="max-w-xl mx-auto text-center">
        <div className="relative mb-8">
          <div className="w-28 h-28 bg-gradient-to-br from-sar-green to-sar-green-dark rounded-full flex items-center justify-center mx-auto shadow-2xl">
            <Check className="w-14 h-14 text-white" strokeWidth={2.5} />
          </div>
        </div>

        <h1 className="text-4xl font-bold text-gray-900 mb-4">Demande envoyee!</h1>
        <p className="text-gray-500 mb-2 text-lg">Merci {formData.prenom}! Notre equipe a bien recu ta demande.</p>
        <p className="text-sar-green font-bold text-xl mb-10">
          Reference: #{reference}
        </p>

        <div className="bg-white rounded-2xl p-8 border border-gray-100 shadow-lg mb-8 text-left">
          <h3 className="font-bold text-gray-900 mb-6 text-lg">Prochaines etapes</h3>
          <ul className="space-y-4">
            {[
              'Tu vas recevoir un courriel de confirmation',
              'Notre equipe analyse ta demande',
              'On te contacte dans les 24-48h ouvrables'
            ].map((text, i) => (
              <li key={i} className="flex items-start gap-4">
                <div className="w-8 h-8 bg-sar-green rounded-full flex items-center justify-center text-white font-bold flex-shrink-0">{i + 1}</div>
                <p className="text-gray-600 pt-1">{text}</p>
              </li>
            ))}
          </ul>
        </div>

        <button
          onClick={() => {
            setStep(0);
            setFormData({ prenom: '', nom: '', telephone: '', courriel: '', sujet: '', message: '', dateReport: '', urgence: 'normal' });
          }}
          className="w-full py-5 rounded-xl font-bold bg-gray-900 text-white hover:bg-gray-800 transition-all"
        >
          Retour a l&apos;accueil
        </button>
      </div>
    </section>
  )

  // FAQ
  const FAQ = () => (
    <section className="py-16 px-4 bg-gray-50">
      <div className="max-w-xl mx-auto">
        <h2 className="text-2xl font-bold text-gray-900 mb-8 text-center">Questions frequentes</h2>
        <div className="space-y-4">
          {faqs.map((faq, i) => (
            <div key={i} className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
              <button
                onClick={() => setExpandedFaq(expandedFaq === i ? null : i)}
                className="w-full p-5 flex items-center justify-between text-left"
              >
                <span className="font-semibold text-gray-800">{faq.q}</span>
                <ChevronDown className={`w-5 h-5 text-sar-green transform transition-transform ${expandedFaq === i ? 'rotate-180' : ''}`} />
              </button>
              {expandedFaq === i && (
                <div className="px-5 pb-5 text-gray-500 border-t border-gray-100 pt-4">
                  {faq.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  )

  // Footer
  const Footer = () => (
    <footer className="bg-gray-900 text-white py-12 px-4">
      <div className="max-w-xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-12 h-12 bg-sar-green rounded-xl flex items-center justify-center">
            <DollarSign className="text-white w-7 h-7" />
          </div>
          <div>
            <h3 className="font-bold">Solution Argent Rapide</h3>
            <p className="text-gray-400 text-sm">Ton partenaire financier</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-8 mb-8">
          <div>
            <h4 className="font-semibold mb-4 text-sar-green">Contact</h4>
            <ul className="space-y-3 text-gray-400">
              <li className="flex items-center gap-2"><Phone className="w-4 h-4" /><span>514 589 1946</span></li>
              <li className="flex items-center gap-2"><Mail className="w-4 h-4" /><span>info@solutionargentrapide.ca</span></li>
              <li className="flex items-center gap-2"><MapPin className="w-4 h-4" /><span>Chambly, QC</span></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-4 text-sar-green">Heures</h4>
            <ul className="space-y-2 text-gray-400 text-sm">
              <li>24h/24, 7j/7</li>
              <li>Service en tout temps</li>
            </ul>
          </div>
        </div>

        <div className="flex items-center justify-center gap-6 py-6 border-t border-gray-800">
          <div className="flex items-center gap-2 text-gray-400">
            <Shield className="w-4 h-4" />
            <span className="text-xs">SSL 256-bit</span>
          </div>
          <div className="flex items-center gap-2 text-gray-400">
            <span className="text-xs">Donnees chiffrees</span>
          </div>
        </div>

        <p className="text-center text-gray-500 text-sm">
          © 2024 Solution Argent Rapide. Tous droits reserves.
        </p>
      </div>
    </footer>
  )

  return (
    <div className="min-h-screen bg-white">
      <Header />
      {step === 0 && (<><Hero /><QuickActions /><FAQ /><Footer /></>)}
      {step === 1 && <Step1 />}
      {step === 2 && <Step2 />}
      {step === 3 && <Step3 />}
      {step === 4 && <Step4 />}
      {step === 5 && <Success />}
    </div>
  )
}
