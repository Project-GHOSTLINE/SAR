'use client'

import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { X, Upload, Plus, Trash2, Move, Loader2, Check, FileText, Sparkles } from 'lucide-react'
import * as pdfjsLib from 'pdfjs-dist'

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
}

interface CreateContractModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export default function CreateContractModal({ isOpen, onClose, onSuccess }: CreateContractModalProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [loading, setLoading] = useState(false)

  // Templates
  const [templates, setTemplates] = useState<Template[]>([])
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('')
  const [loadingTemplates, setLoadingTemplates] = useState(false)

  // Étape 1: Infos client
  const [clientName, setClientName] = useState('')
  const [clientEmail, setClientEmail] = useState('')
  const [title, setTitle] = useState('')

  // Étape 2: Upload PDF
  const [pdfFile, setPdfFile] = useState<File | null>(null)
  const [pdfBase64, setPdfBase64] = useState<string>('')
  const [pdfUrl, setPdfUrl] = useState<string>('')

  // Étape 3: Placement des champs
  const [signatureFields, setSignatureFields] = useState<SignatureField[]>([])
  const [selectedField, setSelectedField] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)

  // PDF rendering avec Canvas
  const [pdfDoc, setPdfDoc] = useState<any>(null)
  const [currentPdfPage, setCurrentPdfPage] = useState(1)
  const [totalPdfPages, setTotalPdfPages] = useState(1)
  const [pdfScale, setPdfScale] = useState(1.5)
  const [pdfPageDimensions, setPdfPageDimensions] = useState<{ width: number; height: number } | null>(null)
  const [baseImageData, setBaseImageData] = useState<ImageData | null>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)

  // Configurer PDF.js
  useEffect(() => {
    pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.js/pdf.worker.min.js'
  }, [])

  // Charger les templates au montage
  useEffect(() => {
    if (isOpen) {
      loadTemplates()
    }
  }, [isOpen])

  // Charger le PDF sur canvas quand on arrive à l'étape 3
  useEffect(() => {
    if (step === 3 && pdfFile && !pdfDoc) {
      loadPdfForCanvas()
    }
  }, [step, pdfFile])

  // Re-render seulement les overlays quand les champs changent (optimisé)
  useEffect(() => {
    if (baseImageData && step === 3) {
      redrawFieldsOnly()
    }
  }, [signatureFields, selectedField])

  // Fonction optimisée pour redessiner seulement les champs
  const redrawFieldsOnly = useCallback(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx || !baseImageData) return

    // Restaurer l'image de base
    ctx.putImageData(baseImageData, 0, 0)

    // Redessiner les champs par-dessus
    drawFieldsOnCanvas(ctx, currentPdfPage, pdfScale)
  }, [baseImageData, currentPdfPage, pdfScale, signatureFields, selectedField])

  const loadPdfForCanvas = async () => {
    if (!pdfFile) return

    try {
      const arrayBuffer = await pdfFile.arrayBuffer()
      const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer })
      const pdf = await loadingTask.promise

      setPdfDoc(pdf)
      setTotalPdfPages(pdf.numPages)
      setCurrentPdfPage(1)

      // Rendre la première page
      await renderPdfPage(pdf, 1)
    } catch (error) {
      console.error('Erreur chargement PDF:', error)
    }
  }

  const renderPdfPage = async (pdf: any, pageNum: number) => {
    const page = await pdf.getPage(pageNum)

    // Calculer le scale optimal
    const container = containerRef.current
    let calculatedScale = pdfScale

    if (container) {
      const containerWidth = container.clientWidth - 64
      const baseViewport = page.getViewport({ scale: 1 })
      const optimalScale = containerWidth / baseViewport.width
      calculatedScale = Math.min(Math.max(optimalScale, 0.5), 2)
      setPdfScale(calculatedScale)

      // Stocker les dimensions de la page (sans scale pour validation)
      setPdfPageDimensions({
        width: baseViewport.width,
        height: baseViewport.height
      })
    }

    const viewport = page.getViewport({ scale: calculatedScale })

    const canvas = canvasRef.current
    if (!canvas) return

    canvas.width = viewport.width
    canvas.height = viewport.height

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    await page.render({ canvasContext: ctx, viewport }).promise

    // Sauvegarder l'image de base pour optimisation (avant de dessiner les champs)
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
    setBaseImageData(imageData)

    // Dessiner les champs existants
    drawFieldsOnCanvas(ctx, pageNum, calculatedScale)
  }

  const drawFieldsOnCanvas = (ctx: CanvasRenderingContext2D, pageNum: number, scale: number) => {
    const pageFields = signatureFields.filter(f => f.page === pageNum)

    console.log(`🎨 Dessin de ${pageFields.length} champ(s) sur page ${pageNum} (scale: ${scale})`)

    pageFields.forEach(field => {
      console.log(`   - ${field.type} à (${field.x}, ${field.y}) → canvas (${field.x * scale}, ${field.y * scale})`)
      // Couleur selon le type et la sélection
      if (selectedField === field.id) {
        ctx.strokeStyle = '#3B82F6' // Bleu si sélectionné
        ctx.fillStyle = 'rgba(59, 130, 246, 0.3)'
      } else if (field.type === 'signature') {
        ctx.strokeStyle = '#10B981' // Vert pour signature
        ctx.fillStyle = 'rgba(16, 185, 129, 0.2)'
      } else {
        ctx.strokeStyle = '#F59E0B' // Orange pour initiales
        ctx.fillStyle = 'rgba(245, 158, 11, 0.2)'
      }

      ctx.lineWidth = 3
      ctx.setLineDash([])

      // Rectangle
      const x = field.x * scale
      const y = field.y * scale
      const width = field.width * scale
      const height = field.height * scale

      ctx.fillRect(x, y, width, height)
      ctx.strokeRect(x, y, width, height)

      // Label
      ctx.fillStyle = '#000000'
      ctx.font = `${12 * scale}px Arial`
      ctx.fillText(field.type === 'signature' ? 'SIGNATURE' : 'INIT', x + 5, y + 15 * scale)
    })
  }

  const validateFieldPosition = (field: SignatureField): { valid: boolean; error?: string } => {
    // Dimensions minimales et maximales
    const MIN_WIDTH = 50
    const MIN_HEIGHT = 30
    const MAX_WIDTH = 500
    const MAX_HEIGHT = 300

    // Vérifier les coordonnées positives
    if (field.x < 0 || field.y < 0) {
      return { valid: false, error: 'Les coordonnées doivent être positives' }
    }

    // Vérifier les dimensions min/max
    if (field.width < MIN_WIDTH || field.height < MIN_HEIGHT) {
      return { valid: false, error: `Dimensions minimales: ${MIN_WIDTH}x${MIN_HEIGHT}px` }
    }

    if (field.width > MAX_WIDTH || field.height > MAX_HEIGHT) {
      return { valid: false, error: `Dimensions maximales: ${MAX_WIDTH}x${MAX_HEIGHT}px` }
    }

    // Vérifier les limites de la page si les dimensions sont disponibles
    if (pdfPageDimensions) {
      if (field.x + field.width > pdfPageDimensions.width) {
        return { valid: false, error: 'Le champ dépasse la largeur de la page' }
      }

      if (field.y + field.height > pdfPageDimensions.height) {
        return { valid: false, error: 'Le champ dépasse la hauteur de la page' }
      }
    }

    // Vérifier les chevauchements avec d'autres champs
    const overlapping = signatureFields.find(f => {
      if (f.id === field.id || f.page !== field.page) return false

      const xOverlap = field.x < f.x + f.width && field.x + field.width > f.x
      const yOverlap = field.y < f.y + f.height && field.y + field.height > f.y

      return xOverlap && yOverlap
    })

    if (overlapping) {
      return { valid: false, error: 'Le champ chevauche un autre champ existant' }
    }

    return { valid: true }
  }

  const changePdfPage = async (newPage: number) => {
    if (!pdfDoc || newPage < 1 || newPage > totalPdfPages) return
    setCurrentPdfPage(newPage)
    await renderPdfPage(pdfDoc, newPage)
  }

  const loadTemplates = async () => {
    try {
      setLoadingTemplates(true)
      const response = await fetch('/api/admin/signature-templates?active=true')
      const data = await response.json()

      if (data.success) {
        setTemplates(data.templates || [])
      }
    } catch (error) {
      console.error('Erreur chargement templates:', error)
    } finally {
      setLoadingTemplates(false)
    }
  }

  const loadTemplateFields = (templateId: string) => {
    const template = templates.find(t => t.id === templateId)
    if (template) {
      // Charger les champs du template
      setSignatureFields(template.signature_fields.map(f => ({
        ...f,
        id: `field_${Date.now()}_${Math.random()}` // Nouveau ID unique
      })))
      setSelectedTemplateId(templateId)
    }
  }

  if (!isOpen) return null

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || file.type !== 'application/pdf') {
      alert('Veuillez sélectionner un fichier PDF')
      return
    }

    // Vérifier la taille du fichier (max 50MB)
    const MAX_FILE_SIZE = 50 * 1024 * 1024 // 50 MB
    if (file.size > MAX_FILE_SIZE) {
      alert(`⚠️ Le fichier est trop volumineux (${(file.size / 1024 / 1024).toFixed(2)} MB).\n\nTaille maximale: 50 MB`)
      e.target.value = '' // Reset l'input
      return
    }

    // Vérifier la taille minimum (1 KB)
    if (file.size < 1024) {
      alert('⚠️ Le fichier semble invalide (trop petit)')
      e.target.value = ''
      return
    }

    setPdfFile(file)

    // Convertir en Base64
    const reader = new FileReader()
    reader.onload = (e) => {
      const base64 = e.target?.result as string
      const base64Data = base64.split(',')[1]
      setPdfBase64(base64Data)
      setPdfUrl(base64)
    }
    reader.readAsDataURL(file)
  }

  const addField = (type: 'signature' | 'initials') => {
    const newField: SignatureField = {
      id: `field_${Date.now()}`,
      type,
      label: type === 'signature' ? 'Signature du client' : 'Initiales',
      page: 1,
      x: 100,
      y: 100,
      width: type === 'signature' ? 200 : 100,
      height: type === 'signature' ? 80 : 50
    }
    setSignatureFields([...signatureFields, newField])
    setSelectedField(newField.id)
  }

  const updateField = (id: string, updates: Partial<SignatureField>) => {
    setSignatureFields(fields => {
      const updatedFields = fields.map(f => {
        if (f.id === id) {
          const updatedField = { ...f, ...updates }

          // Valider la nouvelle position/dimension
          const validation = validateFieldPosition(updatedField)
          if (!validation.valid) {
            alert(`⚠️ ${validation.error}`)
            return f // Garder l'ancien champ si invalide
          }

          return updatedField
        }
        return f
      })
      return updatedFields
    })
  }

  const deleteField = (id: string) => {
    setSignatureFields(fields => fields.filter(f => f.id !== id))
    if (selectedField === id) setSelectedField(null)
  }

  const handleSubmit = async () => {
    if (signatureFields.length === 0) {
      alert('Veuillez ajouter au moins un champ de signature')
      return
    }

    // Valider tous les champs avant soumission
    for (const field of signatureFields) {
      const validation = validateFieldPosition(field)
      if (!validation.valid) {
        alert(`⚠️ Champ "${field.label}": ${validation.error}`)
        return
      }
    }

    setLoading(true)

    try {
      const response = await fetch('/api/admin/contrats-clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientName,
          clientEmail,
          title,
          pdfBase64,
          signatureFields
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Erreur lors de la création')
      }

      // Incrémenter le compteur d'utilisation du template si un template a été utilisé
      if (selectedTemplateId) {
        try {
          await fetch(`/api/admin/signature-templates/${selectedTemplateId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              usage_count: (templates.find(t => t.id === selectedTemplateId)?.usage_count || 0) + 1
            })
          })
        } catch (err) {
          console.error('Erreur incrémentation usage_count:', err)
          // Ne pas bloquer si ça échoue
        }
      }

      alert('✅ Contrat créé et envoyé avec succès!')
      onSuccess()
      handleClose()
    } catch (error: any) {
      alert('❌ Erreur: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    setStep(1)
    setClientName('')
    setClientEmail('')
    setTitle('')
    setSelectedTemplateId('')
    setPdfFile(null)
    setPdfBase64('')
    setPdfUrl('')
    setSignatureFields([])
    setSelectedField(null)
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Créer un contrat</h2>
            <p className="text-sm text-gray-600 mt-1">
              Étape {step}/3: {step === 1 ? 'Informations client' : step === 2 ? 'Upload du PDF' : 'Placement des signatures'}
            </p>
          </div>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition"
          >
            <X className="w-6 h-6 text-gray-600" />
          </button>
        </div>

        {/* Progress Bar */}
        <div className="px-6 pt-4">
          <div className="flex items-center gap-2">
            {[1, 2, 3].map(s => (
              <div
                key={s}
                className={`flex-1 h-2 rounded-full transition ${
                  s <= step ? 'bg-blue-600' : 'bg-gray-200'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Étape 1: Infos client */}
          {step === 1 && (
            <div className="space-y-6 max-w-2xl mx-auto">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Nom du client <span className="text-red-500">*</span>
                  <span className="text-xs text-gray-500 font-normal ml-2">
                    ({clientName.length}/100)
                  </span>
                </label>
                <input
                  type="text"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  placeholder="Ex: Jean Tremblay"
                  maxLength={100}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Email du client <span className="text-red-500">*</span>
                  <span className="text-xs text-gray-500 font-normal ml-2">
                    ({clientEmail.length}/254)
                  </span>
                </label>
                <input
                  type="email"
                  value={clientEmail}
                  onChange={(e) => setClientEmail(e.target.value)}
                  placeholder="Ex: jean@example.com"
                  maxLength={254}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Titre du contrat <span className="text-red-500">*</span>
                  <span className="text-xs text-gray-500 font-normal ml-2">
                    ({title.length}/200)
                  </span>
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ex: Contrat de prêt 5000$"
                  maxLength={200}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              {/* Sélecteur de template */}
              <div className="pt-4 border-t border-gray-200">
                <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-purple-500" />
                  Utiliser un template (optionnel)
                </label>
                <p className="text-xs text-gray-500 mb-3">
                  Sélectionnez un template pour pré-remplir automatiquement les positions des champs de signature
                </p>
                {loadingTemplates ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
                  </div>
                ) : (
                  <select
                    value={selectedTemplateId}
                    onChange={(e) => {
                      const templateId = e.target.value
                      if (templateId) {
                        loadTemplateFields(templateId)
                      } else {
                        setSelectedTemplateId('')
                        setSignatureFields([])
                      }
                    }}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-white"
                  >
                    <option value="">-- Placement manuel des champs --</option>
                    {templates.map(template => (
                      <option key={template.id} value={template.id}>
                        {template.name} ({template.signature_fields.length} champ{template.signature_fields.length > 1 ? 's' : ''})
                      </option>
                    ))}
                  </select>
                )}
                {selectedTemplateId && (
                  <div className="mt-3 p-3 bg-purple-50 border border-purple-200 rounded-lg">
                    <p className="text-sm text-purple-800 flex items-center gap-2">
                      <Check className="w-4 h-4" />
                      Template sélectionné: {templates.find(t => t.id === selectedTemplateId)?.name}
                    </p>
                    <p className="text-xs text-purple-600 mt-1">
                      Les champs seront automatiquement placés à l'étape 3
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Étape 2: Upload PDF */}
          {step === 2 && (
            <div className="max-w-2xl mx-auto">
              {!pdfFile ? (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-gray-300 rounded-2xl p-12 text-center hover:border-blue-500 hover:bg-blue-50 transition cursor-pointer"
                >
                  <Upload className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    Cliquez pour uploader un PDF
                  </h3>
                  <p className="text-sm text-gray-600">
                    Ou glissez-déposez le fichier ici
                  </p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="application/pdf"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="bg-green-50 border border-green-200 rounded-xl p-6 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                        <FileText className="w-6 h-6 text-green-600" />
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">{pdfFile.name}</p>
                        <p className="text-sm text-gray-600">
                          {(pdfFile.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setPdfFile(null)
                        setPdfBase64('')
                        setPdfUrl('')
                      }}
                      className="p-2 hover:bg-green-100 rounded-lg transition"
                    >
                      <Trash2 className="w-5 h-5 text-green-600" />
                    </button>
                  </div>

                  {pdfUrl && (
                    <div className="border border-gray-200 rounded-xl overflow-hidden">
                      <iframe
                        src={`${pdfUrl}#toolbar=0&navpanes=0`}
                        className="w-full h-[500px]"
                        title="Aperçu PDF"
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Étape 3: Placement des champs */}
          {step === 3 && (
            <div className="grid grid-cols-12 gap-6">
              {/* Panneau de gauche: Outils */}
              <div className="col-span-3 space-y-4">
                <div className="bg-gray-50 rounded-xl p-4">
                  <h3 className="font-semibold text-gray-900 mb-3">Ajouter un champ</h3>
                  <div className="space-y-2">
                    <button
                      onClick={() => addField('signature')}
                      className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center justify-center gap-2"
                    >
                      <Plus className="w-4 h-4" />
                      Signature
                    </button>
                    <button
                      onClick={() => addField('initials')}
                      className="w-full px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition flex items-center justify-center gap-2"
                    >
                      <Plus className="w-4 h-4" />
                      Initiales
                    </button>
                  </div>
                </div>

                {/* Liste des champs */}
                <div className="bg-gray-50 rounded-xl p-4">
                  <h3 className="font-semibold text-gray-900 mb-3">
                    Champs ({signatureFields.length})
                  </h3>
                  <div className="space-y-2">
                    {signatureFields.map((field) => (
                      <div
                        key={field.id}
                        className={`p-3 rounded-lg border-2 cursor-pointer transition ${
                          selectedField === field.id
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 bg-white hover:border-gray-300'
                        }`}
                        onClick={() => setSelectedField(field.id)}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium text-sm text-gray-900">
                            {field.type === 'signature' ? '✍️ Signature' : '📝 Initiales'}
                          </span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              deleteField(field.id)
                            }}
                            className="p-1 hover:bg-red-100 rounded transition"
                          >
                            <Trash2 className="w-4 h-4 text-red-600" />
                          </button>
                        </div>
                        <input
                          type="text"
                          value={field.label}
                          onChange={(e) => {
                            e.stopPropagation()
                            updateField(field.id, { label: e.target.value })
                          }}
                          className="w-full px-2 py-1 text-xs border border-gray-300 rounded"
                          placeholder="Label"
                        />
                      </div>
                    ))}
                    {signatureFields.length === 0 && (
                      <p className="text-sm text-gray-500 text-center py-4">
                        Aucun champ ajouté
                      </p>
                    )}
                  </div>
                </div>

                {/* Propriétés du champ sélectionné */}
                {selectedField && (
                  <div className="bg-gray-50 rounded-xl p-4">
                    <h3 className="font-semibold text-gray-900 mb-3">Propriétés</h3>
                    {(() => {
                      const field = signatureFields.find(f => f.id === selectedField)
                      if (!field) return null
                      return (
                        <div className="space-y-3">
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">X</label>
                            <input
                              type="number"
                              value={field.x}
                              onChange={(e) => updateField(field.id, { x: parseInt(e.target.value) })}
                              className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Y</label>
                            <input
                              type="number"
                              value={field.y}
                              onChange={(e) => updateField(field.id, { y: parseInt(e.target.value) })}
                              className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Largeur</label>
                            <input
                              type="number"
                              value={field.width}
                              onChange={(e) => updateField(field.id, { width: parseInt(e.target.value) })}
                              className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Hauteur</label>
                            <input
                              type="number"
                              value={field.height}
                              onChange={(e) => updateField(field.id, { height: parseInt(e.target.value) })}
                              className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                            />
                          </div>
                        </div>
                      )
                    })()}
                  </div>
                )}
              </div>

              {/* Panneau de droite: Prévisualisation PDF avec Canvas */}
              <div className="col-span-9">
                <div className="bg-gray-100 rounded-xl p-4" style={{ minHeight: '600px' }}>
                  {/* Contrôles de page */}
                  {pdfDoc && totalPdfPages > 1 && (
                    <div className="flex items-center justify-between mb-4">
                      <button
                        onClick={() => changePdfPage(currentPdfPage - 1)}
                        disabled={currentPdfPage === 1}
                        className="px-3 py-1 border border-gray-300 rounded-lg hover:bg-gray-200 disabled:opacity-50 text-sm"
                      >
                        ← Préc.
                      </button>
                      <span className="text-sm text-gray-600">
                        Page {currentPdfPage} / {totalPdfPages}
                      </span>
                      <button
                        onClick={() => changePdfPage(currentPdfPage + 1)}
                        disabled={currentPdfPage === totalPdfPages}
                        className="px-3 py-1 border border-gray-300 rounded-lg hover:bg-gray-200 disabled:opacity-50 text-sm"
                      >
                        Suiv. →
                      </button>
                    </div>
                  )}

                  <div
                    ref={containerRef}
                    className="overflow-auto bg-white rounded-lg p-4 flex justify-center items-start"
                    style={{ maxHeight: '650px', minHeight: '400px' }}
                  >
                    {pdfDoc ? (
                      <canvas
                        ref={canvasRef}
                        className="shadow-lg"
                        onClick={(e) => {
                          const canvas = canvasRef.current
                          if (!canvas) return

                          const rect = canvas.getBoundingClientRect()
                          const clickX = e.clientX - rect.left
                          const clickY = e.clientY - rect.top

                          // Convertir en coordonnées PDF (sans scale)
                          const pdfX = Math.round(clickX / pdfScale)
                          const pdfY = Math.round(clickY / pdfScale)

                          // Vérifier si on a cliqué sur un champ existant
                          const clickedField = signatureFields.find(f => {
                            const fx = f.x * pdfScale
                            const fy = f.y * pdfScale
                            const fw = f.width * pdfScale
                            const fh = f.height * pdfScale

                            return clickX >= fx && clickX <= fx + fw &&
                                   clickY >= fy && clickY <= fy + fh &&
                                   f.page === currentPdfPage
                          })

                          if (clickedField) {
                            setSelectedField(clickedField.id)
                          } else {
                            setSelectedField(null)
                          }

                          // Re-render pour montrer la sélection
                          if (pdfDoc) {
                            renderPdfPage(pdfDoc, currentPdfPage)
                          }
                        }}
                      />
                    ) : (
                      <div className="flex items-center justify-center h-64 text-gray-500">
                        <Loader2 className="w-8 h-8 animate-spin" />
                        <span className="ml-2">Chargement du PDF...</span>
                      </div>
                    )}
                  </div>

                  {signatureFields.length > 0 && (
                    <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <p className="text-sm text-blue-800">
                        ✅ <strong>{signatureFields.length}</strong> champ{signatureFields.length > 1 ? 's' : ''} placé{signatureFields.length > 1 ? 's' : ''}
                        {selectedTemplateId && ' (depuis template)'}
                      </p>
                      <p className="text-xs text-blue-600 mt-1">
                        Clique sur un rectangle pour le sélectionner et modifier ses propriétés
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200">
          <button
            onClick={step === 1 ? handleClose : () => setStep((step - 1) as 1 | 2)}
            className="px-6 py-3 text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 transition font-semibold"
          >
            {step === 1 ? 'Annuler' : 'Précédent'}
          </button>

          {step < 3 ? (
            <button
              onClick={() => {
                if (step === 1 && (!clientName || !clientEmail || !title)) {
                  alert('Veuillez remplir tous les champs')
                  return
                }
                if (step === 2 && !pdfFile) {
                  alert('Veuillez uploader un PDF')
                  return
                }
                setStep((step + 1) as 2 | 3)
              }}
              className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition font-semibold"
            >
              Suivant
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={loading || signatureFields.length === 0}
              className="px-8 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 transition font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Envoi en cours...
                </>
              ) : (
                <>
                  <Check className="w-5 h-5" />
                  Créer et envoyer
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
