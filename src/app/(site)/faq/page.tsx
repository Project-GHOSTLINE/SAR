'use client'

import { useState, useEffect } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'

const faqs = [
  {
    question: "Quelles sont les etapes a suivre pour obtenir votre credit ?",
    answer: "Les etapes sont : 1) Remplir le formulaire et l'envoyer, 2) Completer la verification bancaire (IBV), 3) Si approuvee, signer le contrat et le retourner, 4) Recevoir les fonds."
  },
  {
    question: "Quels sont les criteres d'admission ?",
    answer: "Etre age de 18 ans minimum, resider au Canada, occuper un emploi depuis au moins 3 mois, et ne pas etre en processus de faillite ou de proposition de consommateur."
  },
  {
    question: "Comment faire une demande de credit en ligne ?",
    answer: "Remplir le formulaire en ligne et l'envoyer, en completant la section Completer mon IBV."
  },
  {
    question: "Qu'arrive-t-il une fois que ma demande est envoyee ?",
    answer: "La demande est envoyee aux analystes pour etude du dossier. Une reponse par courriel informera le demandeur de la decision."
  },
  {
    id: "delai-argent",
    question: "Dans combien de temps vais-je recevoir l'argent ?",
    answer: "Generalement, les fonds sont transferes par virement Interac la journee meme."
  },
  {
    question: "Devez-vous verifier mon emploi ?",
    answer: "Oui, une verification d'emploi est obligatoire. Cette demarche demeure confidentielle ; l'employeur ignore la demande de credit."
  },
  {
    question: "En quoi consiste un contrat de credit variable ?",
    answer: "Un document validant l'entente. Contrairement aux prets a terme, il permet l'acces a des fonds utilisables a discretion, avec remboursement possible sans penalites."
  },
  {
    question: "Quel est le taux d'interet ?",
    answer: "APR (Taux annuel d'interet) de 18,99%"
  },
  {
    question: "Qu'arrive-t-il si je suis incapable d'effectuer un paiement ?",
    answer: "Possibilite de reporter le paiement moyennant 25$, demande 4 jours ouvrables avant le prelevement. Cela evite les frais de cheques sans provisions."
  },
  {
    question: "Quelles sont vos heures d'ouverture ?",
    answer: "Lundi-jeudi 9h-16h, vendredi 9h-midi, ferme samedi-dimanche."
  },
  {
    question: "Est-ce qu'il y a d'autres frais ?",
    answer: "Frais d'adhesion hebdomadaires : 22.50 $ tant qu'il y a un solde actif."
  },
  {
    question: "Ou puis-je trouver mon solde et mon calendrier de paiements ?",
    answer: "A l'Annexe B du contrat. Ou contacter info@solutionargentrapide.ca."
  },
  {
    question: "Quand puis-je renouveler mon credit ?",
    answer: "Communiquer par courriel pour recevoir rapidement des nouvelles."
  },
  {
    question: "En quoi consiste la Verification Bancaire Instantanee (IBV) ?",
    answer: "Permet aux institutions de consulter les comptes et transactions. Verifie l'identite et fournit une copie securisee des releves bancaires pour analyse rapide du dossier."
  },
  {
    question: "Comment savoir si le processus est securitaire ?",
    answer: "Le systeme IBV offre une confidentialite equivalente a celle des banques en ligne et n'accede jamais au nom d'utilisateur ni au mot de passe."
  },
  {
    question: "Que ferez-vous des informations donnees ?",
    answer: "Transferees de maniere securisee a l'institution financiere pour verification d'identite et transmission des releves bancaires."
  },
  {
    question: "Pourrez-vous vous connecter a mon compte bancaire ?",
    answer: "Non. Le systeme IBV ne transmet qu'une copie en lecture seule des releves bancaires."
  },
  {
    question: "Pourquoi dois-je vous faire parvenir mes releves bancaires via le systeme IBV ?",
    answer: "Permet d'acceder aux informations necessaires pour analyser la capacite de remboursement (depots de paies, factures, autres prets, etc.)."
  },
  {
    id: "verification-bancaire",
    question: "Je n'arrive pas a envoyer mes releves bancaires (IBV). Pourquoi ?",
    answer: "L'adresse courriel doit correspondre exactement a celle du dossier de l'institution financiere, sinon le systeme bloque la demande. Si vous avez des problemes avec la verification bancaire, consultez notre page dediee ou contactez-nous directement."
  },
  {
    question: "J'ai des problemes avec la signature electronique.",
    answer: "Verifier que tous les champs obligatoires (initiales et signature) sont remplis. Le bouton Envoyer n'apparait que completement rempli."
  },
  {
    question: "Adobe Acrobat est en anglais. Est-ce que je peux avoir les instructions en francais ?",
    answer: "Oui. Cliquer sur les trois traits en haut a gauche et choisir la langue desiree (option au bas de la liste)."
  },
  {
    question: "Le systeme IBV indique que j'ai fait trop de tentatives.",
    answer: "Par mesure de securite, le systeme bloque apres trop d'essais. Recommencer le lendemain apres verification des bonnes informations."
  }
]

export default function FAQPage() {
  const [openIndex, setOpenIndex] = useState<number | null>(null)

  useEffect(() => {
    // Vérifier s'il y a un hash dans l'URL
    const hash = window.location.hash.replace('#', '')
    if (hash) {
      // Trouver l'index de la FAQ avec cet ID
      const index = faqs.findIndex(faq => (faq as any).id === hash)
      if (index !== -1) {
        setOpenIndex(index)
        // Scroll vers l'élément après un court délai
        setTimeout(() => {
          const element = document.getElementById(hash)
          if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' })
          }
        }, 100)
      }
    }
  }, [])

  return (
    <div className="py-16">
      <div className="container mx-auto px-4">
        <h1 className="section-title text-center">Foire aux questions</h1>
        <p className="section-subtitle text-center">Trouvez les reponses a vos questions</p>

        <div className="max-w-3xl mx-auto space-y-4">
          {faqs.map((faq, index) => {
            const faqId = (faq as any).id
            return (
              <div
                key={index}
                id={faqId}
                className={`card cursor-pointer transition-all ${faqId && openIndex === index ? 'ring-2 ring-sar-green' : ''}`}
                onClick={() => setOpenIndex(openIndex === index ? null : index)}
              >
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-lg pr-4">{faq.question}</h3>
                  {openIndex === index ? (
                    <ChevronUp className="text-sar-green flex-shrink-0" />
                  ) : (
                    <ChevronDown className="text-sar-green flex-shrink-0" />
                  )}
                </div>
                {openIndex === index && (
                  <p className="text-gray-600 mt-4 pt-4 border-t">{faq.answer}</p>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
