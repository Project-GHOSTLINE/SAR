import { ApplicationStatus, ProgressStep } from '@/types'

export const APPLICATION_STATUSES: Record<ApplicationStatus, string> = {
  RECEIVED: 'Demande reçue',
  IBV_PENDING: 'Vérification bancaire en cours',
  IBV_COMPLETED: 'Vérification bancaire complétée',
  ANALYSIS_IN_PROGRESS: 'Analyse en cours',
  OFFER_PENDING: 'Offre en préparation',
  OFFER_SENT: 'Offre envoyée',
  APPROVED_BY_CLIENT: 'Approuvée par le client',
  CONTRACT_PREPARATION: 'Préparation du contrat',
  CONTRACT_SENT: 'Contrat envoyé',
  AWAITING_SIGNATURE: 'En attente de signature',
  SIGNED: 'Contrat signé',
  FUNDS_TRANSFER: 'Transfert des fonds',
  ACTIVE: 'Prêt actif',
  REFUSED: 'Refusé',
  NO_RESPONSE: 'Aucune réponse',
}

export const PROGRESS_STEPS: ProgressStep[] = [
  {
    key: 'RECEIVED',
    label: 'Demande reçue',
    description: 'Votre demande a été reçue et est en cours de traitement',
  },
  {
    key: 'IBV_COMPLETED',
    label: 'IBV reçu',
    description: 'Vérification bancaire instantanée complétée avec succès',
  },
  {
    key: 'ANALYSIS_IN_PROGRESS',
    label: 'Analyse du dossier',
    description: 'Notre équipe analyse votre demande et votre profil financier',
  },
  {
    key: 'OFFER_SENT',
    label: 'Offre envoyée',
    description: 'Une offre de financement vous a été envoyée - En attente de votre approbation',
  },
  {
    key: 'APPROVED_BY_CLIENT',
    label: 'Offre approuvée',
    description: 'Vous avez accepté notre offre - Préparation de votre contrat en cours',
  },
  {
    key: 'AWAITING_SIGNATURE',
    label: 'Signature requise',
    description: 'Votre contrat est prêt - En attente de votre signature électronique',
  },
  {
    key: 'SIGNED',
    label: 'Contrat signé',
    description: 'Contrat signé avec succès - Traitement du transfert de fonds',
  },
  {
    key: 'ACTIVE',
    label: 'Prêt actif',
    description: 'Les fonds ont été transférés - Votre prêt est maintenant actif',
  },
]

export const MAGIC_LINK_TTL_HOURS = 48
export const MAGIC_LINK_MAX_USES = 20
