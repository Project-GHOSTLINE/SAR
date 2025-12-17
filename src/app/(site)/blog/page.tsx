import Link from 'next/link'
import { Calendar, User, ArrowRight } from 'lucide-react'

const articles = [
  {
    slug: 'credit-entrepreneurs',
    title: "Le credit pour les entrepreneurs: Options de financement et conseils pour les petites entreprises et les independants",
    date: "3 mai 2023",
    author: "Solution Argent Rapide",
    category: "Pret d'argent",
    summary: "Explorez les differentes options de financement et les conseils pour les entrepreneurs, les petites entreprises et les travailleurs independants."
  },
  {
    slug: 'comprendre-cote-credit',
    title: "Comprendre la cote de credit : Guide detaille avec exemples concrets",
    date: "3 mai 2023",
    author: "Solution Argent Rapide",
    category: "Pret d'argent",
    summary: "Decouvrez comment fonctionnent les cotes de credit avec des illustrations pratiques couvrant les facteurs influencant les evaluations de credit."
  },
  {
    slug: 'refaire-son-credit',
    title: "Comment refaire son credit: Guide detaille avec exemples concrets",
    date: "3 mai 2023",
    author: "Solution Argent Rapide",
    category: "Pret d'argent",
    summary: "Apprenez a reconstruire votre solvabilite apres des difficultes, avec des strategies de recuperation detaillees pour ameliorer votre situation financiere."
  },
  {
    slug: 'pret-mauvais-credit',
    title: "Pret d'argent avec mauvais credit",
    date: "29 mars 2021",
    author: "Pret argent rapide",
    category: "Pret d'argent",
    summary: "Discutez des defis d'emprunt lorsque vous faites face a un mauvais historique de credit et a la gestion des difficultes financieres inattendues."
  },
  {
    slug: 'consolidation-dettes',
    title: "Consolidation de dettes mauvais credit",
    date: "27 mars 2021",
    author: "Pret argent rapide",
    category: "Pret d'argent",
    summary: "La consolidation de dettes comme solution finale lorsque vous ne pouvez pas gerer les calendriers de paiement et les pressions des creanciers."
  },
  {
    slug: 'emprunter-argent-facilement',
    title: "Comment emprunter de l'argent facilement ?",
    date: "26 mars 2021",
    author: "Pret argent rapide",
    category: "Pret d'argent",
    summary: "Decouvrez les differentes methodes d'emprunt et les options de preteurs disponibles pour differentes situations financieres."
  },
  {
    slug: 'pret-personnel',
    title: "Comment fonctionne un pret personnel ?",
    date: "25 mars 2021",
    author: "Pret argent rapide",
    category: "Pret d'argent",
    summary: "Le pret personnel... c'est incontestablement le pret auquel pratiquement tout le monde a recours, sans avoir a justifier son utilisation."
  },
  {
    slug: 'dentiste-financement',
    title: "Pas d'argent pour le dentiste que faire ?",
    date: "23 mars 2021",
    author: "Pret argent rapide",
    category: "Pret d'argent",
    summary: "Solutions de financement pour les soins dentaires lorsque vous manquez de ressources suffisantes pour des procedures couteuses."
  },
  {
    slug: 'financement-sans-enquete',
    title: "Financement sans enquete de credit",
    date: "22 mars 2021",
    author: "Pret argent rapide",
    category: "Pret d'argent",
    summary: "Explication des processus de verification de credit et des alternatives pour les emprunteurs cherchant un financement sans evaluations traditionnelles."
  },
  {
    slug: 'preteur-prive-quebec',
    title: "Preteur prive serieux Quebec",
    date: "17 mars 2021",
    author: "Pret argent rapide",
    category: "Pret d'argent",
    summary: "Explorez les options de preteurs prives comme alternatives viables pour diverses exigences et preferences d'emprunt."
  }
]

export default function BlogPage() {
  return (
    <div className="py-16">
      <div className="container mx-auto px-4">
        <h1 className="section-title text-center">Blog</h1>
        <p className="section-subtitle text-center">Conseils et informations sur le credit et les finances</p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {articles.map((article) => (
            <article key={article.slug} className="card hover:shadow-xl transition-shadow">
              <div className="mb-4">
                <span className="text-xs bg-sar-green text-white px-3 py-1 rounded-full">
                  {article.category}
                </span>
              </div>
              <h2 className="text-xl font-semibold mb-3 line-clamp-2">{article.title}</h2>
              <p className="text-gray-600 mb-4 line-clamp-3">{article.summary}</p>
              <div className="flex items-center gap-4 text-sm text-gray-500 mb-4">
                <span className="flex items-center gap-1">
                  <Calendar size={14} />
                  {article.date}
                </span>
                <span className="flex items-center gap-1">
                  <User size={14} />
                  {article.author}
                </span>
              </div>
              <Link href={`/blog/${article.slug}`} className="text-sar-green font-semibold flex items-center gap-1 hover:gap-2 transition-all">
                Lire la suite <ArrowRight size={16} />
              </Link>
            </article>
          ))}
        </div>
      </div>
    </div>
  )
}
