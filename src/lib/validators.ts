/**
 * ============================================
 * VALIDATORS - Validation Téléphone & Email
 * ============================================
 *
 * Validation robuste côté client et serveur pour:
 * - Téléphones canadiens uniquement (10 chiffres)
 * - Emails conformes RFC simple
 *
 * Production-ready avec messages d'erreur UX friendly
 */

// ============================================
// TÉLÉPHONE CANADIEN
// ============================================

/**
 * Indicatifs régionaux valides au Canada (area codes)
 * Source: Plan de numérotation nord-américain (NANP)
 */
export const CANADIAN_AREA_CODES = [
  // Alberta
  '403', '587', '780', '825',
  // Colombie-Britannique
  '236', '250', '604', '672', '778',
  // Manitoba
  '204', '431',
  // Nouveau-Brunswick
  '506',
  // Terre-Neuve-et-Labrador
  '709',
  // Territoires du Nord-Ouest, Nunavut, Yukon
  '867',
  // Nouvelle-Écosse, Île-du-Prince-Édouard
  '782', '902',
  // Ontario
  '226', '249', '289', '343', '365', '416', '437', '519', '548', '613', '647', '705', '807', '905',
  // Québec
  '367', '418', '438', '450', '514', '579', '581', '819', '873',
  // Saskatchewan
  '306', '639'
]

/**
 * Regex pour détecter un numéro de téléphone canadien
 * Accepte: 5141234567, 514-123-4567, (514) 123-4567, +1 514 123 4567
 */
export const PHONE_REGEX = /^(?:\+?1[-.\s]?)?\(?([2-9]\d{2})\)?[-.\s]?([2-9]\d{2})[-.\s]?(\d{4})$/

/**
 * Nettoie un numéro de téléphone (enlève tout sauf les chiffres)
 */
export function cleanPhoneNumber(phone: string): string {
  return phone.replace(/\D/g, '')
}

/**
 * Valide un numéro de téléphone canadien
 * @param phone - Numéro à valider (n'importe quel format)
 * @returns { valid: boolean, error?: string, cleaned?: string }
 */
export function validateCanadianPhone(phone: string): {
  valid: boolean
  error?: string
  cleaned?: string
} {
  // Vide
  if (!phone || phone.trim().length === 0) {
    return {
      valid: false,
      error: 'Le numéro de téléphone est requis'
    }
  }

  // Nettoyer
  const cleaned = cleanPhoneNumber(phone)

  // Doit avoir 10 chiffres (sans +1) ou 11 chiffres (avec +1)
  if (cleaned.length === 11 && cleaned[0] !== '1') {
    return {
      valid: false,
      error: 'Format de numéro invalide'
    }
  }

  if (cleaned.length !== 10 && cleaned.length !== 11) {
    return {
      valid: false,
      error: 'Le numéro doit contenir 10 chiffres'
    }
  }

  // Extraire l'indicatif régional (area code)
  const areaCode = cleaned.length === 11 ? cleaned.substring(1, 4) : cleaned.substring(0, 3)

  // Vérifier que l'indicatif est canadien
  if (!CANADIAN_AREA_CODES.includes(areaCode)) {
    return {
      valid: false,
      error: 'Entrez un numéro de téléphone canadien valide'
    }
  }

  // Extraire les parties du numéro
  const phoneDigits = cleaned.length === 11 ? cleaned.substring(1) : cleaned
  const exchange = phoneDigits.substring(3, 6)
  const subscriber = phoneDigits.substring(6)

  // Valider que exchange et subscriber ne commencent pas par 0 ou 1 (règle NANP)
  if (exchange[0] === '0' || exchange[0] === '1') {
    return {
      valid: false,
      error: 'Format de numéro invalide'
    }
  }

  // Numéro valide
  return {
    valid: true,
    cleaned: phoneDigits // Retourner format 10 chiffres nettoyé
  }
}

/**
 * Formate un numéro de téléphone canadien pour affichage
 * @param phone - Numéro (10 chiffres)
 * @returns Format: (514) 123-4567
 */
export function formatCanadianPhone(phone: string): string {
  const cleaned = cleanPhoneNumber(phone)
  const phoneDigits = cleaned.length === 11 ? cleaned.substring(1) : cleaned

  if (phoneDigits.length !== 10) return phone

  return `(${phoneDigits.substring(0, 3)}) ${phoneDigits.substring(3, 6)}-${phoneDigits.substring(6)}`
}

// ============================================
// EMAIL
// ============================================

/**
 * Regex pour validation email (RFC simple, pas trop permissif)
 * Accepte: user@example.com, user+tag@example.co.uk
 * Refuse: user@, @example.com, user@example
 */
export const EMAIL_REGEX = /^[a-zA-Z0-9]([a-zA-Z0-9._-]{0,63}[a-zA-Z0-9])?@[a-zA-Z0-9]([a-zA-Z0-9.-]{0,253}[a-zA-Z0-9])?\.[a-zA-Z]{2,}$/

/**
 * Valide une adresse email
 * @param email - Email à valider
 * @returns { valid: boolean, error?: string }
 */
export function validateEmail(email: string): {
  valid: boolean
  error?: string
} {
  // Vide
  if (!email || email.trim().length === 0) {
    return {
      valid: false,
      error: 'L\'adresse courriel est requise'
    }
  }

  // Trim whitespace
  const trimmed = email.trim()

  // Longueur max (RFC 5321)
  if (trimmed.length > 254) {
    return {
      valid: false,
      error: 'L\'adresse courriel est trop longue'
    }
  }

  // Pas de @ ou multiple @
  if (!trimmed.includes('@')) {
    return {
      valid: false,
      error: 'L\'adresse courriel doit contenir un @'
    }
  }

  if (trimmed.split('@').length > 2) {
    return {
      valid: false,
      error: 'L\'adresse courriel ne peut contenir qu\'un seul @'
    }
  }

  // Valider avec regex
  if (!EMAIL_REGEX.test(trimmed)) {
    return {
      valid: false,
      error: 'Entrez une adresse courriel valide'
    }
  }

  // Split pour validation supplémentaire
  const [localPart, domain] = trimmed.split('@')

  // Local part trop long
  if (localPart.length > 64) {
    return {
      valid: false,
      error: 'L\'adresse courriel est invalide'
    }
  }

  // Domaine doit avoir au moins un point
  if (!domain.includes('.')) {
    return {
      valid: false,
      error: 'Entrez une adresse courriel valide'
    }
  }

  // Email valide
  return {
    valid: true
  }
}

// ============================================
// UTILITAIRES
// ============================================

/**
 * Type pour résultat de validation
 */
export interface ValidationResult {
  valid: boolean
  error?: string
  cleaned?: string
}

/**
 * Valide un objet contact complet
 */
export function validateContactData(data: {
  nom?: string
  email?: string
  telephone?: string
  message?: string
}): {
  valid: boolean
  errors: {
    nom?: string
    email?: string
    telephone?: string
    message?: string
  }
} {
  const errors: Record<string, string> = {}

  // Nom
  if (!data.nom || data.nom.trim().length < 2) {
    errors.nom = 'Le nom doit contenir au moins 2 caractères'
  }

  // Email
  const emailValidation = validateEmail(data.email || '')
  if (!emailValidation.valid) {
    errors.email = emailValidation.error!
  }

  // Téléphone
  const phoneValidation = validateCanadianPhone(data.telephone || '')
  if (!phoneValidation.valid) {
    errors.telephone = phoneValidation.error!
  }

  // Message
  if (!data.message || data.message.trim().length < 10) {
    errors.message = 'Le message doit contenir au moins 10 caractères'
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors
  }
}
