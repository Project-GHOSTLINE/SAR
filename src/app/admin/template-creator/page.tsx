'use client'

import { useState, useRef, useEffect } from 'react'
import AdminNav from '@/components/admin/AdminNav'
import { ArrowLeft, Upload, Plus, Save, X, MousePointer } from 'lucide-react'
import { useRouter } from 'next/navigation'

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

export default function TemplateCreatorPage() {
  const router = useRouter()
  const [pdfFile, setPdfFile] = useState<File | null>(null)
  const [pdfUrl, setPdfUrl] = useState<string>('')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [fields, setFields] = useState<SignatureField[]>([])
  const [fieldType, setFieldType] = useState<'signature' | 'initials'>('signature')
  const [templateName, setTemplateName] = useState('')
  const [templateDescription, setTemplateDescription] = useState('')
  const [category, setCategory] = useState('general')
  const [saving, setSaving] = useState(false)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [pdfInstance, setPdfInstance] = useState<any>(null)

  useEffect(() => {
    // Charger PDF.js dynamiquement
    const script = document.createElement('script')
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js'
    script.onload = () => {
      if ((window as any).pdfjsLib) {
        (window as any).pdfjsLib.GlobalWorkerOptions.workerSrc =
          'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js'
      }
    }
    document.body.appendChild(script)
  }, [])

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setPdfFile(file)
    const url = URL.createObjectURL(file)
    setPdfUrl(url)

    // Charger le PDF pour obtenir le nombre de pages
    if ((window as any).pdfjsLib) {
      const pdf = await (window as any).pdfjsLib.getDocument(url).promise
      setPdfInstance(pdf)
      setTotalPages(pdf.numPages)
      setCurrentPage(1)
      renderPage(pdf, 1)
    }
  }

  const renderPage = async (pdf: any, pageNum: number) => {
    const page = await pdf.getPage(pageNum)
    const canvas = canvasRef.current
    if (!canvas) return

    const viewport = page.getViewport({ scale: 1.5 })
    const context = canvas.getContext('2d')
    canvas.height = viewport.height
    canvas.width = viewport.width

    await page.render({
      canvasContext: context,
      viewport: viewport
    }).promise

    // Dessiner les champs existants pour cette page
    drawFields(context, pageNum)
  }

  const drawFields = (context: any, pageNum: number) => {
    const pageFields = fields.filter(f => f.page === pageNum)
    pageFields.forEach(field => {
      context.strokeStyle = field.type === 'signature' ? '#10B981' : '#3B82F6'
      context.lineWidth = 2
      context.strokeRect(field.x * 1.5, field.y * 1.5, field.width * 1.5, field.height * 1.5)
      context.fillStyle = field.type === 'signature' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(59, 130, 246, 0.2)'
      context.fillRect(field.x * 1.5, field.y * 1.5, field.width * 1.5, field.height * 1.5)
    })
  }

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const x = Math.round((e.clientX - rect.left) / 1.5)
    const y = Math.round((e.clientY - rect.top) / 1.5)

    const newField: SignatureField = {
      id: `field_${Date.now()}`,
      type: fieldType,
      label: fieldType === 'signature' ? 'Signature' : 'Initiales',
      page: currentPage,
      x,
      y,
      width: fieldType === 'signature' ? 180 : 80,
      height: fieldType === 'signature' ? 40 : 25
    }

    setFields([...fields, newField])

    // Re-render pour afficher le nouveau champ
    if (pdfInstance) {
      renderPage(pdfInstance, currentPage)
    }
  }

  const removeField = (id: string) => {
    setFields(fields.filter(f => f.id !== id))
    if (pdfInstance) {
      renderPage(pdfInstance, currentPage)
    }
  }

  const handleSave = async () => {
    if (!templateName.trim()) {
      alert('Veuillez entrer un nom pour le template')
      return
    }

    if (fields.length === 0) {
      alert('Veuillez ajouter au moins un champ de signature')
      return
    }

    setSaving(true)

    try {
      const res = await fetch('/api/admin/signature-templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: templateName,
          description: templateDescription || undefined,
          category,
          signature_fields: fields
        })
      })

      const data = await res.json()

      if (data.success) {
        alert('✅ Template créé avec succès!')
        router.push('/admin/contrats-signature')
      } else {
        alert(`❌ Erreur: ${data.error}`)
      }
    } catch (error) {
      console.error('Erreur sauvegarde:', error)
      alert('❌ Erreur lors de la sauvegarde')
    } finally {
      setSaving(false)
    }
  }

  const changePage = (newPage: number) => {
    if (newPage < 1 || newPage > totalPages) return
    setCurrentPage(newPage)
    if (pdfInstance) {
      renderPage(pdfInstance, newPage)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <AdminNav currentPage="/admin/template-creator" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/admin/contrats-signature')}
              className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-white rounded-lg transition border border-gray-200"
            >
              <ArrowLeft className="w-4 h-4" />
              Retour
            </button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Créer un Template</h1>
              <p className="text-gray-600">Placez les zones de signature sur votre PDF</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Configuration */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-semibold mb-4">Configuration</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nom du template *
                </label>
                <input
                  type="text"
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                  placeholder="Ex: Contrat Prêt Standard"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  value={templateDescription}
                  onChange={(e) => setTemplateDescription(e.target.value)}
                  placeholder="Description optionnelle"
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Catégorie
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="general">Général</option>
                  <option value="loan">Prêt</option>
                  <option value="lease">Location</option>
                  <option value="agreement">Accord</option>
                  <option value="other">Autre</option>
                </select>
              </div>

              {!pdfFile && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Charger un PDF *
                  </label>
                  <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-blue-500 transition">
                    <Upload className="w-8 h-8 text-gray-400 mb-2" />
                    <span className="text-sm text-gray-500">Cliquez pour charger</span>
                    <input
                      type="file"
                      accept=".pdf"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>
                </div>
              )}

              {pdfFile && (
                <>
                  <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                    <p className="text-sm font-medium text-green-800">
                      ✓ {pdfFile.name}
                    </p>
                    <p className="text-xs text-green-600">
                      {totalPages} page{totalPages > 1 ? 's' : ''}
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Type de champ
                    </label>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setFieldType('signature')}
                        className={`flex-1 px-3 py-2 rounded-lg font-medium transition ${
                          fieldType === 'signature'
                            ? 'bg-green-600 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        Signature
                      </button>
                      <button
                        onClick={() => setFieldType('initials')}
                        className={`flex-1 px-3 py-2 rounded-lg font-medium transition ${
                          fieldType === 'initials'
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        Initiales
                      </button>
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      <MousePointer className="w-3 h-3 inline mr-1" />
                      Cliquez sur le PDF pour placer un champ
                    </p>
                  </div>

                  <div>
                    <h3 className="text-sm font-medium text-gray-700 mb-2">
                      Champs placés ({fields.length})
                    </h3>
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {fields.map(field => (
                        <div
                          key={field.id}
                          className="flex items-center justify-between p-2 bg-gray-50 rounded-lg"
                        >
                          <div className="flex-1">
                            <p className="text-xs font-medium text-gray-900">
                              {field.label} - Page {field.page}
                            </p>
                            <p className="text-xs text-gray-500">
                              x:{field.x} y:{field.y} {field.width}x{field.height}
                            </p>
                          </div>
                          <button
                            onClick={() => removeField(field.id)}
                            className="p-1 text-red-600 hover:bg-red-50 rounded"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                      {fields.length === 0 && (
                        <p className="text-xs text-gray-400 text-center py-4">
                          Aucun champ placé
                        </p>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={handleSave}
                    disabled={saving || !templateName.trim() || fields.length === 0}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
                  >
                    <Save className="w-5 h-5" />
                    {saving ? 'Sauvegarde...' : 'Sauvegarder le template'}
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Preview PDF */}
          <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Aperçu du PDF</h2>
              {pdfFile && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => changePage(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="px-3 py-1 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                  >
                    ← Préc.
                  </button>
                  <span className="text-sm text-gray-600">
                    Page {currentPage} / {totalPages}
                  </span>
                  <button
                    onClick={() => changePage(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                  >
                    Suiv. →
                  </button>
                </div>
              )}
            </div>

            {!pdfFile ? (
              <div className="flex items-center justify-center h-[600px] border-2 border-dashed border-gray-300 rounded-lg">
                <div className="text-center">
                  <Upload className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">Chargez un PDF pour commencer</p>
                </div>
              </div>
            ) : (
              <div className="border border-gray-200 rounded-lg overflow-auto max-h-[600px]">
                <canvas
                  ref={canvasRef}
                  onClick={handleCanvasClick}
                  className="cursor-crosshair mx-auto"
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
