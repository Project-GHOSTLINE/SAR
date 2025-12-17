import Link from 'next/link'
import { CheckCircle, Clock, Shield, Lock, Phone, Zap, BadgeCheck, Star } from 'lucide-react'

export default function Home() {
  return (
    <>
      {/* Hero Section - Mobile first */}
      <section className="relative min-h-[80vh] md:min-h-[85vh] flex items-center py-8 md:py-0 overflow-hidden">
        {/* Background orbs - hidden on mobile for performance */}
        <div className="hidden md:block absolute inset-0 overflow-hidden">
          <div className="orb orb-green w-96 h-96 -top-20 -left-20"></div>
          <div className="orb orb-gold w-80 h-80 top-1/3 right-10"></div>
        </div>

        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-4xl mx-auto">
            <div className="glass-dark rounded-2xl md:rounded-[2.5rem] p-6 md:p-12 text-white">

              {/* Badge */}
              <div className="inline-flex items-center gap-2 bg-white/15 rounded-full px-3 py-1.5 mb-4 md:mb-6">
                <span className="w-2 h-2 bg-sar-gold rounded-full animate-pulse"></span>
                <span className="text-xs md:text-sm">On est la pour vous aider</span>
              </div>

              {/* Title */}
              <h1 className="text-2xl md:text-4xl lg:text-5xl font-bold mb-4 md:mb-6 leading-tight">
                Besoin d&apos;argent?{' '}
                <span className="text-sar-gold block md:inline">On vous comprend.</span>
              </h1>

              {/* Subtitle */}
              <p className="text-base md:text-lg mb-6 opacity-90 leading-relaxed max-w-xl">
                Obtenez entre <strong className="text-sar-gold">300$</strong> et <strong className="text-sar-gold">5 000$</strong> en 24h.
                Pas de jugement, pas de stress.
              </p>

              {/* CTA */}
              <Link href="/demandez-votre-credit" className="btn-gold inline-block mb-4">
                Faire ma demande
              </Link>

              {/* Trust badges - stacked on mobile */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-6 md:mt-8">
                <div className="flex items-center gap-3 bg-white/10 rounded-xl p-3">
                  <Shield size={20} className="text-sar-gold flex-shrink-0" />
                  <span className="text-sm">Sans enquete de credit</span>
                </div>
                <div className="flex items-center gap-3 bg-white/10 rounded-xl p-3">
                  <Zap size={20} className="text-sar-gold flex-shrink-0" />
                  <span className="text-sm">Argent en 24h</span>
                </div>
                <div className="flex items-center gap-3 bg-white/10 rounded-xl p-3">
                  <Lock size={20} className="text-sar-gold flex-shrink-0" />
                  <span className="text-sm">100% securise</span>
                </div>
              </div>
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
              Une urgence peut arriver a n&apos;importe qui. On est la pour vous aider.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 max-w-4xl mx-auto">
            <div className="card text-center">
              <div className="text-3xl mb-3">🚗</div>
              <h3 className="font-semibold text-gray-800 mb-1">Reparation urgente</h3>
              <p className="text-gray-600 text-sm">Auto, maison, electromenager</p>
            </div>
            <div className="card text-center">
              <div className="text-3xl mb-3">💊</div>
              <h3 className="font-semibold text-gray-800 mb-1">Depenses medicales</h3>
              <p className="text-gray-600 text-sm">Soins non couverts</p>
            </div>
            <div className="card text-center">
              <div className="text-3xl mb-3">📅</div>
              <h3 className="font-semibold text-gray-800 mb-1">Fin de mois</h3>
              <p className="text-gray-600 text-sm">Loyer, factures, epicerie</p>
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
                <h3 className="font-semibold text-gray-800 mb-1">Verification</h3>
                <p className="text-gray-600 text-sm">Connexion bancaire securisee</p>
              </div>

              <div className="glass p-5 md:p-6 text-center">
                <div className="w-12 h-12 bg-sar-gold rounded-xl flex items-center justify-center mx-auto mb-3 text-white font-bold text-lg">
                  3
                </div>
                <h3 className="font-semibold text-gray-800 mb-1">Argent recu</h3>
                <p className="text-gray-600 text-sm">Virement Interac meme jour</p>
              </div>
            </div>

            <div className="text-center mt-8">
              <Link href="/demandez-votre-credit" className="btn-primary">
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
                <h2 className="text-xl md:text-2xl font-bold text-gray-800 mb-2">Vos donnees sont protegees</h2>
                <p className="text-gray-600 text-sm md:text-base">Securite bancaire. Donnees jamais partagees.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                <CheckCircle size={18} className="text-sar-green flex-shrink-0" />
                <span className="text-sm text-gray-700">Chiffrement SSL 256-bit</span>
              </div>
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                <CheckCircle size={18} className="text-sar-green flex-shrink-0" />
                <span className="text-sm text-gray-700">Aucun acces a vos identifiants</span>
              </div>
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                <CheckCircle size={18} className="text-sar-green flex-shrink-0" />
                <span className="text-sm text-gray-700">Conforme lois quebecoises</span>
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
              <h2 className="section-title">Etes-vous eligible?</h2>
              <p className="text-gray-600">4 criteres simples</p>
            </div>

            <div className="glass rounded-2xl p-5 md:p-8">
              <div className="space-y-3 md:space-y-4">
                <div className="flex items-center gap-4 p-3 md:p-4 bg-white/60 rounded-xl">
                  <CheckCircle size={22} className="text-sar-green flex-shrink-0" />
                  <div>
                    <p className="font-medium text-gray-800">Resident du Quebec, 18+</p>
                  </div>
                </div>
                <div className="flex items-center gap-4 p-3 md:p-4 bg-white/60 rounded-xl">
                  <CheckCircle size={22} className="text-sar-green flex-shrink-0" />
                  <div>
                    <p className="font-medium text-gray-800">Emploi stable (3 mois min)</p>
                  </div>
                </div>
                <div className="flex items-center gap-4 p-3 md:p-4 bg-white/60 rounded-xl">
                  <CheckCircle size={22} className="text-sar-green flex-shrink-0" />
                  <div>
                    <p className="font-medium text-gray-800">Revenu 300$/semaine minimum</p>
                  </div>
                </div>
                <div className="flex items-center gap-4 p-3 md:p-4 bg-white/60 rounded-xl">
                  <CheckCircle size={22} className="text-sar-green flex-shrink-0" />
                  <div>
                    <p className="font-medium text-gray-800">Compte bancaire actif</p>
                  </div>
                </div>
              </div>

              <div className="mt-6 p-4 bg-sar-green/5 rounded-xl text-center">
                <p className="text-gray-700 text-sm md:text-base">
                  <strong className="text-sar-green">Mauvais credit?</strong> Pas de probleme! On ne fait pas d&apos;enquete traditionnelle.
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
                &quot;Reparation urgente sur ma voiture. En moins de 24h, j&apos;avais l&apos;argent. Merci!&quot;
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
                &quot;Service incroyable! L&apos;argent etait dans mon compte le jour meme.&quot;
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
                &quot;Tout etait clair et bien explique. Pas de surprises!&quot;
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

      {/* Transparency - Rates */}
      <section className="py-12 md:py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto">
            <div className="text-center mb-8">
              <h2 className="section-title">Transparence totale</h2>
              <p className="text-gray-600">Pas de frais caches</p>
            </div>

            <div className="glass rounded-2xl p-5 md:p-8">
              <div className="space-y-4 mb-6">
                <div className="flex justify-between items-center pb-3 border-b border-gray-100">
                  <span className="text-gray-600">Taux annuel (TAEG)</span>
                  <span className="font-bold text-gray-800">18,99%</span>
                </div>
                <div className="flex justify-between items-center pb-3 border-b border-gray-100">
                  <span className="text-gray-600">Duree remboursement</span>
                  <span className="font-bold text-gray-800">3 a 6 mois</span>
                </div>
                <div className="flex justify-between items-center pb-3 border-b border-gray-100">
                  <span className="text-gray-600">Paiement minimum</span>
                  <span className="font-bold text-gray-800">5% du solde</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Penalite remboursement anticipe</span>
                  <span className="font-bold text-sar-green">Aucune</span>
                </div>
              </div>

              <div className="bg-gray-50 rounded-xl p-4">
                <p className="text-sm text-gray-600">
                  <strong>Exemple:</strong> Pret de 750$ = 10 versements de 110,75$ aux 2 semaines
                </p>
              </div>
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
                    Nos solutions sont pour les urgences ponctuelles. Les taux sont plus eleves que les banques traditionnelles.
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
            <h2 className="section-title">Questions frequentes</h2>
          </div>

          <div className="max-w-2xl mx-auto space-y-3 md:space-y-4">
            <div className="card">
              <h3 className="font-semibold text-gray-800 mb-2">Quand vais-je recevoir l&apos;argent?</h3>
              <p className="text-gray-600 text-sm">Virement Interac le jour meme dans la plupart des cas.</p>
            </div>
            <div className="card">
              <h3 className="font-semibold text-gray-800 mb-2">Est-ce que ca affecte mon credit?</h3>
              <p className="text-gray-600 text-sm">Non. Pas d&apos;enquete traditionnelle, pas de rapport aux bureaux de credit.</p>
            </div>
            <div className="card">
              <h3 className="font-semibold text-gray-800 mb-2">La verification est-elle securitaire?</h3>
              <p className="text-gray-600 text-sm">Oui. Chiffrement SSL 256-bit. On n&apos;a jamais acces a vos identifiants.</p>
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
            <h2 className="text-xl md:text-2xl font-bold text-gray-800 mb-3">Des questions?</h2>
            <p className="text-gray-600 mb-6">On est disponible 24h/24, 7j/7</p>

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <a href="tel:5145891946" className="btn-primary flex items-center justify-center gap-2">
                <Phone size={18} />
                514 589 1946
              </a>
              <Link href="/nous-joindre" className="btn-secondary">
                Nous ecrire
              </Link>
            </div>

            <div className="mt-6 inline-flex items-center gap-2 text-sm text-sar-green">
              <span className="w-2 h-2 bg-sar-green rounded-full animate-pulse"></span>
              Service actif maintenant
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-12 md:py-20">
        <div className="container mx-auto px-4">
          <div className="glass-dark rounded-2xl md:rounded-3xl p-8 md:p-12 text-center text-white max-w-3xl mx-auto">
            <h2 className="text-2xl md:text-3xl font-bold mb-3">Pret a commencer?</h2>
            <p className="text-base md:text-lg mb-6 opacity-90">Rapide, simple, sans engagement.</p>
            <Link href="/demandez-votre-credit" className="btn-gold inline-block">
              Faire ma demande
            </Link>
            <p className="mt-4 text-xs md:text-sm opacity-70">
              Aucun impact sur votre cote de credit
            </p>
          </div>
        </div>
      </section>
    </>
  )
}
