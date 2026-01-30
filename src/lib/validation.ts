/**
 * Validation Utilities
 */

/**
 * RFC 5322 compliant email regex (simplified but robust)
 */
const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/

/**
 * Validate email format
 */
export function validateEmail(email: string): { valid: boolean; error?: string } {
  if (!email) {
    return { valid: false, error: 'Email requis' }
  }

  if (email.length > 254) {
    return { valid: false, error: 'Email trop long (max 254 caractères)' }
  }

  if (!EMAIL_REGEX.test(email)) {
    return { valid: false, error: 'Format d\'email invalide' }
  }

  // Vérifier la partie locale (avant @)
  const [localPart, domain] = email.split('@')

  if (localPart.length > 64) {
    return { valid: false, error: 'Partie locale de l\'email trop longue (max 64 caractères)' }
  }

  if (domain.length > 253) {
    return { valid: false, error: 'Domaine de l\'email trop long (max 253 caractères)' }
  }

  // Vérifier les caractères consécutifs
  if (email.includes('..')) {
    return { valid: false, error: 'Email ne peut pas contenir des points consécutifs' }
  }

  // Vérifier que le domaine a au moins un point
  if (!domain.includes('.')) {
    return { valid: false, error: 'Domaine invalide (doit contenir un point)' }
  }

  return { valid: true }
}

/**
 * Validate string length
 */
export function validateLength(
  value: string,
  fieldName: string,
  min: number,
  max: number
): { valid: boolean; error?: string } {
  if (!value) {
    return { valid: false, error: `${fieldName} requis` }
  }

  const length = value.trim().length

  if (length < min) {
    return { valid: false, error: `${fieldName} trop court (min ${min} caractères)` }
  }

  if (length > max) {
    return { valid: false, error: `${fieldName} trop long (max ${max} caractères)` }
  }

  return { valid: true }
}

/**
 * Sanitize string (remove dangerous characters)
 */
export function sanitizeString(value: string): string {
  return value
    .trim()
    .replace(/[<>]/g, '') // Remove < and >
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+=/gi, '') // Remove event handlers
}
