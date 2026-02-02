/**
 * Partners Helpers - Utilities pour le système partenaires
 */

import { createHash } from 'crypto'
import { getSupabaseServer } from './supabase-server'

/**
 * Hash une valeur avec SHA256 (pour IP, UA, email, phone)
 */
export function hashValue(value: string): string {
  return createHash('sha256').update(value.toLowerCase().trim()).digest('hex')
}

/**
 * Génère un token unique d'invitation (32 chars alphanumeric)
 */
export function generateInviteToken(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789'
  let token = ''
  for (let i = 0; i < 32; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return token
}

/**
 * Génère un ref_code unique (format: ABC123, 6 chars uppercase alphanumeric)
 */
export function generateRefCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return code
}

/**
 * Vérifie si un ref_code existe déjà (pour éviter collisions)
 */
export async function isRefCodeUnique(refCode: string): Promise<boolean> {
  const supabase = getSupabaseServer()
  const { data } = await supabase
    .from('partner_ref_links')
    .select('id')
    .eq('ref_code', refCode)
    .single()

  return !data
}

/**
 * Génère un ref_code unique garanti (retry jusqu'à trouver un code libre)
 */
export async function generateUniqueRefCode(): Promise<string> {
  let refCode = generateRefCode()
  let attempts = 0
  const maxAttempts = 10

  while (!(await isRefCodeUnique(refCode)) && attempts < maxAttempts) {
    refCode = generateRefCode()
    attempts++
  }

  if (attempts >= maxAttempts) {
    throw new Error('Impossible de générer un ref_code unique')
  }

  return refCode
}

/**
 * Récupère le partner_id depuis auth.uid()
 */
export async function getPartnerIdFromAuth(userId: string): Promise<string | null> {
  const supabase = getSupabaseServer()
  const { data } = await supabase
    .from('partner_profiles')
    .select('id')
    .eq('user_id', userId)
    .single()

  return data?.id || null
}

/**
 * Calcule le duplicate_check_key pour un événement
 * Format: hash(partner_id + event_type + date_YYYYMMDD + ip_hash)
 */
export function calculateDuplicateCheckKey(
  partnerId: string,
  eventType: string,
  ipHash: string
): string {
  const today = new Date().toISOString().split('T')[0].replace(/-/g, '')
  const raw = `${partnerId}|${eventType}|${today}|${ipHash}`
  return hashValue(raw)
}

/**
 * Vérifie si un événement est un doublon (même partner + type + jour + IP)
 */
export async function isDuplicateEvent(duplicateCheckKey: string): Promise<boolean> {
  const supabase = getSupabaseServer()
  const { data } = await supabase
    .from('partner_events')
    .select('id')
    .eq('duplicate_check_key', duplicateCheckKey)
    .single()

  return !!data
}

/**
 * Formate un email pour partner (pattern: partner+<client_id>@solutionargentrapide.ca)
 */
export function formatPartnerEmail(clientId: string): string {
  return `partner+${clientId}@solutionargentrapide.ca`
}

/**
 * Règles de crédits MVP (event_type -> credit_amount)
 */
export const CREDIT_RULES: Record<string, number> = {
  application_submitted: 10,
  ibv_completed: 15,
  funded: 50
}

/**
 * Plafond de crédits par partenaire (30 jours)
 */
export const CREDIT_CAP_30_DAYS = 150

/**
 * Vérifie si un partenaire a atteint le plafond de crédits (30 derniers jours)
 */
export async function hasReachedCreditCap(partnerId: string): Promise<boolean> {
  const supabase = getSupabaseServer()
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  const { data } = await supabase
    .from('partner_credit_ledger')
    .select('credit_amount')
    .eq('partner_id', partnerId)
    .eq('is_void', false)
    .gte('created_at', thirtyDaysAgo.toISOString())

  const total = (data || []).reduce((sum, entry) => sum + Number(entry.credit_amount), 0)

  return total >= CREDIT_CAP_30_DAYS
}
