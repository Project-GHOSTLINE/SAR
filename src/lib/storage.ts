import { put } from '@vercel/blob'

/**
 * Storage Helper - Vercel Blob Storage
 *
 * Remplace Google Drive pour upload de documents clients
 * - Pas de service account requis
 * - Gratuit jusqu'à 5GB
 * - URLs publiques automatiques
 * - Intégré avec Vercel
 */

interface UploadFileResult {
  url: string
  pathname: string
  size: number
  uploadedAt: string
}

interface UploadMetadata {
  demande_id: string
  client_name: string
  file_type: string
}

/**
 * Upload un fichier vers Vercel Blob Storage
 *
 * Structure: demande-{demandeId}/{filename}
 * Exemple: demande-fr55592/permis-conduire.jpg
 */
export async function uploadFile(
  fileBuffer: Buffer,
  fileName: string,
  metadata: UploadMetadata
): Promise<UploadFileResult> {
  try {
    // Créer le pathname avec structure organisée
    const year = new Date().getFullYear()
    const month = (new Date().getMonth() + 1).toString().padStart(2, '0')
    const pathname = `${year}/${month}/${metadata.demande_id}/${fileName}`

    console.log(`[Storage] Uploading file: ${pathname}`)

    // Upload vers Vercel Blob
    const blob = await put(pathname, fileBuffer, {
      access: 'public', // URLs publiques
      addRandomSuffix: false, // Pas de suffix random, on veut des noms propres
      contentType: getContentType(fileName),
      cacheControlMaxAge: 31536000 // 1 an de cache
    })

    console.log(`[Storage] File uploaded successfully: ${blob.url}`)

    return {
      url: blob.url,
      pathname: blob.pathname,
      size: fileBuffer.length,
      uploadedAt: new Date().toISOString()
    }
  } catch (error) {
    console.error(`[Storage] Failed to upload file ${fileName}:`, error)
    throw new Error(`Upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * Upload plusieurs fichiers d'un client
 */
export async function uploadClientDocuments(
  demandeId: string,
  clientName: string,
  files: Array<{
    buffer: Buffer
    filename: string
    mimeType: string
  }>
) {
  try {
    console.log(`[Storage] Uploading ${files.length} file(s) for demande ${demandeId}`)

    // Upload tous les fichiers
    const uploadedFiles: UploadFileResult[] = []

    for (const file of files) {
      const result = await uploadFile(file.buffer, file.filename, {
        demande_id: demandeId,
        client_name: clientName,
        file_type: file.mimeType
      })

      uploadedFiles.push(result)
    }

    // Créer metadata.json
    const metadataContent = JSON.stringify(
      {
        demande_id: demandeId,
        client_name: clientName,
        uploaded_at: new Date().toISOString(),
        files: uploadedFiles.map(f => ({
          filename: f.pathname.split('/').pop(),
          url: f.url,
          size: f.size,
          uploaded_at: f.uploadedAt
        }))
      },
      null,
      2
    )

    const metadataResult = await uploadFile(
      Buffer.from(metadataContent),
      'metadata.json',
      {
        demande_id: demandeId,
        client_name: clientName,
        file_type: 'application/json'
      }
    )

    console.log(`[Storage] All files uploaded successfully for demande ${demandeId}`)

    return {
      success: true,
      files: uploadedFiles,
      metadata_url: metadataResult.url
    }
  } catch (error) {
    console.error('[Storage] Upload workflow failed:', error)
    throw error
  }
}

/**
 * Détecter le Content-Type depuis le nom de fichier
 */
function getContentType(fileName: string): string {
  const ext = fileName.split('.').pop()?.toLowerCase()

  const mimeTypes: Record<string, string> = {
    // Images
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    gif: 'image/gif',
    webp: 'image/webp',
    svg: 'image/svg+xml',

    // Documents
    pdf: 'application/pdf',
    doc: 'application/msword',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    xls: 'application/vnd.ms-excel',
    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    txt: 'text/plain',

    // Autres
    json: 'application/json',
    xml: 'application/xml',
    zip: 'application/zip'
  }

  return mimeTypes[ext || ''] || 'application/octet-stream'
}
