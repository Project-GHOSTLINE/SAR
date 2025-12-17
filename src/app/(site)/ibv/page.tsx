import { Shield, AlertCircle, Search, Globe, CheckCircle } from 'lucide-react'
import Link from 'next/link'

export default function IBVPage() {
  return (
    <div className="py-16">
      <div className="container mx-auto px-4">
        <h1 className="section-title text-center">Problemes de verification bancaire (IBV)</h1>
        <p className="section-subtitle text-center">Solutions aux problemes courants avec la verification bancaire instantanee</p>

        <div className="max-w-4xl mx-auto">
          {/* What is IBV */}
          <section className="mb-12">
            <div className="card">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-sar-green rounded-full flex items-center justify-center flex-shrink-0">
                  <Shield className="text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold mb-3">Qu&apos;est-ce que la verification bancaire instantanee (IBV)?</h2>
                  <p className="text-gray-600">
                    Le systeme IBV permet aux institutions de consulter les comptes et transactions. Il verifie l&apos;identite et fournit une copie securisee des releves bancaires pour une analyse rapide du dossier. Cette methode permet des decisions d&apos;approbation plus rapides sans necessiter de verification de credit traditionnelle.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Security */}
          <section className="mb-12">
            <h2 className="text-2xl font-semibold mb-6">Securite du processus</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="card">
                <CheckCircle className="text-sar-green mb-3" size={32} />
                <h3 className="font-semibold mb-2">Confidentialite garantie</h3>
                <p className="text-gray-600">Le systeme IBV offre une confidentialite equivalente a celle des banques en ligne et n&apos;accede jamais a votre nom d&apos;utilisateur ni a votre mot de passe.</p>
              </div>
              <div className="card">
                <CheckCircle className="text-sar-green mb-3" size={32} />
                <h3 className="font-semibold mb-2">Lecture seule</h3>
                <p className="text-gray-600">Le systeme IBV ne transmet qu&apos;une copie en lecture seule des releves bancaires. Nous ne pouvons jamais nous connecter a votre compte bancaire.</p>
              </div>
            </div>
          </section>

          {/* Common Issues */}
          <section className="mb-12">
            <h2 className="text-2xl font-semibold mb-6">Problemes courants et solutions</h2>

            <div className="space-y-6">
              <div className="card">
                <div className="flex items-start gap-4">
                  <AlertCircle className="text-sar-gold flex-shrink-0 mt-1" />
                  <div>
                    <h3 className="font-semibold mb-2">Acces au compte bancaire</h3>
                    <p className="text-gray-600">
                      Apres avoir choisi votre institution financiere, vous devez vous connecter a votre compte comme vous le faites normalement. Utilisez les memes identifiants que pour votre banque en ligne.
                    </p>
                  </div>
                </div>
              </div>

              <div className="card">
                <div className="flex items-start gap-4">
                  <AlertCircle className="text-sar-gold flex-shrink-0 mt-1" />
                  <div>
                    <h3 className="font-semibold mb-2">Code de verification non recu</h3>
                    <p className="text-gray-600">
                      Apres avoir selectionne votre institution bancaire et vous etre connecte, vous recevrez un code de verification par courriel ou SMS envoye par votre banque. Si le code n&apos;arrive pas, contactez votre banque directement pour verifier que votre adresse courriel et votre numero de telephone sont a jour dans vos informations de compte.
                    </p>
                  </div>
                </div>
              </div>

              <div className="card">
                <div className="flex items-start gap-4">
                  <Search className="text-sar-gold flex-shrink-0 mt-1" />
                  <div>
                    <h3 className="font-semibold mb-2">Trouver votre institution financiere</h3>
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
                      Vous pouvez modifier la langue de l&apos;interface en cliquant sur l&apos;option de langue situee au-dessus des logos des banques.
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
                      L&apos;adresse courriel doit correspondre exactement a celle enregistree aupres de votre institution financiere, sinon le systeme bloquera la demande. Verifiez vos informations bancaires.
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
                      Par mesure de securite, le systeme bloque apres trop d&apos;essais. Recommencez le lendemain apres avoir verifie que vous utilisez les bonnes informations.
                    </p>
                  </div>
                </div>
              </div>

              <div className="card">
                <div className="flex items-start gap-4">
                  <AlertCircle className="text-sar-gold flex-shrink-0 mt-1" />
                  <div>
                    <h3 className="font-semibold mb-2">Problemes avec la signature electronique</h3>
                    <p className="text-gray-600">
                      Verifiez que tous les champs obligatoires (initiales et signature) sont remplis. Le bouton &quot;Envoyer&quot; n&apos;apparait que lorsque le formulaire est completement rempli.
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
                      Cliquez sur les trois traits en haut a gauche et choisissez la langue desiree (option au bas de la liste).
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* CTA */}
          <section className="text-center">
            <p className="text-gray-600 mb-6">
              Vous avez encore des problemes? Contactez-nous pour obtenir de l&apos;aide.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/nous-joindre" className="btn-primary">
                Nous contacter
              </Link>
              <Link href="/faq" className="btn-secondary">
                Voir la FAQ complete
              </Link>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
