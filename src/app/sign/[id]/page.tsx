'use client'

import { useParams, useSearchParams } from 'next/navigation'
import { useState, useEffect, useRef } from 'react'
import { CheckCircle, Clock, XCircle, Loader2 } from 'lucide-react'

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

interface DocumentData {
  documentId: string
  clientName: string
  title: string
  pdfUrl: string
  signatureFields: SignatureField[]
  status: string
}

export default function SignDocumentPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const token = searchParams.get('token')

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [docData, setDocData] = useState<DocumentData | null>(null)
  const [step, setStep] = useState<'loading' | 'capture-initials' | 'capture-signature' | 'signing' | 'success'>('loading')
  const [savedInitials, setSavedInitials] = useState<string | null>(null)
  const [savedSignature, setSavedSignature] = useState<string | null>(null)
  const [signedFields, setSignedFields] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)

  const initialsCanvasRef = useRef<HTMLCanvasElement>(null)
  const signatureCanvasRef = useRef<HTMLCanvasElement>(null)
  const [initialsPad, setInitialsPad] = useState<any>(null)
  const [signaturePad, setSignaturePad] = useState<any>(null)

  useEffect(() => {
    loadDocument()
  }, [])

  useEffect(() => {
    // Charger signature_pad dynamiquement côté client
    if (typeof window !== 'undefined') {
      import('signature_pad').then((module) => {
        const SignaturePad = module.default

        if (initialsCanvasRef.current && !initialsPad) {
          const pad = new SignaturePad(initialsCanvasRef.current, {
            backgroundColor: 'rgb(255, 255, 255)'
          })
          setInitialsPad(pad)
        }

        if (signatureCanvasRef.current && !signaturePad) {
          const pad = new SignaturePad(signatureCanvasRef.current, {
            backgroundColor: 'rgb(255, 255, 255)'
          })
          setSignaturePad(pad)
        }
      })
    }
  }, [step])

  const loadDocument = async () => {
    if (!token) {
      setError('Lien invalide - Token manquant')
      setLoading(false)
      return
    }

    try {
      const res = await fetch(`/api/sign/${params.id}?token=${token}`)
      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Document non trouvé')
        setLoading(false)
        return
      }

      setDocData(data)
      setLoading(false)

      // Déterminer l'étape suivante
      const hasInitials = data.signatureFields.some((f: SignatureField) => f.type === 'initials')
      const hasSignature = data.signatureFields.some((f: SignatureField) => f.type === 'signature')

      if (hasInitials) {
        setStep('capture-initials')
      } else if (hasSignature) {
        setStep('capture-signature')
      } else {
        setStep('signing')
      }
    } catch (err: any) {
      setError(err.message)
      setLoading(false)
    }
  }

  const saveInitials = () => {
    if (!initialsPad || initialsPad.isEmpty()) {
      alert('Veuillez dessiner vos initiales')
      return
    }

    setSavedInitials(initialsPad.toDataURL())

    const hasSignature = docData?.signatureFields.some((f: SignatureField) => f.type === 'signature')
    if (hasSignature) {
      setStep('capture-signature')
    } else {
      setStep('signing')
    }
  }

  const saveSignature = () => {
    if (!signaturePad || signaturePad.isEmpty()) {
      alert('Veuillez dessiner votre signature')
      return
    }

    setSavedSignature(signaturePad.toDataURL())
    setStep('signing')
  }

  const applySignatureToField = (field: SignatureField) => {
    if (signedFields[field.id]) return

    const imgSrc = field.type === 'initials' ? savedInitials : savedSignature
    if (!imgSrc) return

    setSignedFields(prev => ({ ...prev, [field.id]: imgSrc }))
  }

  const submitSignature = async () => {
    if (!docData || !token) return

    const totalFields = docData.signatureFields.length
    const signedCount = Object.keys(signedFields).length

    if (signedCount < totalFields) {
      alert(`Veuillez signer tous les champs (${signedCount}/${totalFields})`)
      return
    }

    setSubmitting(true)

    try {
      const signatures = Object.keys(signedFields).map(fieldId => ({
        fieldId,
        data: signedFields[fieldId]
      }))

      const res = await fetch(`/api/sign/${params.id}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, signatures })
      })

      const data = await res.json()

      if (!res.ok) {
        alert('Erreur: ' + data.error)
        setSubmitting(false)
        return
      }

      setStep('success')
    } catch (err: any) {
      alert('Erreur: ' + err.message)
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Chargement du document...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md text-center">
          <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Erreur</h1>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    )
  }

  if (step === 'capture-initials') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-lg w-full">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl font-bold text-blue-600">1</span>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Vos initiales</h1>
            <p className="text-gray-600">Dessinez vos initiales ci-dessous</p>
          </div>

          <div className="border-2 border-dashed border-gray-300 rounded-xl mb-6 overflow-hidden">
            <canvas
              ref={initialsCanvasRef}
              width={600}
              height={200}
              className="w-full"
            />
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => initialsPad?.clear()}
              className="flex-1 px-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition"
            >
              Effacer
            </button>
            <button
              onClick={saveInitials}
              className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition"
            >
              Continuer →
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (step === 'capture-signature') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-lg w-full">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl font-bold text-blue-600">2</span>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Votre signature</h1>
            <p className="text-gray-600">Dessinez votre signature complète ci-dessous</p>
          </div>

          <div className="border-2 border-dashed border-gray-300 rounded-xl mb-6 overflow-hidden">
            <canvas
              ref={signatureCanvasRef}
              width={600}
              height={200}
              className="w-full"
            />
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => signaturePad?.clear()}
              className="flex-1 px-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition"
            >
              Effacer
            </button>
            <button
              onClick={saveSignature}
              className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition"
            >
              Commencer à signer →
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (step === 'signing' && docData) {
    const totalFields = docData.signatureFields.length
    const signedCount = Object.keys(signedFields).length
    const progress = (signedCount / totalFields) * 100

    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
        {/* Header */}
        <div className="bg-white shadow-sm sticky top-0 z-50">
          <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
            <div>
              <h1 className="text-lg font-bold text-gray-900">{docData.title}</h1>
              <p className="text-sm text-gray-600">{docData.clientName}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-600 mb-1">{signedCount}/{totalFields} signé(s)</p>
              <div className="w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-600 transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Signatures prévisualisées */}
        {(savedInitials || savedSignature) && (
          <div className="bg-white border-b border-gray-200">
            <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-6">
              {savedInitials && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600">Initiales:</span>
                  <div className="bg-gray-50 px-3 py-1 rounded-lg">
                    <img src={savedInitials} alt="Initiales" className="h-8" />
                  </div>
                </div>
              )}
              {savedSignature && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600">Signature:</span>
                  <div className="bg-gray-50 px-3 py-1 rounded-lg">
                    <img src={savedSignature} alt="Signature" className="h-8" />
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* PDF Viewer */}
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="bg-white rounded-xl shadow-lg p-8 mb-20">
            <div className="mb-6">
              <iframe
                src={`${docData.pdfUrl}#toolbar=0&navpanes=0&scrollbar=0`}
                className="w-full h-[600px] border border-gray-200 rounded-lg"
                title="Document PDF"
              />
            </div>

            {/* Champs de signature */}
            <div className="space-y-3">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">
                Champs à signer ({signedCount}/{totalFields})
              </h3>
              {docData.signatureFields.map((field) => (
                <div
                  key={field.id}
                  className={`p-4 border-2 rounded-xl flex items-center justify-between transition ${
                    signedFields[field.id]
                      ? 'border-green-500 bg-green-50'
                      : 'border-yellow-500 bg-yellow-50 animate-pulse'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {signedFields[field.id] ? (
                      <CheckCircle className="w-6 h-6 text-green-600" />
                    ) : (
                      <Clock className="w-6 h-6 text-yellow-600" />
                    )}
                    <div>
                      <p className="font-semibold text-gray-900">{field.label}</p>
                      <p className="text-sm text-gray-600">
                        Page {field.page} - {field.type === 'signature' ? 'Signature' : 'Initiales'}
                      </p>
                    </div>
                  </div>
                  {!signedFields[field.id] && (
                    <button
                      onClick={() => applySignatureToField(field)}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition"
                    >
                      Signer
                    </button>
                  )}
                  {signedFields[field.id] && (
                    <div className="bg-white px-3 py-1 rounded-lg border border-green-200">
                      <img src={signedFields[field.id]} alt="Signé" className="h-8" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer avec bouton de soumission */}
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg">
          <div className="max-w-4xl mx-auto px-4 py-4 flex justify-center">
            <button
              onClick={submitSignature}
              disabled={signedCount < totalFields || submitting}
              className={`px-8 py-3 rounded-xl font-bold text-lg transition ${
                signedCount < totalFields || submitting
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-green-600 text-white hover:bg-green-700'
              }`}
            >
              {submitting ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Envoi en cours...
                </span>
              ) : (
                '✓ Terminer et envoyer'
              )}
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (step === 'success' && docData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-12 max-w-lg text-center">
          <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-16 h-16 text-green-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-3">Contrat signé!</h1>
          <p className="text-lg text-gray-600 mb-6">
            Merci {docData.clientName}!<br />
            Une copie vous a été envoyée par email.
          </p>
          <div className="bg-gray-50 rounded-xl p-4 text-left">
            <p className="text-sm text-gray-600">
              <strong>Document:</strong> {docData.title}
            </p>
            <p className="text-sm text-gray-600">
              <strong>Signé le:</strong> {new Date().toLocaleString('fr-CA')}
            </p>
          </div>
        </div>
      </div>
    )
  }

  return null
}
