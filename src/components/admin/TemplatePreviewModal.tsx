'use client'

import { X, FileText, MapPin } from 'lucide-react'

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
  usage_count: number
  created_at: string
}

interface TemplatePreviewModalProps {
  isOpen: boolean
  onClose: () => void
  template: Template | null
}

export default function TemplatePreviewModal({ isOpen, onClose, template }: TemplatePreviewModalProps) {
  if (!isOpen || !template) return null

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

  // Grouper les champs par page
  const fieldsByPage = template.signature_fields.reduce((acc, field) => {
    if (!acc[field.page]) acc[field.page] = []
    acc[field.page].push(field)
    return acc
  }, {} as Record<number, SignatureField[]>)

  const pages = Object.keys(fieldsByPage).map(Number).sort((a, b) => a - b)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto border border-white/20">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-4 flex items-center justify-between border-b border-white/20 rounded-t-2xl">
          <div className="flex items-center gap-3">
            <FileText className="w-6 h-6 text-white" />
            <h2 className="text-xl font-bold text-white">Aperçu du Template</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/20 rounded-lg transition"
          >
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Template Info */}
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 mb-6 border border-white/20">
            <h3 className="text-2xl font-bold text-white mb-2">{template.name}</h3>
            <p className="text-blue-200 mb-4">{template.description || 'Aucune description'}</p>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-blue-300 mb-1">Catégorie</p>
                <p className="text-white font-semibold">{getCategoryLabel(template.category)}</p>
              </div>
              <div>
                <p className="text-sm text-blue-300 mb-1">Champs de signature</p>
                <p className="text-white font-semibold">{template.signature_fields.length}</p>
              </div>
              <div>
                <p className="text-sm text-blue-300 mb-1">Utilisations</p>
                <p className="text-white font-semibold">{template.usage_count}</p>
              </div>
            </div>
          </div>

          {/* Signature Fields by Page */}
          <div className="space-y-6">
            <h4 className="text-lg font-semibold text-white mb-4">Champs de Signature</h4>

            {pages.length === 0 && (
              <div className="bg-white/5 backdrop-blur-sm rounded-xl p-8 text-center border border-white/10">
                <p className="text-blue-300">Aucun champ de signature défini</p>
              </div>
            )}

            {pages.map(pageNum => (
              <div key={pageNum} className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
                <h5 className="text-md font-semibold text-white mb-4 flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Page {pageNum}
                  <span className="text-sm text-blue-300 font-normal">({fieldsByPage[pageNum].length} champ{fieldsByPage[pageNum].length > 1 ? 's' : ''})</span>
                </h5>

                <div className="space-y-3">
                  {fieldsByPage[pageNum].map((field, index) => (
                    <div
                      key={field.id}
                      className="bg-white/5 rounded-lg p-4 border border-white/10 hover:border-blue-400/50 transition"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                              field.type === 'signature'
                                ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                                : 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                            }`}>
                              {field.type === 'signature' ? '✍️ Signature' : '📝 Initiales'}
                            </span>
                            <span className="text-white font-medium">{field.label}</span>
                          </div>

                          <div className="grid grid-cols-2 gap-3 text-sm">
                            <div className="flex items-center gap-2">
                              <MapPin className="w-3 h-3 text-blue-400" />
                              <span className="text-blue-300">Position:</span>
                              <span className="text-white font-mono">({field.x}, {field.y})</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-blue-300">Dimensions:</span>
                              <span className="text-white font-mono">{field.width} × {field.height}px</span>
                            </div>
                          </div>
                        </div>

                        <div className="text-3xl opacity-50">
                          {field.type === 'signature' ? '✍️' : '📝'}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Footer Info */}
          <div className="mt-6 bg-blue-500/10 backdrop-blur-sm rounded-xl p-4 border border-blue-500/30">
            <p className="text-sm text-blue-200">
              <strong>💡 Astuce:</strong> Ce template peut être utilisé lors de la création d'un contrat
              pour pré-remplir automatiquement les positions des champs de signature.
            </p>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="sticky bottom-0 bg-slate-800/90 backdrop-blur-sm px-6 py-4 flex justify-end gap-3 border-t border-white/10 rounded-b-2xl">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition font-medium"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  )
}
