import { getSupabaseAdmin } from './supabase'
import { hashToken, verifyToken } from './crypto'
import { MagicLink } from '@/types'

export interface ValidateMagicLinkResult {
  valid: boolean
  magicLink?: MagicLink
  applicationId?: string
  error?: string
}

/**
 * Validate a magic link token
 * - Checks if token hash exists
 * - Checks expiration
 * - Checks if revoked
 * - Checks usage limits
 * - Increments usage counter if valid
 */
export async function validateMagicLink(
  token: string
): Promise<ValidateMagicLinkResult> {
  const supabase = getSupabaseAdmin()
  const tokenHash = hashToken(token)

  // Find magic link by hash
  const { data: magicLink, error: fetchError } = await supabase
    .from('magic_links')
    .select('*')
    .eq('token_hash', tokenHash)
    .single()

  if (fetchError || !magicLink) {
    return { valid: false, error: 'Token invalide ou expiré' }
  }

  // Check if revoked
  if (magicLink.revoked_at) {
    return { valid: false, error: 'Ce lien a été révoqué' }
  }

  // Check expiration
  const now = new Date()
  const expiresAt = new Date(magicLink.expires_at)
  if (now > expiresAt) {
    return { valid: false, error: 'Ce lien a expiré' }
  }

  // Check usage limit
  if (magicLink.uses >= magicLink.max_uses) {
    return { valid: false, error: 'Ce lien a atteint sa limite d\'utilisation' }
  }

  // Increment usage counter and update last_used_at
  const { error: updateError } = await supabase
    .from('magic_links')
    .update({
      uses: magicLink.uses + 1,
      last_used_at: new Date().toISOString(),
    })
    .eq('id', magicLink.id)

  if (updateError) {
    console.error('Error updating magic link usage:', updateError)
    // Continue anyway - this is not critical
  }

  return {
    valid: true,
    magicLink,
    applicationId: magicLink.application_id,
  }
}
