import { NextRequest, NextResponse } from 'next/server'
import { uploadClientDocuments } from '@/lib/storage'

export const dynamic = 'force-dynamic'

/**
 * POST /api/upload-documents
 *
 * Upload documents clients vers Google Drive
 * Accepte multipart/form-data avec fichiers + metadata
 */
export async function POST(request: NextRequest) {
  try {
    // Parse multipart form data
    const formData = await request.formData()

    // Extraire metadata
    const demandeId = formData.get('demande_id') as string
    const clientName = formData.get('client_name') as string

    if (!demandeId || !clientName) {
      return NextResponse.json(
        { success: false, error: 'demande_id et client_name sont requis' },
        { status: 400 }
      )
    }

    // Extraire tous les fichiers
    const files: Array<{ buffer: Buffer; filename: string; mimeType: string }> = []

    for (const [key, value] of formData.entries()) {
      if (value instanceof File) {
        const arrayBuffer = await value.arrayBuffer()
        const buffer = Buffer.from(arrayBuffer)

        files.push({
          buffer,
          filename: value.name,
          mimeType: value.type || 'application/octet-stream'
        })

        console.log(`[Upload] File received: ${value.name} (${buffer.length} bytes)`)
      }
    }

    if (files.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Aucun fichier trouvé' },
        { status: 400 }
      )
    }

    // Upload vers Google Drive
    const result = await uploadClientDocuments(demandeId, clientName, files)

    return NextResponse.json({
      ...result,
      success: true,
      message: `${files.length} fichier(s) uploadé(s) avec succès`
    })

  } catch (error) {
    console.error('[Upload] Error:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Erreur lors de l\'upload',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
