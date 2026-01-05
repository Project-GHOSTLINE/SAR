export type ApplicationStatus =
  | 'RECEIVED'
  | 'IBV_PENDING'
  | 'IBV_COMPLETED'
  | 'ANALYSIS_IN_PROGRESS'
  | 'OFFER_PENDING'
  | 'OFFER_SENT'
  | 'APPROVED_BY_CLIENT'
  | 'CONTRACT_PREPARATION'
  | 'CONTRACT_SENT'
  | 'AWAITING_SIGNATURE'
  | 'SIGNED'
  | 'FUNDS_TRANSFER'
  | 'ACTIVE'
  | 'REFUSED'
  | 'NO_RESPONSE'

export interface Application {
  id: string
  origin: string | null
  name: string | null
  email: string | null
  phone: string | null
  amount_cents: number | null
  status: ApplicationStatus
  status_updated_at: string
  first_payment_date: string | null
  created_at: string
}

export interface ApplicationEvent {
  id: string
  application_id: string
  type: string
  payload: Record<string, any>
  created_at: string
}

export interface MagicLink {
  id: string
  application_id: string
  token_hash: string
  expires_at: string
  max_uses: number
  uses: number
  revoked_at: string | null
  created_at: string
  last_used_at: string | null
}

export interface ClientNote {
  id: string
  application_id: string
  message: string
  visible_to_client: boolean
  created_at: string
}

export interface ProgressStep {
  key: ApplicationStatus
  label: string
  description: string
}

export interface ClientStatusResponse {
  success: boolean
  data?: {
    application: Application
    notes: ClientNote[]
    progress: {
      currentStep: number
      totalSteps: number
      steps: ProgressStep[]
    }
  }
  error?: string
}
