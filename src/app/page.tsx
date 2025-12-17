import Link from 'next/link'
import { CheckCircle, Clock, Shield, FileText, DollarSign, Users, Star } from 'lucide-react'

export default function Home() {
  return (
    <>
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-sar-green to-sar-green-dark text-white py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6">
              Pret rapide entre 100$ et 5 000$
            </h1>
            <p className="text-xl md:text-2xl mb-4 text-sar-gold font-semibold">
              Sans enquete de credit
            </p>
            <p className="text-lg md:text-xl mb-8 opacity-90">
              Obtenez un credit en 24 heures 300 $ a 5000 $ | Financement sans enquete de credit
            </p>
            <Link href="/demandez-votre-credit" className="inline-block bg-sar-gold hover:bg-yellow-600 text-white font-bold py-4 px-10 rounded-lg text-lg transition-all duration-300 shadow-lg hover:shadow-xl">
              Demandez votre credit
            </Link>
            <p className="mt-6 text-sm opacity-80">
              TOUS LES DOSSIERS DE CREDIT SONT ACCEPTES, SOUS RESERVE DE CERTAINES CONDITIONS.
            </p>
          </div>
        </div>
      </section>

      {/* Process Steps */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <h2 className="section-title text-center">Comment ca fonctionne</h2>
          <p className="section-subtitle text-center">Un processus simple en 3 etapes</p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <div className="text-center">
              <div className="w-20 h-20 bg-sar-green rounded-full flex items-center justify-center mx-auto mb-4">
                <FileText size={40} className="text-white" />
              </div>
              <div className="text-3xl font-bold text-sar-green mb-2">1</div>
              <h3 className="text-xl font-semibold mb-2">Appliquez en ligne</h3>
              <p className="text-gray-600">Remplissez le formulaire etape par etape</p>
            </div>

            <div className="text-center">
              <div className="w-20 h-20 bg-sar-green rounded-full flex items-center justify-center mx-auto mb-4">
                <Shield size={40} className="text-white" />
              </div>
              <div className="text-3xl font-bold text-sar-green mb-2">2</div>
              <h3 className="text-xl font-semibold mb-2">Verification bancaire (IBV)</h3>
              <p className="text-gray-600">Credit approuve rapidement</p>
            </div>

            <div className="text-center">
              <div className="w-20 h-20 bg-sar-green rounded-full flex items-center justify-center mx-auto mb-4">
                <DollarSign size={40} className="text-white" />
              </div>
              <div className="text-3xl font-bold text-sar-green mb-2">3</div>
              <h3 className="text-xl font-semibold mb-2">Profitez de votre argent!</h3>
              <p className="text-gray-600">En seulement 24 h.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-16 bg-sar-grey">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="card text-center">
              <Clock size={48} className="text-sar-green mx-auto mb-4" />
              <h3 className="font-semibold mb-2">Appliquez en moins de 2 minutes</h3>
            </div>
            <div className="card text-center">
              <DollarSign size={48} className="text-sar-green mx-auto mb-4" />
              <h3 className="font-semibold mb-2">Obtenez votre argent en 24 heures</h3>
            </div>
            <div className="card text-center">
              <Shield size={48} className="text-sar-green mx-auto mb-4" />
              <h3 className="font-semibold mb-2">Aucun impact sur votre pointage de credit</h3>
            </div>
            <div className="card text-center">
              <FileText size={48} className="text-sar-green mx-auto mb-4" />
              <h3 className="font-semibold mb-2">Moins de documents a fournir</h3>
            </div>
          </div>
        </div>
      </section>

      {/* Eligibility Criteria */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <h2 className="section-title text-center">Criteres d&apos;admissibilite</h2>
            <p className="section-subtitle text-center">Verifiez si vous etes eligible</p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-start gap-3 p-4 bg-sar-grey rounded-lg">
                <CheckCircle className="text-sar-green flex-shrink-0 mt-1" />
                <span>Residence au Quebec, 18 ans ou plus</span>
              </div>
              <div className="flex items-start gap-3 p-4 bg-sar-grey rounded-lg">
                <CheckCircle className="text-sar-green flex-shrink-0 mt-1" />
                <span>Meme emploi depuis 3 mois minimum</span>
              </div>
              <div className="flex items-start gap-3 p-4 bg-sar-grey rounded-lg">
                <CheckCircle className="text-sar-green flex-shrink-0 mt-1" />
                <span>Revenus de 300$ ou plus par semaine</span>
              </div>
              <div className="flex items-start gap-3 p-4 bg-sar-grey rounded-lg">
                <CheckCircle className="text-sar-green flex-shrink-0 mt-1" />
                <span>Numero de telephone en service</span>
              </div>
              <div className="flex items-start gap-3 p-4 bg-sar-grey rounded-lg md:col-span-2">
                <CheckCircle className="text-sar-green flex-shrink-0 mt-1" />
                <span>Ne pas etre failli non libere de dettes</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Risk Warning */}
      <section className="py-12 bg-yellow-50 border-y border-yellow-200">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <h3 className="text-xl font-semibold text-yellow-800 mb-4">Les risques</h3>
            <p className="text-yellow-700 mb-2">
              Veuillez noter que le fait de contracter de nombreux prets a court terme ou sur salaire peut remettre en question votre situation financiere.
            </p>
            <p className="text-yellow-700">
              Les taux d&apos;interet que nous proposons sont plus eleves que ceux des institutions bancaires conventionnelles.
            </p>
          </div>
        </div>
      </section>

      {/* Why Choose Us */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <h2 className="section-title text-center">Pourquoi nous choisir</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl mx-auto">
            <div className="text-center p-6">
              <div className="w-16 h-16 bg-sar-green-light rounded-full flex items-center justify-center mx-auto mb-4">
                <DollarSign size={32} className="text-white" />
              </div>
              <h3 className="font-semibold mb-2">Solutions de credit simples et rapides</h3>
            </div>
            <div className="text-center p-6">
              <div className="w-16 h-16 bg-sar-green-light rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle size={32} className="text-white" />
              </div>
              <h3 className="font-semibold mb-2">Acceptation du mauvais credit</h3>
            </div>
            <div className="text-center p-6">
              <div className="w-16 h-16 bg-sar-green-light rounded-full flex items-center justify-center mx-auto mb-4">
                <Shield size={32} className="text-white" />
              </div>
              <h3 className="font-semibold mb-2">Aucune verification de credit</h3>
            </div>
            <div className="text-center p-6">
              <div className="w-16 h-16 bg-sar-green-light rounded-full flex items-center justify-center mx-auto mb-4">
                <Users size={32} className="text-white" />
              </div>
              <h3 className="font-semibold mb-2">Service base sur la confiance</h3>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Preview */}
      <section className="py-16 bg-sar-grey">
        <div className="container mx-auto px-4">
          <h2 className="section-title text-center">Questions frequentes</h2>

          <div className="max-w-3xl mx-auto space-y-4">
            <div className="card">
              <h3 className="font-semibold text-lg mb-2">Quand vais-je obtenir mon credit?</h3>
              <p className="text-gray-600">Generalement, les fonds sont transferes par virement Interac la journee meme.</p>
            </div>
            <div className="card">
              <h3 className="font-semibold text-lg mb-2">Comment puis-je faire une demande?</h3>
              <p className="text-gray-600">1. Remplir et envoyer le formulaire. 2. Completer la verification bancaire (IBV). 3. Signer le contrat si approuve. 4. Recevoir les fonds.</p>
            </div>
            <div className="card">
              <h3 className="font-semibold text-lg mb-2">Comment savoir si le processus est securitaire?</h3>
              <p className="text-gray-600">Le systeme IBV offre un niveau de securite comparable a celui des banques en ligne et n&apos;aura jamais acces a votre identifiant ni mot de passe.</p>
            </div>
          </div>

          <div className="text-center mt-8">
            <Link href="/faq" className="btn-secondary">
              Voir toutes les questions
            </Link>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <h2 className="section-title text-center">Temoignages clients</h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            <div className="card">
              <div className="flex mb-4">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} size={20} className="text-sar-gold fill-current" />
                ))}
              </div>
              <p className="text-gray-600 mb-4 italic">
                &quot;Ce que j&apos;ai particulierement apprecie chez Solution argent rapide, c&apos;est leur flexibilite... lorsque mon salaire a augmente, j&apos;ai pu rembourser plus rapidement.&quot;
              </p>
              <p className="font-semibold">Eric Lavoie</p>
              <p className="text-sm text-gray-500">Montreal</p>
            </div>

            <div className="card">
              <div className="flex mb-4">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} size={20} className="text-sar-gold fill-current" />
                ))}
              </div>
              <p className="text-gray-600 mb-4 italic">
                &quot;Le service est sans egal! L&apos;argent a ete transfere dans mon compte bancaire la journee meme.&quot;
              </p>
              <p className="font-semibold">Cynthia Bouchard</p>
              <p className="text-sm text-gray-500">Longueuil</p>
            </div>

            <div className="card">
              <div className="flex mb-4">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} size={20} className="text-sar-gold fill-current" />
                ))}
              </div>
              <p className="text-gray-600 mb-4 italic">
                &quot;La rapidite et la gentillesse du representant ont ete exceptionnelles.&quot;
              </p>
              <p className="font-semibold">Kathy Beaulieu</p>
              <p className="text-sm text-gray-500">Quebec</p>
            </div>
          </div>
        </div>
      </section>

      {/* Payment Terms */}
      <section className="py-16 bg-sar-grey">
        <div className="container mx-auto px-4">
          <h2 className="section-title text-center">Modalites de remboursement</h2>

          <div className="max-w-3xl mx-auto">
            <div className="card">
              <ul className="space-y-3">
                <li className="flex items-start gap-3">
                  <CheckCircle className="text-sar-green flex-shrink-0 mt-1" />
                  <span>Taux d&apos;interet annuel (TAEG) de 18,99%</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle className="text-sar-green flex-shrink-0 mt-1" />
                  <span>Paiements minimums ajustes a votre capacite</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle className="text-sar-green flex-shrink-0 mt-1" />
                  <span>Frais d&apos;adhesion applicables tant qu&apos;un solde existe</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle className="text-sar-green flex-shrink-0 mt-1" />
                  <span>Remboursement minimum: 5% du montant utilise</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle className="text-sar-green flex-shrink-0 mt-1" />
                  <span>Periode typique: 3 a 6 mois</span>
                </li>
              </ul>

              <div className="mt-6 p-4 bg-sar-grey rounded-lg">
                <p className="text-sm text-gray-600">
                  <strong>Exemple:</strong> 750$ avec remboursements bihebdomadaires de 110,75$ sur 10 versements
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-br from-sar-green to-sar-green-dark text-white">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Pret a obtenir votre credit?</h2>
          <p className="text-xl mb-8 opacity-90">Les transactions n&apos;ont aucun impact sur votre cote de credit</p>
          <Link href="/demandez-votre-credit" className="inline-block bg-sar-gold hover:bg-yellow-600 text-white font-bold py-4 px-10 rounded-lg text-lg transition-all duration-300 shadow-lg hover:shadow-xl">
            Demandez votre credit maintenant
          </Link>
        </div>
      </section>
    </>
  )
}
