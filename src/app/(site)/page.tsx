import Link from 'next/link'
import { CheckCircle, Clock, Shield, FileText, DollarSign, Users, Star, Sparkles } from 'lucide-react'

export default function Home() {
  return (
    <>
      {/* Hero Section with Liquid Glass */}
      <section className="relative min-h-[90vh] flex items-center overflow-hidden">
        {/* Animated background orbs */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="orb orb-green w-96 h-96 -top-20 -left-20" style={{ animationDelay: '0s' }}></div>
          <div className="orb orb-gold w-80 h-80 top-1/3 right-10" style={{ animationDelay: '-5s' }}></div>
          <div className="orb orb-green w-64 h-64 bottom-10 left-1/4" style={{ animationDelay: '-10s' }}></div>
          <div className="orb orb-gold w-72 h-72 -bottom-20 right-1/3" style={{ animationDelay: '-15s' }}></div>
        </div>

        {/* Glass hero card */}
        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-4xl mx-auto">
            <div className="glass-dark rounded-[3rem] p-12 md:p-16 text-center text-white">
              <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-full px-4 py-2 mb-6">
                <Sparkles size={16} className="text-sar-gold" />
                <span className="text-sm font-medium">Sans enquete de credit</span>
              </div>

              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 leading-tight">
                Pret rapide entre <span className="text-sar-gold">100$</span> et <span className="text-sar-gold">5 000$</span>
              </h1>

              <p className="text-xl md:text-2xl mb-4 text-sar-gold font-semibold">
                Sans enquete de credit
              </p>

              <p className="text-lg md:text-xl mb-10 opacity-90">
                Obtenez un credit en 24 heures 300 $ a 5000 $ | Financement sans enquete de credit
              </p>

              <Link href="/demandez-votre-credit" className="btn-gold inline-block text-lg">
                Demandez votre credit
              </Link>

              <p className="mt-8 text-sm opacity-70 max-w-lg mx-auto">
                TOUS LES DOSSIERS DE CREDIT SONT ACCEPTES, SOUS RESERVE DE CERTAINES CONDITIONS.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Process Steps */}
      <section className="py-20 relative">
        <div className="container mx-auto px-4">
          <h2 className="section-title text-center">Comment ca fonctionne</h2>
          <p className="section-subtitle text-center">Un processus simple en 3 etapes</p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <div className="card text-center group">
              <div className="icon-glass w-20 h-20 mx-auto mb-6">
                <FileText size={40} className="text-white" />
              </div>
              <div className="step-number mb-3">1</div>
              <h3 className="text-xl font-semibold mb-2 text-gray-800">Appliquez en ligne</h3>
              <p className="text-gray-600">Remplissez le formulaire etape par etape</p>
            </div>

            <div className="card text-center group">
              <div className="icon-glass w-20 h-20 mx-auto mb-6">
                <Shield size={40} className="text-white" />
              </div>
              <div className="step-number mb-3">2</div>
              <h3 className="text-xl font-semibold mb-2 text-gray-800">Verification bancaire (IBV)</h3>
              <p className="text-gray-600">Credit approuve rapidement</p>
            </div>

            <div className="card text-center group">
              <div className="icon-glass w-20 h-20 mx-auto mb-6">
                <DollarSign size={40} className="text-white" />
              </div>
              <div className="step-number mb-3">3</div>
              <h3 className="text-xl font-semibold mb-2 text-gray-800">Profitez de votre argent!</h3>
              <p className="text-gray-600">En seulement 24 h.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 relative">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="card text-center group cursor-pointer">
              <div className="icon-glass w-16 h-16 mx-auto mb-4">
                <Clock size={32} className="text-white" />
              </div>
              <h3 className="font-semibold text-gray-800">Appliquez en moins de 2 minutes</h3>
            </div>
            <div className="card text-center group cursor-pointer">
              <div className="icon-glass w-16 h-16 mx-auto mb-4">
                <DollarSign size={32} className="text-white" />
              </div>
              <h3 className="font-semibold text-gray-800">Obtenez votre argent en 24 heures</h3>
            </div>
            <div className="card text-center group cursor-pointer">
              <div className="icon-glass w-16 h-16 mx-auto mb-4">
                <Shield size={32} className="text-white" />
              </div>
              <h3 className="font-semibold text-gray-800">Aucun impact sur votre pointage de credit</h3>
            </div>
            <div className="card text-center group cursor-pointer">
              <div className="icon-glass w-16 h-16 mx-auto mb-4">
                <FileText size={32} className="text-white" />
              </div>
              <h3 className="font-semibold text-gray-800">Moins de documents a fournir</h3>
            </div>
          </div>
        </div>
      </section>

      {/* Eligibility Criteria */}
      <section className="py-20 relative">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <h2 className="section-title text-center">Criteres d&apos;admissibilite</h2>
            <p className="section-subtitle text-center">Verifiez si vous etes eligible</p>

            <div className="glass rounded-3xl p-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="criteria-item">
                  <CheckCircle className="text-sar-green flex-shrink-0 mt-1" />
                  <span className="text-gray-700">Residence au Quebec, 18 ans ou plus</span>
                </div>
                <div className="criteria-item">
                  <CheckCircle className="text-sar-green flex-shrink-0 mt-1" />
                  <span className="text-gray-700">Meme emploi depuis 3 mois minimum</span>
                </div>
                <div className="criteria-item">
                  <CheckCircle className="text-sar-green flex-shrink-0 mt-1" />
                  <span className="text-gray-700">Revenus de 300$ ou plus par semaine</span>
                </div>
                <div className="criteria-item">
                  <CheckCircle className="text-sar-green flex-shrink-0 mt-1" />
                  <span className="text-gray-700">Numero de telephone en service</span>
                </div>
                <div className="criteria-item md:col-span-2">
                  <CheckCircle className="text-sar-green flex-shrink-0 mt-1" />
                  <span className="text-gray-700">Ne pas etre failli non libere de dettes</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Risk Warning */}
      <section className="py-12 relative">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <div className="glass-warning rounded-3xl p-8 text-center">
              <h3 className="text-xl font-semibold text-yellow-800 mb-4">Emprunter de maniere responsable</h3>
              <p className="text-yellow-700 mb-4">
                Les taux d&apos;interet que nous proposons sont plus eleves que ceux des institutions bancaires conventionnelles.
                Nos solutions de credit urgents doivent etre consideres comme une solution de dernier recours.
              </p>
              <p className="text-yellow-700 mb-4">
                Veuillez noter que le fait de contracter de nombreux prets a court terme ou sur salaire peut remettre
                en question votre situation financiere.
              </p>
              <p className="text-yellow-700">
                Nous vous encourageons a evaluer attentivement votre capacite de remboursement avant de soumettre une demande.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Why Choose Us */}
      <section className="py-20 relative">
        <div className="container mx-auto px-4">
          <h2 className="section-title text-center">Pourquoi nous choisir</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl mx-auto mt-12">
            <div className="card text-center group">
              <div className="icon-glass w-16 h-16 mx-auto mb-4">
                <DollarSign size={32} className="text-white" />
              </div>
              <h3 className="font-semibold text-gray-800">Solutions de credit simples et rapides</h3>
            </div>
            <div className="card text-center group">
              <div className="icon-glass w-16 h-16 mx-auto mb-4">
                <CheckCircle size={32} className="text-white" />
              </div>
              <h3 className="font-semibold text-gray-800">Acceptation du mauvais credit</h3>
            </div>
            <div className="card text-center group">
              <div className="icon-glass w-16 h-16 mx-auto mb-4">
                <Shield size={32} className="text-white" />
              </div>
              <h3 className="font-semibold text-gray-800">Aucune verification de credit</h3>
            </div>
            <div className="card text-center group">
              <div className="icon-glass w-16 h-16 mx-auto mb-4">
                <Users size={32} className="text-white" />
              </div>
              <h3 className="font-semibold text-gray-800">Service base sur la confiance</h3>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Preview */}
      <section className="py-20 relative">
        <div className="container mx-auto px-4">
          <h2 className="section-title text-center">Questions frequentes</h2>

          <div className="max-w-3xl mx-auto space-y-4 mt-12">
            <div className="card">
              <h3 className="font-semibold text-lg mb-2 text-gray-800">Quand vais-je obtenir mon credit?</h3>
              <p className="text-gray-600">Generalement, les fonds sont transferes par virement Interac la journee meme.</p>
            </div>
            <div className="card">
              <h3 className="font-semibold text-lg mb-2 text-gray-800">Comment puis-je faire une demande?</h3>
              <p className="text-gray-600">1. Remplir et envoyer le formulaire. 2. Completer la verification bancaire (IBV). 3. Signer le contrat si approuve. 4. Recevoir les fonds.</p>
            </div>
            <div className="card">
              <h3 className="font-semibold text-lg mb-2 text-gray-800">Comment savoir si le processus est securitaire?</h3>
              <p className="text-gray-600">Le systeme IBV offre un niveau de securite comparable a celui des banques en ligne et n&apos;aura jamais acces a votre identifiant ni mot de passe.</p>
            </div>
          </div>

          <div className="text-center mt-10">
            <Link href="/faq" className="btn-secondary">
              Voir toutes les questions
            </Link>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 relative overflow-hidden">
        {/* Background orbs */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="orb orb-green w-64 h-64 top-0 right-0 opacity-30" style={{ animationDelay: '-3s' }}></div>
          <div className="orb orb-gold w-48 h-48 bottom-0 left-10 opacity-30" style={{ animationDelay: '-8s' }}></div>
        </div>

        <div className="container mx-auto px-4 relative z-10">
          <h2 className="section-title text-center">Temoignages clients</h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto mt-12">
            <div className="testimonial-card">
              <div className="flex mb-4">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} size={20} className="text-sar-gold fill-current" />
                ))}
              </div>
              <p className="text-gray-600 mb-4 italic">
                &quot;Ce que j&apos;ai particulierement apprecie chez Solution argent rapide, c&apos;est leur flexibilite... lorsque mon salaire a augmente, j&apos;ai pu rembourser plus rapidement.&quot;
              </p>
              <p className="font-semibold text-gray-800">Eric Lavoie</p>
              <p className="text-sm text-gray-500">Montreal</p>
            </div>

            <div className="testimonial-card">
              <div className="flex mb-4">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} size={20} className="text-sar-gold fill-current" />
                ))}
              </div>
              <p className="text-gray-600 mb-4 italic">
                &quot;Le service est sans egal! L&apos;argent a ete transfere dans mon compte bancaire la journee meme.&quot;
              </p>
              <p className="font-semibold text-gray-800">Cynthia Bouchard</p>
              <p className="text-sm text-gray-500">Longueuil</p>
            </div>

            <div className="testimonial-card">
              <div className="flex mb-4">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} size={20} className="text-sar-gold fill-current" />
                ))}
              </div>
              <p className="text-gray-600 mb-4 italic">
                &quot;La rapidite et la gentillesse du representant ont ete exceptionnelles.&quot;
              </p>
              <p className="font-semibold text-gray-800">Kathy Beaulieu</p>
              <p className="text-sm text-gray-500">Quebec</p>
            </div>
          </div>
        </div>
      </section>

      {/* Payment Terms */}
      <section className="py-20 relative">
        <div className="container mx-auto px-4">
          <h2 className="section-title text-center">Modalites de remboursement</h2>

          <div className="max-w-3xl mx-auto mt-12">
            <div className="glass rounded-3xl p-8">
              <p className="text-gray-700 mb-6">
                Nous proposons un taux d&apos;interet annuel (TAEG) de 18,99 %.
              </p>
              <p className="text-gray-700 mb-6">
                Chez Solution Argent Rapide, nous etablissons vos paiements minimums en fonction de votre capacite
                de paiement et de la duree de remboursement que vous preferez.
              </p>

              <div className="bg-yellow-50/80 backdrop-blur-sm border border-yellow-200/50 rounded-2xl p-4 mb-6">
                <p className="text-yellow-800">
                  <strong>Remarque :</strong> Les frais d&apos;adhesion sont applicables tant qu&apos;il reste un solde
                  a rembourser sur votre credit.
                </p>
              </div>

              <ul className="space-y-3">
                <li className="flex items-start gap-3">
                  <CheckCircle className="text-sar-green flex-shrink-0 mt-1" />
                  <span className="text-gray-700">Taux d&apos;interet annuel (TAEG) de 18,99%</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle className="text-sar-green flex-shrink-0 mt-1" />
                  <span className="text-gray-700">Paiements minimums ajustes a votre capacite</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle className="text-sar-green flex-shrink-0 mt-1" />
                  <span className="text-gray-700">Frais d&apos;adhesion applicables tant qu&apos;un solde existe</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle className="text-sar-green flex-shrink-0 mt-1" />
                  <span className="text-gray-700">Remboursement minimum: 5% du montant utilise</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle className="text-sar-green flex-shrink-0 mt-1" />
                  <span className="text-gray-700">Periode typique: 3 a 6 mois</span>
                </li>
              </ul>

              <div className="mt-6 p-4 bg-white/50 backdrop-blur-sm rounded-2xl border border-white/50">
                <p className="text-sm text-gray-600">
                  <strong>Exemple:</strong> Un retrait de 750$ avec des versements bihebdomadaires de 110,75$
                  sur 10 versements, incluant des frais d&apos;adhesion hebdomadaires de 22,50$.
                  Un remboursement anticipe complet ou partiel est permis en tout temps.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Financial Support & Credit Score */}
      <section className="py-20 relative">
        <div className="container mx-auto px-4">
          <h2 className="section-title text-center">Soutien financier et cote de credit</h2>

          <div className="max-w-3xl mx-auto mt-12">
            <div className="glass rounded-3xl p-8">
              <p className="text-gray-700 mb-6">
                Solution Argent Rapide respecte strictement les normes legales canadiennes. Notre service a la
                clientele vous assiste pour les reports de paiement ou toute autre demande pendant la duree
                de votre credit.
              </p>

              <div className="bg-sar-green/10 backdrop-blur-sm border border-sar-green/20 rounded-2xl p-6 mb-6">
                <h3 className="font-semibold text-sar-green mb-3">Impact sur votre cote de credit</h3>
                <p className="text-gray-700">
                  Les transactions effectuees avec notre option de credit n&apos;ont aucun impact sur votre cote de credit,
                  car nous ne transmettons pas d&apos;informations aux bureaux de credit.
                </p>
              </div>

              <ul className="space-y-3">
                <li className="flex items-start gap-3">
                  <CheckCircle className="text-sar-green flex-shrink-0 mt-1" />
                  <span className="text-gray-700">Aucune verification de credit traditionnelle</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle className="text-sar-green flex-shrink-0 mt-1" />
                  <span className="text-gray-700">Pas de transmission aux bureaux de credit</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle className="text-sar-green flex-shrink-0 mt-1" />
                  <span className="text-gray-700">Service clientele disponible pour vous aider</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle className="text-sar-green flex-shrink-0 mt-1" />
                  <span className="text-gray-700">Reports de paiement possibles sur demande</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Repayment Policy */}
      <section className="py-20 relative">
        <div className="container mx-auto px-4">
          <h2 className="section-title text-center">Politique de remboursement</h2>

          <div className="max-w-3xl mx-auto mt-12">
            <div className="glass rounded-3xl p-8">
              <p className="text-gray-700 mb-6">
                Les options de credit variable sont generalement remboursees sur une periode de 3 a 6 mois.
                Nos produits sont concus pour une utilisation occasionnelle avec un remboursement complet
                dans les semaines suivantes.
              </p>

              <div className="bg-blue-50/80 backdrop-blur-sm border border-blue-200/50 rounded-2xl p-4 mb-6">
                <p className="text-blue-800">
                  <strong>Important :</strong> Le montant rembourse ne peut etre inferieur a 5% du montant
                  utilise sur votre credit.
                </p>
              </div>

              <ul className="space-y-3">
                <li className="flex items-start gap-3">
                  <CheckCircle className="text-sar-green flex-shrink-0 mt-1" />
                  <span className="text-gray-700">Duree de remboursement typique: 3 a 6 mois</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle className="text-sar-green flex-shrink-0 mt-1" />
                  <span className="text-gray-700">Remboursement minimum: 5% du montant utilise</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle className="text-sar-green flex-shrink-0 mt-1" />
                  <span className="text-gray-700">Remboursement anticipe permis en tout temps</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle className="text-sar-green flex-shrink-0 mt-1" />
                  <span className="text-gray-700">Aucune penalite pour remboursement anticipe</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle className="text-sar-green flex-shrink-0 mt-1" />
                  <span className="text-gray-700">Flexibilite des versements selon votre situation</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 relative overflow-hidden">
        {/* Background orbs */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="orb orb-gold w-96 h-96 -top-20 -right-20 opacity-40" style={{ animationDelay: '-2s' }}></div>
          <div className="orb orb-green w-80 h-80 bottom-0 -left-20 opacity-40" style={{ animationDelay: '-7s' }}></div>
        </div>

        <div className="container mx-auto px-4 relative z-10">
          <div className="glass-dark rounded-[3rem] p-12 md:p-16 text-center text-white max-w-4xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Pret a obtenir votre credit?</h2>
            <p className="text-xl mb-10 opacity-90">Les transactions n&apos;ont aucun impact sur votre cote de credit</p>
            <Link href="/demandez-votre-credit" className="btn-gold inline-block text-lg">
              Demandez votre credit maintenant
            </Link>
          </div>
        </div>
      </section>
    </>
  )
}
