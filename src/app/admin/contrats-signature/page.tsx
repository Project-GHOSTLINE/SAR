'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { FileText, Plus, Trash2, Eye, CheckCircle, Clock, Users } from 'lucide-react'
import AdminNav from '@/components/admin/AdminNav'

interface SignatureField {
  id: string
  type: 'signature' | 'initials'
  label: string
  page: number
  x: number
  y: number
  width: number
  height: number
}

interface Template {
  id: string
  name: string
  description: string | null
  category: string
  signature_fields: SignatureField[]
  is_active: boolean
  usage_count: number
  created_at: string
  updated_at: string
}

export default function ContratsSignaturePage() {
  const router = useRouter()
  const [templates, setTemplates] = useState<Template[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedCategory, setSelectedCategory] = useState<string>('all')

  useEffect(() => {
    loadTemplates()
  }, [])

  const loadTemplates = async () => {
    try {
      setLoading(true)
      const url = selectedCategory === 'all'
        ? '/api/admin/signature-templates'
        : `/api/admin/signature-templates?category=${selectedCategory}`

      const response = await fetch(url)
      const data = await response.json()

      if (data.success) {
        setTemplates(data.templates)
      } else {
        console.error('Erreur:', data.error)
      }
    } catch (error) {
      console.error('Erreur chargement templates:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteTemplate = async (id: string, name: string) => {
    if (!confirm(`Supprimer le template "${name}"?`)) return

    try {
      const response = await fetch(`/api/admin/signature-templates/${id}`, {
        method: 'DELETE'
      })

      const data = await response.json()

      if (data.success) {
        alert(`✅ Template "${name}" supprimé`)
        loadTemplates()
      } else {
        alert(`❌ Erreur: ${data.error}`)
      }
    } catch (error: any) {
      alert(`❌ Erreur: ${error.message}`)
    }
  }

  const handleOpenOutilCoordonnees = () => {
    // Rediriger vers la page intégrée de création de template
    router.push('/admin/template-creator')
  }

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      loan: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
      lease: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
      agreement: 'bg-green-500/20 text-green-400 border-green-500/30',
      general: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
      other: 'bg-orange-500/20 text-orange-400 border-orange-500/30'
    }
    return colors[category] || colors.general
  }

  const getCategoryLabel = (category: string) => {
    const labels: Record<string, string> = {
      loan: 'Prêt',
      lease: 'Location',
      agreement: 'Accord',
      general: 'Général',
      other: 'Autre'
    }
    return labels[category] || category
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
        <AdminNav />
        <div className="flex items-center justify-center h-[80vh]">
          <div className="text-white text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-400 mx-auto mb-4"></div>
            <p>Chargement des templates...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
      <AdminNav />

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">
                📄 Templates de Signature
              </h1>
              <p className="text-blue-200">
                Gérez vos gabarits de contrats réutilisables
              </p>
            </div>
            <button
              onClick={handleOpenOutilCoordonnees}
              className="px-6 py-3 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-lg hover:from-purple-600 hover:to-purple-700 transition-all font-medium flex items-center gap-2 shadow-lg"
            >
              <Plus className="w-5 h-5" />
              Créer un template
            </button>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-200 text-sm mb-1">Total Templates</p>
                  <p className="text-3xl font-bold text-white">{templates.length}</p>
                </div>
                <FileText className="w-8 h-8 text-blue-400" />
              </div>
            </div>

            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-green-200 text-sm mb-1">Actifs</p>
                  <p className="text-3xl font-bold text-white">
                    {templates.filter(t => t.is_active).length}
                  </p>
                </div>
                <CheckCircle className="w-8 h-8 text-green-400" />
              </div>
            </div>

            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-purple-200 text-sm mb-1">Utilisations</p>
                  <p className="text-3xl font-bold text-white">
                    {templates.reduce((sum, t) => sum + t.usage_count, 0)}
                  </p>
                </div>
                <Users className="w-8 h-8 text-purple-400" />
              </div>
            </div>

            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-orange-200 text-sm mb-1">Catégories</p>
                  <p className="text-3xl font-bold text-white">
                    {new Set(templates.map(t => t.category)).size}
                  </p>
                </div>
                <Clock className="w-8 h-8 text-orange-400" />
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="flex gap-2 mb-6">
            <button
              onClick={() => { setSelectedCategory('all'); loadTemplates() }}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                selectedCategory === 'all'
                  ? 'bg-blue-500 text-white'
                  : 'bg-white/10 text-blue-200 hover:bg-white/20'
              }`}
            >
              Tous
            </button>
            {['loan', 'lease', 'agreement', 'general'].map(cat => (
              <button
                key={cat}
                onClick={() => { setSelectedCategory(cat); loadTemplates() }}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                  selectedCategory === cat
                    ? 'bg-blue-500 text-white'
                    : 'bg-white/10 text-blue-200 hover:bg-white/20'
                }`}
              >
                {getCategoryLabel(cat)}
              </button>
            ))}
          </div>
        </div>

        {/* Templates Grid */}
        {templates.length === 0 ? (
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-12 border border-white/20 text-center">
            <FileText className="w-16 h-16 text-blue-400 mx-auto mb-4 opacity-50" />
            <h3 className="text-xl font-semibold text-white mb-2">Aucun template</h3>
            <p className="text-blue-200 mb-6">
              Créez votre premier template en utilisant l'outil de coordonnées PDF
            </p>
            <button
              onClick={handleOpenOutilCoordonnees}
              className="px-6 py-3 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-lg hover:from-purple-600 hover:to-purple-700 transition-all font-medium inline-flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              Créer mon premier template
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {templates.map(template => (
              <div
                key={template.id}
                className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20 hover:border-blue-400/50 transition-all group"
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-white mb-1 group-hover:text-blue-300 transition-colors">
                      {template.name}
                    </h3>
                    <p className="text-sm text-blue-200 line-clamp-2">
                      {template.description || 'Aucune description'}
                    </p>
                  </div>
                  <FileText className="w-8 h-8 text-blue-400 flex-shrink-0 ml-2" />
                </div>

                {/* Badges */}
                <div className="flex items-center gap-2 mb-4">
                  <span className={`text-xs px-2 py-1 rounded-full border ${getCategoryColor(template.category)}`}>
                    {getCategoryLabel(template.category)}
                  </span>
                  {template.is_active ? (
                    <span className="text-xs px-2 py-1 rounded-full border bg-green-500/20 text-green-400 border-green-500/30">
                      Actif
                    </span>
                  ) : (
                    <span className="text-xs px-2 py-1 rounded-full border bg-gray-500/20 text-gray-400 border-gray-500/30">
                      Inactif
                    </span>
                  )}
                </div>

                {/* Stats */}
                <div className="space-y-2 mb-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-blue-200">Champs:</span>
                    <span className="text-white font-medium">
                      {template.signature_fields.length}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-blue-200">Utilisations:</span>
                    <span className="text-white font-medium">
                      {template.usage_count}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-blue-200">Créé:</span>
                    <span className="text-white font-medium">
                      {new Date(template.created_at).toLocaleDateString('fr-CA')}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-4 border-t border-white/10">
                  <button
                    onClick={() => alert('TODO: Prévisualiser le template')}
                    className="flex-1 px-3 py-2 bg-blue-500/20 text-blue-300 rounded-lg hover:bg-blue-500/30 transition-all flex items-center justify-center gap-2 text-sm font-medium"
                  >
                    <Eye className="w-4 h-4" />
                    Voir
                  </button>
                  <button
                    onClick={() => handleDeleteTemplate(template.id, template.name)}
                    className="px-3 py-2 bg-red-500/20 text-red-300 rounded-lg hover:bg-red-500/30 transition-all flex items-center justify-center gap-2 text-sm font-medium"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Instructions */}
        <div className="mt-8 bg-blue-500/10 backdrop-blur-sm rounded-xl p-6 border border-blue-500/30">
          <h3 className="text-lg font-semibold text-white mb-3">
            💡 Comment créer un template
          </h3>
          <ol className="space-y-2 text-blue-200">
            <li>1. Clique sur "Créer un template" (ou ouvre directement outil-coordonnees-pdf.html)</li>
            <li>2. Charge ton PDF de contrat (ex: Contrat-de-pret-SAR.pdf)</li>
            <li>3. Sélectionne le type (Signature ou Initiales)</li>
            <li>4. Clique exactement sur les zones [SIGNATURE] et [INIT] dans le PDF</li>
            <li>5. Ajuste les dimensions si nécessaire</li>
            <li>6. Clique sur "💾 Sauvegarder dans SAR"</li>
            <li>7. Le template apparaîtra automatiquement ici!</li>
          </ol>
        </div>
      </div>
    </div>
  )
}
