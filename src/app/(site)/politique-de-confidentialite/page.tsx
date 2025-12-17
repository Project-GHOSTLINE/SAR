export default function PolitiqueConfidentialite() {
  return (
    <div className="py-16 bg-sar-grey min-h-screen">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl font-bold text-gray-800 mb-8">Politique de confidentialite</h1>
          <p className="text-gray-500 mb-8">Derniere mise a jour : Decembre 2024</p>

          <div className="bg-white rounded-xl shadow-md p-8 space-y-8">
            <section>
              <h2 className="text-2xl font-semibold text-sar-green mb-4">1. Introduction</h2>
              <p className="text-gray-600">
                Solution Argent Rapide s&apos;engage a proteger la vie privee de ses clients et visiteurs. Cette politique
                de confidentialite explique comment nous collectons, utilisons, divulguons et protegeons vos
                renseignements personnels conformement a la Loi sur la protection des renseignements personnels
                dans le secteur prive du Quebec et aux lois federales applicables.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-sar-green mb-4">2. Renseignements collectes</h2>
              <p className="text-gray-600 mb-4">Nous collectons les types de renseignements suivants :</p>
              <ul className="list-disc list-inside text-gray-600 space-y-2 ml-4">
                <li><strong>Informations d&apos;identification :</strong> Nom, prenom, date de naissance, numero d&apos;assurance sociale</li>
                <li><strong>Coordonnees :</strong> Adresse, numero de telephone, adresse courriel</li>
                <li><strong>Informations financieres :</strong> Revenus, informations bancaires, historique de credit</li>
                <li><strong>Informations d&apos;emploi :</strong> Employeur, poste, duree d&apos;emploi</li>
                <li><strong>Donnees de navigation :</strong> Adresse IP, type de navigateur, pages visitees</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-sar-green mb-4">3. Utilisation des renseignements</h2>
              <p className="text-gray-600 mb-4">Vos renseignements personnels sont utilises pour :</p>
              <ul className="list-disc list-inside text-gray-600 space-y-2 ml-4">
                <li>Evaluer votre demande de pret et votre capacite de remboursement</li>
                <li>Verifier votre identite et prevenir la fraude</li>
                <li>Gerer votre compte et traiter vos paiements</li>
                <li>Communiquer avec vous concernant votre dossier</li>
                <li>Respecter nos obligations legales et reglementaires</li>
                <li>Ameliorer nos services et votre experience utilisateur</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-sar-green mb-4">4. Verification bancaire instantanee (IBV)</h2>
              <p className="text-gray-600 mb-4">
                Notre processus d&apos;IBV utilise une technologie securisee pour verifier vos informations bancaires.
                Ce systeme :
              </p>
              <ul className="list-disc list-inside text-gray-600 space-y-2 ml-4">
                <li>N&apos;a jamais acces a vos identifiants bancaires (nom d&apos;utilisateur et mot de passe)</li>
                <li>Utilise un chiffrement de niveau bancaire (SSL 256-bit)</li>
                <li>Ne stocke pas vos informations de connexion bancaire</li>
                <li>Accede uniquement aux donnees necessaires a l&apos;evaluation de votre demande</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-sar-green mb-4">5. Partage des renseignements</h2>
              <p className="text-gray-600 mb-4">
                Nous ne vendons pas vos renseignements personnels. Nous pouvons partager vos informations avec :
              </p>
              <ul className="list-disc list-inside text-gray-600 space-y-2 ml-4">
                <li><strong>Fournisseurs de services :</strong> qui nous aident a traiter les paiements et verifier les informations</li>
                <li><strong>Autorites legales :</strong> lorsque requis par la loi ou pour proteger nos droits</li>
                <li><strong>Agences de credit :</strong> pour rapporter l&apos;historique de paiement (avec votre consentement)</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-sar-green mb-4">6. Protection des renseignements</h2>
              <p className="text-gray-600 mb-4">
                Nous mettons en oeuvre des mesures de securite appropriees pour proteger vos renseignements :
              </p>
              <ul className="list-disc list-inside text-gray-600 space-y-2 ml-4">
                <li>Chiffrement SSL 256-bit pour toutes les transmissions de donnees</li>
                <li>Acces restreint aux renseignements personnels selon le principe du besoin de connaitre</li>
                <li>Surveillance continue de nos systemes</li>
                <li>Formation reguliere de nos employes sur la protection des donnees</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-sar-green mb-4">7. Conservation des renseignements</h2>
              <p className="text-gray-600">
                Nous conservons vos renseignements personnels aussi longtemps que necessaire pour les fins pour
                lesquelles ils ont ete collectes, pour respecter nos obligations legales, resoudre les litiges
                et faire respecter nos accords. En general, les dossiers de pret sont conserves pendant une
                periode de 7 ans apres la fermeture du compte.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-sar-green mb-4">8. Vos droits</h2>
              <p className="text-gray-600 mb-4">Conformement a la loi, vous avez le droit de :</p>
              <ul className="list-disc list-inside text-gray-600 space-y-2 ml-4">
                <li>Acceder a vos renseignements personnels detenus par nous</li>
                <li>Demander la correction de renseignements inexacts</li>
                <li>Retirer votre consentement (sous reserve de restrictions legales)</li>
                <li>Deposer une plainte aupres de la Commission d&apos;acces a l&apos;information du Quebec</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-sar-green mb-4">9. Modifications de la politique</h2>
              <p className="text-gray-600">
                Nous nous reservons le droit de modifier cette politique de confidentialite a tout moment.
                Les modifications seront publiees sur cette page avec une nouvelle date de mise a jour.
                Nous vous encourageons a consulter regulierement cette politique.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-sar-green mb-4">10. Responsable de la protection des renseignements</h2>
              <p className="text-gray-600 mb-4">
                Pour toute question concernant cette politique ou pour exercer vos droits, contactez notre
                responsable de la protection des renseignements personnels :
              </p>
              <div className="text-gray-600 bg-sar-grey p-4 rounded-lg">
                <p><strong>Solution Argent Rapide</strong></p>
                <p>1148 Aime Petit, Chambly, Quebec, J3L 6K1</p>
                <p>Courriel : info@solutionargentrapide.ca</p>
                <p>Telephone : 514 589 1946</p>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  )
}
