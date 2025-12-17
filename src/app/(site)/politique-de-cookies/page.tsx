export default function PolitiqueCookies() {
  return (
    <div className="py-16 bg-sar-grey min-h-screen">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl font-bold text-gray-800 mb-8">Politique de cookies</h1>
          <p className="text-gray-500 mb-8">Derniere mise a jour : Decembre 2024</p>

          <div className="bg-white rounded-xl shadow-md p-8 space-y-8">
            <section>
              <h2 className="text-2xl font-semibold text-sar-green mb-4">1. Qu&apos;est-ce qu&apos;un cookie?</h2>
              <p className="text-gray-600">
                Un cookie est un petit fichier texte stocke sur votre ordinateur ou appareil mobile lorsque vous
                visitez un site web. Les cookies sont largement utilises pour faire fonctionner les sites web
                ou les rendre plus efficaces, ainsi que pour fournir des informations aux proprietaires du site.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-sar-green mb-4">2. Comment utilisons-nous les cookies?</h2>
              <p className="text-gray-600 mb-4">
                Solution Argent Rapide utilise des cookies pour plusieurs raisons :
              </p>
              <ul className="list-disc list-inside text-gray-600 space-y-2 ml-4">
                <li>Assurer le bon fonctionnement du site</li>
                <li>Ameliorer votre experience de navigation</li>
                <li>Memoriser vos preferences</li>
                <li>Analyser l&apos;utilisation du site pour l&apos;ameliorer</li>
                <li>Securiser votre session et prevenir la fraude</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-sar-green mb-4">3. Types de cookies utilises</h2>

              <div className="space-y-6">
                <div className="border-l-4 border-sar-green pl-4">
                  <h3 className="text-xl font-medium text-gray-800 mb-2">Cookies essentiels</h3>
                  <p className="text-gray-600">
                    Ces cookies sont necessaires au fonctionnement du site. Ils vous permettent de naviguer
                    sur le site et d&apos;utiliser ses fonctionnalites, comme acceder aux zones securisees.
                    Sans ces cookies, les services que vous avez demandes ne peuvent pas etre fournis.
                  </p>
                </div>

                <div className="border-l-4 border-sar-gold pl-4">
                  <h3 className="text-xl font-medium text-gray-800 mb-2">Cookies de performance</h3>
                  <p className="text-gray-600">
                    Ces cookies collectent des informations sur la facon dont les visiteurs utilisent notre site,
                    par exemple les pages les plus visitees. Ces informations sont utilisees pour ameliorer
                    le fonctionnement du site. Toutes les informations collectees sont anonymes.
                  </p>
                </div>

                <div className="border-l-4 border-blue-500 pl-4">
                  <h3 className="text-xl font-medium text-gray-800 mb-2">Cookies de fonctionnalite</h3>
                  <p className="text-gray-600">
                    Ces cookies permettent au site de se souvenir des choix que vous faites (comme votre langue
                    ou la region ou vous vous trouvez) et de fournir des fonctionnalites ameliorees et plus
                    personnelles.
                  </p>
                </div>

                <div className="border-l-4 border-purple-500 pl-4">
                  <h3 className="text-xl font-medium text-gray-800 mb-2">Cookies de ciblage/publicite</h3>
                  <p className="text-gray-600">
                    Ces cookies sont utilises pour diffuser des publicites plus pertinentes pour vous et vos
                    interets. Ils sont egalement utilises pour limiter le nombre de fois que vous voyez une
                    publicite et pour aider a mesurer l&apos;efficacite des campagnes publicitaires.
                  </p>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-sar-green mb-4">4. Liste des cookies utilises</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-gray-600">
                  <thead className="bg-sar-grey">
                    <tr>
                      <th className="p-3 font-semibold">Nom</th>
                      <th className="p-3 font-semibold">Type</th>
                      <th className="p-3 font-semibold">Duree</th>
                      <th className="p-3 font-semibold">Description</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    <tr>
                      <td className="p-3">_session</td>
                      <td className="p-3">Essentiel</td>
                      <td className="p-3">Session</td>
                      <td className="p-3">Gestion de la session utilisateur</td>
                    </tr>
                    <tr>
                      <td className="p-3">admin_token</td>
                      <td className="p-3">Essentiel</td>
                      <td className="p-3">24 heures</td>
                      <td className="p-3">Authentification administrateur</td>
                    </tr>
                    <tr>
                      <td className="p-3">axeptio_*</td>
                      <td className="p-3">Fonctionnalite</td>
                      <td className="p-3">12 mois</td>
                      <td className="p-3">Gestion des preferences de cookies</td>
                    </tr>
                    <tr>
                      <td className="p-3">_ga</td>
                      <td className="p-3">Performance</td>
                      <td className="p-3">2 ans</td>
                      <td className="p-3">Google Analytics - identification des visiteurs</td>
                    </tr>
                    <tr>
                      <td className="p-3">_gid</td>
                      <td className="p-3">Performance</td>
                      <td className="p-3">24 heures</td>
                      <td className="p-3">Google Analytics - identification des sessions</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-sar-green mb-4">5. Gestion des cookies</h2>
              <p className="text-gray-600 mb-4">
                Vous pouvez controler et/ou supprimer les cookies comme vous le souhaitez. Vous pouvez supprimer
                tous les cookies deja presents sur votre ordinateur et configurer la plupart des navigateurs
                pour qu&apos;ils les bloquent.
              </p>
              <p className="text-gray-600 mb-4">
                <strong>Via notre bandeau de consentement :</strong> Lors de votre premiere visite, un bandeau
                vous permet de choisir quels cookies accepter. Vous pouvez modifier vos preferences a tout moment
                en cliquant sur le lien &quot;Gerer les cookies&quot; en bas de page.
              </p>
              <p className="text-gray-600 mb-4">
                <strong>Via votre navigateur :</strong> Vous pouvez egalement gerer les cookies directement
                dans les parametres de votre navigateur :
              </p>
              <ul className="list-disc list-inside text-gray-600 space-y-2 ml-4">
                <li><strong>Chrome :</strong> Parametres &gt; Confidentialite et securite &gt; Cookies</li>
                <li><strong>Firefox :</strong> Options &gt; Vie privee et securite &gt; Cookies</li>
                <li><strong>Safari :</strong> Preferences &gt; Confidentialite &gt; Cookies</li>
                <li><strong>Edge :</strong> Parametres &gt; Confidentialite &gt; Cookies</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-sar-green mb-4">6. Cookies tiers</h2>
              <p className="text-gray-600">
                Certains cookies sont places par des services tiers qui apparaissent sur nos pages. Nous n&apos;avons
                pas le controle sur ces cookies. Les principaux tiers utilisant des cookies sur notre site sont :
              </p>
              <ul className="list-disc list-inside text-gray-600 space-y-2 ml-4 mt-4">
                <li><strong>Google Analytics :</strong> Analyse du trafic et du comportement des visiteurs</li>
                <li><strong>Axeptio :</strong> Gestion du consentement aux cookies</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-sar-green mb-4">7. Mise a jour de cette politique</h2>
              <p className="text-gray-600">
                Nous pouvons mettre a jour cette politique de cookies de temps a autre. Nous vous encourageons
                a consulter cette page regulierement pour rester informe de notre utilisation des cookies.
                La date de la derniere mise a jour est indiquee en haut de cette page.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-sar-green mb-4">8. Contact</h2>
              <p className="text-gray-600 mb-4">
                Pour toute question concernant notre utilisation des cookies, veuillez nous contacter :
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
