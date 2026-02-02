/**
 * Types pour le système Partners MVP
 */

import { z } from 'zod'

// ============================================
// ZOD SCHEMAS (Validation)
// ============================================

/**
 * Schema validation pour /api/partners/activate
 */
export const ActivateSchema = z.object({
  token: z.string().min(32).max(32)
})

/**
 * Schema validation pour /api/partners/event
 */
export const EventSchema = z.object({
  event_type: z.enum([
    'click_referral',
    'share_whatsapp',
    'share_sms',
    'share_messenger',
    'share_copy'
  ]),
  ref_code: z.string().optional(),
  metadata: z.record(z.any()).optional()
})

/**
 * Schema validation pour /api/partners/credit-engine (admin trigger)
 */
export const CreditEngineSchema = z.object({
  admin_secret: z.string().min(32),
  dry_run: z.boolean().optional().default(false)
})

// ============================================
// TYPES
// ============================================

export type PartnerEventType =
  | 'click_referral'
  | 'share_whatsapp'
  | 'share_sms'
  | 'share_messenger'
  | 'share_copy'
  | 'application_submitted'
  | 'ibv_completed'
  | 'funded'

export type PartnerAttributionStatus =
  | 'submitted'
  | 'ibv_completed'
  | 'funded'
  | 'rejected'
  | 'cancelled'

export type PartnerBalanceStatus = 'pending' | 'applied' | 'void'

/**
 * Dashboard payload structure pour /api/partners/me
 */
export interface PartnerDashboard {
  partner: {
    started_at: string
    status: string
    ref_code: string
    preferred_channels: string[]
  }
  project_state: {
    phase: string
    updated_at: string
    participants_active: number
    changelog: Array<{
      date: string
      change: string
    }>
  }
  impact_cards: {
    shares: number
    clicks: number
    applications: number
    ibv: number
    funded: number
  }
  credits: {
    total: number
    applied: number
    available: number
    next_apply_date: string | null
  }
  timeline: Array<{
    type: string
    at: string
    label: string
    meta?: Record<string, any>
  }>
}

/**
 * Response type pour /api/partners/activate
 */
export interface ActivateResponse {
  success: boolean
  partner_id: string
  ref_code: string
  message: string
}

/**
 * Response type pour /api/partners/event
 */
export interface EventResponse {
  success: boolean
  event_id: string
  message: string
}

/**
 * Response type pour /api/partners/credit-engine
 */
export interface CreditEngineResponse {
  success: boolean
  processed_count: number
  credits_awarded: number
  errors: Array<{
    partner_id: string
    error: string
  }>
  dry_run: boolean
}
