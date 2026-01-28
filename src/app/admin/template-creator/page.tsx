'use client'

import { useState, useEffect, useRef } from 'react'
import AdminNav from '@/components/admin/AdminNav'
import { ArrowLeft, Upload, Plus, Save, X } from 'lucide-react'
import { useRouter } from 'next/navigation'
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

export default function TemplateCreatorPage() {
  const router = useRouter()
  const [pdfDoc, setPdfDoc] = useState<any>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [savedFields, setSavedFields] = useState<SignatureField[]>([])
  const [lastClickX, setLastClickX] = useState(0)
  const [lastClickY, setLastClickY] = useState(0)
  const [fieldType, setFieldType] = useState<'signature' | 'initials'>('initials')
  const [fieldWidth, setFieldWidth] = useState(80)
  const [fieldHeight, setFieldHeight] = useState(25)
  const [saving, setSaving] = useState(false)
  const [pdfJsLoaded, setPdfJsLoaded] = useState(false)
  const [loading, setLoading] = useState(false)

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const pageWrapperRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(1.5)

  // Configurer PDF.js
  useEffect(() => {
    console.log('🔄 Configuration de PDF.js...')

    // Configurer le worker (fichier local)
    pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.js/pdf.worker.min.js'

    console.log('✅ PDF.js configuré avec succès')
    setPdfJsLoaded(true)
  }, [])

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) {
      console.log('❌ Aucun fichier sélectionné')
      return
    }

    console.log('📄 Fichier sélectionné:', file.name, file.type, file.size, 'bytes')

    if (!pdfJsLoaded) {
      alert('⏳ PDF.js est en cours de chargement. Attends quelques secondes et réessaye.')
      console.error('❌ PDF.js pas encore chargé')
      return
    }

    setLoading(true)
    console.log('🔄 Lecture du PDF...')

    try {
      const arrayBuffer = await file.arrayBuffer()
      console.log('✅ Fichier lu, taille:', arrayBuffer.byteLength, 'bytes')

      console.log('🔄 Chargement du document PDF...')
      const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer })
      const pdf = await loadingTask.promise
      console.log('✅ PDF chargé:', pdf.numPages, 'pages')

      setPdfDoc(pdf)
      setTotalPages(pdf.numPages)
      setCurrentPage(1)

      console.log('🔄 Rendu de la page 1...')
      await renderPage(pdf, 1)
      console.log('✅ Page rendue avec succès')
    } catch (error) {
      console.error('❌ Erreur lors du chargement du PDF:', error)
      alert('❌ Erreur lors du chargement du PDF. Vérifie que c\'est un PDF valide.')
    } finally {
      setLoading(false)
    }
  }

  const renderPage = async (pdf: any, pageNum: number) => {
    setCurrentPage(pageNum)

    const page = await pdf.getPage(pageNum)

    // Calculer le scale optimal pour que le PDF rentre dans le conteneur
    const container = containerRef.current
    let calculatedScale = scale

    if (container) {
      const containerWidth = container.clientWidth - 64 // padding
      const baseViewport = page.getViewport({ scale: 1 })
      const optimalScale = containerWidth / baseViewport.width
      // Limiter entre 0.5 et 2
      calculatedScale = Math.min(Math.max(optimalScale, 0.5), 2)
      setScale(calculatedScale)
      console.log('📐 Scale calculé:', calculatedScale)
    }

    const viewport = page.getViewport({ scale: calculatedScale })

    const canvas = canvasRef.current
    if (!canvas) return

    canvas.width = viewport.width
    canvas.height = viewport.height

    const ctx = canvas.getContext('2d')
    await page.render({ canvasContext: ctx, viewport }).promise

    // Dessiner les champs existants
    renderExistingFields(ctx, pageNum)
  }

  const renderExistingFields = (ctx: any, pageNum: number) => {
    const pageFields = savedFields.filter(f => f.page === pageNum)
    pageFields.forEach(field => {
      ctx.strokeStyle = field.type === 'signature' ? '#2563eb' : '#f59e0b'
      ctx.lineWidth = 2
      ctx.setLineDash([5, 5])
      ctx.strokeRect(field.x * scale, field.y * scale, field.width * scale, field.height * scale)
      ctx.fillStyle = field.type === 'signature' ? 'rgba(37, 99, 235, 0.2)' : 'rgba(245, 158, 11, 0.2)'
      ctx.fillRect(field.x * scale, field.y * scale, field.width * scale, field.height * scale)
      ctx.setLineDash([])
    })
  }

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const clickX = e.clientX - rect.left
    const clickY = e.clientY - rect.top

    // Convertir en coordonnées PDF (sans scale)
    const pdfX = Math.round(clickX / scale)
    const pdfY = Math.round(clickY / scale)

    setLastClickX(pdfX)
    setLastClickY(pdfY)

    // Redessiner avec preview
    if (pdfDoc) {
      renderPage(pdfDoc, currentPage).then(() => {
        const ctx = canvas.getContext('2d')
        if (!ctx) return

        // Dessiner le marqueur de clic
        ctx.beginPath()
        ctx.arc(clickX, clickY, 10, 0, 2 * Math.PI)
        ctx.fillStyle = 'rgba(37, 99, 235, 0.5)'
        ctx.fill()
        ctx.strokeStyle = '#2563eb'
        ctx.lineWidth = 2
        ctx.stroke()

        // Preview du champ
        ctx.strokeStyle = '#16a34a'
        ctx.lineWidth = 2
        ctx.setLineDash([5, 5])
        ctx.strokeRect(clickX, clickY, fieldWidth * scale, fieldHeight * scale)
        ctx.fillStyle = 'rgba(22, 163, 74, 0.3)'
        ctx.fillRect(clickX, clickY, fieldWidth * scale, fieldHeight * scale)
        ctx.setLineDash([])
      })
    }
  }

  const handleSaveField = () => {
    if (lastClickX === 0 && lastClickY === 0) {
      alert('Clique d\'abord sur le PDF!')
      return
    }

    const newField: SignatureField = {
      id: `field_${Date.now()}`,
      type: fieldType,
      label: fieldType === 'signature' ? 'Signature du client' : 'Initiales du client',
      page: currentPage,
      x: lastClickX,
      y: lastClickY,
      width: fieldWidth,
      height: fieldHeight
    }

    setSavedFields([...savedFields, newField])

    // Re-render pour montrer le champ ajouté
    if (pdfDoc) {
      renderPage(pdfDoc, currentPage)
    }
  }

  const removeField = (id: string) => {
    setSavedFields(savedFields.filter(f => f.id !== id))
    if (pdfDoc) {
      renderPage(pdfDoc, currentPage)
    }
  }

  const changePage = (newPage: number) => {
    if (newPage < 1 || newPage > totalPages || !pdfDoc) return
    renderPage(pdfDoc, newPage)
  }

  const handleSaveTemplate = async () => {
    if (savedFields.length === 0) {
      alert('❌ Aucun champ à sauvegarder!\n\nClique sur le PDF pour ajouter des champs d\'abord.')
      return
    }

    const templateName = prompt('📝 Nom du template:', 'Mon Template SAR')
    if (!templateName) return

    const templateDescription = prompt('📝 Description (optionnel):', '')

    setSaving(true)

    try {
      const res = await fetch('/api/admin/signature-templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: templateName,
          description: templateDescription || undefined,
          category: 'general',
          signature_fields: savedFields
        })
      })

      const data = await res.json()

      if (data.success) {
        alert(`✅ Template "${templateName}" sauvegardé avec succès!\n\n${savedFields.length} champ(s) enregistré(s).`)

        if (confirm('🚀 Ouvrir le dashboard des templates?')) {
          router.push('/admin/contrats-signature')
        }
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

  useEffect(() => {
    if (fieldType === 'signature') {
      setFieldWidth(180)
      setFieldHeight(40)
    } else {
      setFieldWidth(80)
      setFieldHeight(25)
    }
  }, [fieldType])

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <AdminNav currentPage="/admin/template-creator" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/admin/contrats-signature')}
              className="flex items-center gap-2 px-4 py-2 text-gray-300 hover:bg-slate-700 rounded-lg transition border border-slate-600"
            >
              <ArrowLeft className="w-4 h-4" />
              Retour
            </button>
            <div>
              <h1 className="text-3xl font-bold text-white">🎯 Outil de coordonnées PDF</h1>
              <p className="text-gray-400">Clique sur le PDF pour définir les positions exactes</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Sidebar */}
          <div className="bg-slate-800 rounded-xl shadow-sm border border-slate-700 p-6">
            <div className="bg-slate-900 p-4 rounded-lg mb-6 border border-yellow-600/30">
              <h3 className="text-yellow-500 font-semibold mb-2 flex items-center gap-2">
                📋 Instructions
              </h3>
              <ol className="text-sm text-gray-400 space-y-1 list-decimal list-inside">
                <li>Charge ton PDF (Contrat ou Annexe)</li>
                <li>Sélectionne le type (Initiales ou Signature)</li>
                <li>Clique exactement sur le [INIT] ou [SIGNATURE]</li>
                <li>Ajuste la taille si nécessaire</li>
                <li>Répète pour chaque page</li>
                <li>Sauvegarde le template</li>
              </ol>
            </div>

            {!pdfDoc && (
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  📄 Charger un PDF
                </label>
                {!pdfJsLoaded && (
                  <div className="mb-2 p-2 bg-yellow-500/10 border border-yellow-500/30 rounded text-xs text-yellow-400">
                    ⏳ Chargement de PDF.js en cours...
                  </div>
                )}
                <label className={`flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg transition bg-slate-900 ${
                  loading ? 'border-blue-500 cursor-wait' :
                  pdfJsLoaded ? 'border-slate-600 cursor-pointer hover:border-blue-500' :
                  'border-slate-700 cursor-not-allowed opacity-50'
                }`}>
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-8 w-8 border-2 border-gray-400 border-t-blue-500 mb-2"></div>
                      <span className="text-sm text-gray-400">Chargement du PDF...</span>
                    </>
                  ) : (
                    <>
                      <Upload className="w-8 h-8 text-gray-400 mb-2" />
                      <span className="text-sm text-gray-400">
                        {pdfJsLoaded ? 'Cliquez pour charger' : 'Attends le chargement de PDF.js...'}
                      </span>
                    </>
                  )}
                  <input
                    type="file"
                    accept=".pdf"
                    onChange={handleFileUpload}
                    disabled={!pdfJsLoaded || loading}
                    className="hidden"
                  />
                </label>
              </div>
            )}

            {pdfDoc && (
              <>
                <div className="bg-slate-900 p-4 rounded-lg mb-4">
                  <h3 className="text-blue-400 font-semibold mb-3">📍 Position actuelle</h3>
                  <div className="space-y-2 font-mono text-sm">
                    <p className="text-gray-300">Page: <span className="text-blue-400 font-bold">{currentPage}</span></p>
                    <p className="text-gray-300">X: <span className="text-blue-400 font-bold">{lastClickX}</span></p>
                    <p className="text-gray-300">Y: <span className="text-blue-400 font-bold">{lastClickY}</span></p>
                    <p className="text-gray-300">Type: <span className="text-blue-400 font-bold">{fieldType}</span></p>
                  </div>
                </div>

                <div className="space-y-4 mb-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Type de champ</label>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setFieldType('initials')}
                        className={`flex-1 px-3 py-2 rounded-lg font-medium transition ${
                          fieldType === 'initials'
                            ? 'bg-yellow-600 text-white'
                            : 'bg-slate-700 text-gray-300 hover:bg-slate-600'
                        }`}
                      >
                        Initiales
                      </button>
                      <button
                        onClick={() => setFieldType('signature')}
                        className={`flex-1 px-3 py-2 rounded-lg font-medium transition ${
                          fieldType === 'signature'
                            ? 'bg-blue-600 text-white'
                            : 'bg-slate-700 text-gray-300 hover:bg-slate-600'
                        }`}
                      >
                        Signature
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Largeur (width)</label>
                    <input
                      type="number"
                      value={fieldWidth}
                      onChange={(e) => setFieldWidth(parseInt(e.target.value))}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Hauteur (height)</label>
                    <input
                      type="number"
                      value={fieldHeight}
                      onChange={(e) => setFieldHeight(parseInt(e.target.value))}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <button
                    onClick={handleSaveField}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-medium"
                  >
                    <Plus className="w-4 h-4" />
                    Ajouter ce champ
                  </button>
                </div>

                <div>
                  <h3 className="text-blue-400 font-semibold mb-3">✅ Champs enregistrés ({savedFields.length})</h3>
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {savedFields.length === 0 ? (
                      <p className="text-sm text-gray-400 text-center py-4">Aucun champ enregistré</p>
                    ) : (
                      savedFields.map(field => (
                        <div key={field.id} className="bg-slate-900 p-3 rounded-lg border border-slate-700 relative">
                          <button
                            onClick={() => removeField(field.id)}
                            className="absolute top-2 right-2 p-1 text-red-400 hover:bg-red-500/20 rounded"
                          >
                            <X className="w-3 h-3" />
                          </button>
                          <div className="mb-2">
                            <span className={`text-xs px-2 py-1 rounded ${
                              field.type === 'initials'
                                ? 'bg-yellow-600/20 text-yellow-400'
                                : 'bg-blue-600/20 text-blue-400'
                            }`}>
                              {field.type === 'initials' ? 'INIT' : 'SIGN'}
                            </span>
                          </div>
                          <p className="text-xs text-gray-400 font-mono">
                            Page {field.page} | x:{field.x}, y:{field.y} | {field.width}x{field.height}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <button
                  onClick={handleSaveTemplate}
                  disabled={saving || savedFields.length === 0}
                  className="w-full mt-6 flex items-center justify-center gap-2 px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
                >
                  <Save className="w-5 h-5" />
                  {saving ? 'Sauvegarde...' : 'Sauvegarder dans SAR'}
                </button>
              </>
            )}
          </div>

          {/* PDF Viewer */}
          <div className="lg:col-span-2 bg-slate-800 rounded-xl shadow-sm border border-slate-700 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-white">Aperçu du PDF</h2>
              {pdfDoc && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => changePage(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="px-3 py-1 border border-slate-600 rounded-lg hover:bg-slate-700 disabled:opacity-50 text-gray-300"
                  >
                    ← Préc.
                  </button>
                  <span className="text-sm text-gray-400">
                    Page {currentPage} / {totalPages}
                  </span>
                  <button
                    onClick={() => changePage(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1 border border-slate-600 rounded-lg hover:bg-slate-700 disabled:opacity-50 text-gray-300"
                  >
                    Suiv. →
                  </button>
                </div>
              )}
            </div>

            {!pdfDoc ? (
              <div className="flex items-center justify-center h-[600px] border-2 border-dashed border-slate-600 rounded-lg bg-slate-900">
                <div className="text-center">
                  <Upload className="w-16 h-16 text-gray-500 mx-auto mb-4" />
                  <p className="text-gray-400">Chargez un PDF pour commencer</p>
                </div>
              </div>
            ) : (
              <div
                ref={containerRef}
                className="border border-slate-600 rounded-lg overflow-auto bg-slate-900 p-8"
                style={{
                  maxHeight: 'calc(100vh - 250px)',
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'flex-start'
                }}
              >
                <canvas
                  ref={canvasRef}
                  onClick={handleCanvasClick}
                  className="cursor-crosshair shadow-2xl"
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
