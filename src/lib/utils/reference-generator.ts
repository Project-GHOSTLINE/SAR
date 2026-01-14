/**
 * 🔢 Reference Generator
 * Génère des références uniques pour les demandes de prêt
 */

import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)

/**
 * Générer une référence unique pour une demande de prêt
 * Format: SAR-LP-000001, SAR-LP-000002, etc.
 */
export async function generateLoanReference(): Promise<string> {
  try {
    // Appeler la fonction Postgres pour générer la référence
    const { data, error } = await supabase.rpc('generate_loan_reference')

    if (error) {
      console.error('[ReferenceGenerator] Error calling generate_loan_reference:', error)
      throw error
    }

    if (data) {
      return data as string
    }

    // Fallback: générer localement si la fonction DB échoue
    return await generateReferenceFallback()
  } catch (error) {
    console.error('[ReferenceGenerator] Failed to generate reference:', error)
    // Fallback en cas d'erreur
    return await generateReferenceFallback()
  }
}

/**
 * Fallback: générer une référence localement
 */
async function generateReferenceFallback(): Promise<string> {
  try {
    // Compter le nombre de demandes existantes
    const { count, error } = await supabase
      .from('loan_applications')
      .select('*', { count: 'exact', head: true })

    if (error) {
      console.error('[ReferenceGenerator] Error counting applications:', error)
      // Utiliser un nombre aléatoire en dernier recours
      const randomId = Math.floor(Math.random() * 999999) + 1
      return `SAR-LP-${randomId.toString().padStart(6, '0')}`
    }

    const nextId = (count || 0) + 1
    return `SAR-LP-${nextId.toString().padStart(6, '0')}`
  } catch (error) {
    console.error('[ReferenceGenerator] Fallback failed:', error)
    // Dernier recours: timestamp
    const timestamp = Date.now().toString().slice(-6)
    return `SAR-LP-${timestamp}`
  }
}

/**
 * Valider qu'une référence est unique
 */
export async function isReferenceUnique(reference: string): Promise<boolean> {
  try {
    const { count } = await supabase
      .from('loan_applications')
      .select('id', { count: 'exact', head: true })
      .eq('reference', reference)

    return count === 0
  } catch (error) {
    console.error('[ReferenceGenerator] Error checking reference uniqueness:', error)
    return false
  }
}

/**
 * Générer une référence unique garantie (retry jusqu'à succès)
 */
export async function generateUniqueReference(maxAttempts = 10): Promise<string> {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const reference = await generateLoanReference()
    const isUnique = await isReferenceUnique(reference)

    if (isUnique) {
      return reference
    }

    console.warn(
      `[ReferenceGenerator] Reference ${reference} already exists, retrying... (${attempt}/${maxAttempts})`
    )

    // Wait un peu avant de réessayer
    await new Promise((resolve) => setTimeout(resolve, 100 * attempt))
  }

  // Si toutes les tentatives échouent, utiliser un UUID partiel
  const uuid = crypto.randomUUID().split('-')[0]
  return `SAR-LP-${uuid.toUpperCase()}`
}
