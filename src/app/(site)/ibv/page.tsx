import { Shield, AlertCircle, Search, Globe, CheckCircle } from 'lucide-react'
import Link from 'next/link'

export default function IBVPage() {
  return (
    <div className="py-16">
      <div className="container mx-auto px-4">
        <h1 className="section-title text-center">Problèmes de vérification bancaire (IBV)</h1>
        <p className="section-subtitle text-center">Solutions aux problèmes courants avec la vérification bancaire instantanée</p>

        <div className="max-w-4xl mx-auto">
          {/* What is IBV */}
          <section className="mb-12">
            <div className="card">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-sar-green rounded-full flex items-center justify-center flex-shrink-0">
                  <Shield className="text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold mb-3">Qu&apos;est-ce que la vérification bancaire instantanée (IBV)?</h2>
                  <p className="text-gray-600">
                    Le système IBV permet aux institutions de consulter les comptes et transactions. Il vérifie l&apos;identité et fournit une copie sécurisée des relevés bancaires pour une analyse rapide du dossier. Cette méthode permet des décisions d&apos;approbation plus rapides sans nécessiter de vérification de crédit traditionnelle.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Security */}
          <section className="mb-12">
            <h2 className="text-2xl font-semibold mb-6">Sécurité du processus</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="card">
                <CheckCircle className="text-sar-green mb-3" size={32} />
                <h3 className="font-semibold mb-2">Confidentialité garantie</h3>
                <p className="text-gray-600">Le système IBV offre une confidentialité équivalente à celle des banques en ligne et n&apos;accède jamais à votre nom d&apos;utilisateur ni à votre mot de passe.</p>
              </div>
              <div className="card">
                <CheckCircle className="text-sar-green mb-3" size={32} />
                <h3 className="font-semibold mb-2">Lecture seule</h3>
                <p className="text-gray-600">Le système IBV ne transmet qu&apos;une copie en lecture seule des relevés bancaires. Nous ne pouvons jamais nous connecter à votre compte bancaire.</p>
              </div>
            </div>
          </section>

          {/* Common Issues */}
          <section className="mb-12">
            <h2 className="text-2xl font-semibold mb-6">Problèmes courants et solutions</h2>

            <div className="space-y-6">
              <div className="card">
                <div className="flex items-start gap-4">
                  <AlertCircle className="text-sar-gold flex-shrink-0 mt-1" />
                  <div>
                    <h3 className="font-semibold mb-2">Accès au compte bancaire</h3>
                    <p className="text-gray-600">
                      Après avoir choisi votre institution financière, vous devez vous connecter à votre compte comme vous le faites normalement. Utilisez les mêmes identifiants que pour votre banque en ligne.
                    </p>
                  </div>
                </div>
              </div>

              <div className="card">
                <div className="flex items-start gap-4">
                  <AlertCircle className="text-sar-gold flex-shrink-0 mt-1" />
                  <div>
                    <h3 className="font-semibold mb-2">Code de vérification non reçu</h3>
                    <p className="text-gray-600">
                      Après avoir sélectionné votre institution bancaire et vous être connecté, vous recevrez un code de vérification par courriel ou SMS envoyé par votre banque. Si le code n&apos;arrive pas, contactez votre banque directement pour vérifier que votre adresse courriel et votre numéro de téléphone sont à jour dans vos informations de compte.
                    </p>
                  </div>
                </div>
              </div>

              <div className="card">
                <div className="flex items-start gap-4">
                  <Search className="text-sar-gold flex-shrink-0 mt-1" />
                  <div>
                    <h3 className="font-semibold mb-2">Trouver votre institution financière</h3>
                    <p className="text-gray-600">
                      Utilisez le champ de recherche au-dessus des logos des banques. Par exemple, recherchez &quot;Desjardins&quot; pour les caisses populaires ou &quot;National&quot; pour localiser la Banque Nationale.
                    </p>
                  </div>
                </div>
              </div>

              <div className="card">
                <div className="flex items-start gap-4">
                  <Globe className="text-sar-gold flex-shrink-0 mt-1" />
                  <div>
                    <h3 className="font-semibold mb-2">Changer la langue</h3>
                    <p className="text-gray-600">
                      Vous pouvez modifier la langue de l&apos;interface en cliquant sur l&apos;option de langue située au-dessus des logos des banques.
                    </p>
                  </div>
                </div>
              </div>

              <div className="card">
                <div className="flex items-start gap-4">
                  <AlertCircle className="text-sar-gold flex-shrink-0 mt-1" />
                  <div>
                    <h3 className="font-semibold mb-2">Adresse courriel non reconnue</h3>
                    <p className="text-gray-600">
                      L&apos;adresse courriel doit correspondre exactement à celle enregistrée auprès de votre institution financière, sinon le système bloquera la demande. Vérifiez vos informations bancaires.
                    </p>
                  </div>
                </div>
              </div>

              <div className="card">
                <div className="flex items-start gap-4">
                  <AlertCircle className="text-sar-gold flex-shrink-0 mt-1" />
                  <div>
                    <h3 className="font-semibold mb-2">Trop de tentatives</h3>
                    <p className="text-gray-600">
                      Par mesure de sécurité, le système bloque après trop d&apos;essais. Recommencez le lendemain après avoir vérifié que vous utilisez les bonnes informations.
                    </p>
                  </div>
                </div>
              </div>

              <div className="card">
                <div className="flex items-start gap-4">
                  <AlertCircle className="text-sar-gold flex-shrink-0 mt-1" />
                  <div>
                    <h3 className="font-semibold mb-2">Problèmes avec la signature électronique</h3>
                    <p className="text-gray-600">
                      Vérifiez que tous les champs obligatoires (initiales et signature) sont remplis. Le bouton &quot;Envoyer&quot; n&apos;apparaît que lorsque le formulaire est complètement rempli.
                    </p>
                  </div>
                </div>
              </div>

              <div className="card">
                <div className="flex items-start gap-4">
                  <AlertCircle className="text-sar-gold flex-shrink-0 mt-1" />
                  <div>
                    <h3 className="font-semibold mb-2">Adobe Acrobat en anglais</h3>
                    <p className="text-gray-600">
                      Cliquez sur les trois traits en haut à gauche et choisissez la langue désirée (option au bas de la liste).
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* CTA */}
          <section className="text-center">
            <p className="text-gray-600 mb-6">
              Vous avez encore des problèmes? Contactez-nous pour obtenir de l&apos;aide.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/nous-joindre" className="btn-primary">
                Nous contacter
              </Link>
              <Link href="/faq" className="btn-secondary">
                Voir la FAQ complète
              </Link>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
