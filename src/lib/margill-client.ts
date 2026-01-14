/**
 * 🏦 Margill API Client
 * Client pour communiquer avec l'API Margill pour soumission de demandes de prêt
 */

import type {
  LoanApplicationFormData,
  MargillConfig,
  MargillPayload,
  MargillResponse,
} from './types/titan'

export class MargillClient {
  private config: MargillConfig

  constructor(config?: Partial<MargillConfig>) {
    this.config = {
      endpoint:
        config?.endpoint ||
        process.env.MARGILL_ENDPOINT ||
        'https://argentrapide.margill.com/process_json_form.aspx',
      origin:
        config?.origin ||
        (process.env.MARGILL_ORIGIN as 'argentrapide' | 'creditsecours') ||
        'argentrapide',
      timeout: config?.timeout || 30000, // 30 secondes
      retryAttempts: config?.retryAttempts || 3,
    }
  }

  /**
   * Soumettre une demande de prêt à Margill
   */
  async submitApplication(
    data: LoanApplicationFormData
  ): Promise<MargillResponse> {
    const payload = this.formatPayload(data)

    let lastError: Error | null = null

    // Retry logic avec exponential backoff
    for (let attempt = 1; attempt <= this.config.retryAttempts; attempt++) {
      try {
        const response = await this.sendRequest(payload, attempt)
        return response
      } catch (error) {
        lastError = error as Error
        console.error(
          `[MargillClient] Attempt ${attempt}/${this.config.retryAttempts} failed:`,
          error
        )

        // Si c'est la dernière tentative, on lance l'erreur
        if (attempt === this.config.retryAttempts) {
          break
        }

        // Exponential backoff: 1s, 2s, 4s, 8s...
        const backoffMs = Math.min(1000 * Math.pow(2, attempt - 1), 10000)
        console.log(
          `[MargillClient] Retrying in ${backoffMs}ms... (attempt ${attempt + 1})`
        )
        await this.sleep(backoffMs)
      }
    }

    // Si toutes les tentatives ont échoué
    throw new Error(
      `Margill API failed after ${this.config.retryAttempts} attempts: ${lastError?.message || 'Unknown error'}`
    )
  }

  /**
   * Envoyer la requête à Margill avec timeout
   */
  private async sendRequest(
    payload: MargillPayload,
    attempt: number
  ): Promise<MargillResponse> {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout)

    try {

      const response = await fetch(this.config.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      // Log response status

      // Si la réponse n'est pas OK (200-299)
      if (!response.ok) {
        const errorText = await response.text()
        console.error(`[MargillClient] Error response:`, errorText)
        throw new Error(
          `Margill API returned ${response.status}: ${errorText}`
        )
      }

      // Parser la réponse JSON
      const result = await response.json()

      // Transformer en MargillResponse
      return this.handleResponse(result)
    } catch (error) {
      clearTimeout(timeoutId)

      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new Error(
            `Margill API timeout after ${this.config.timeout}ms`
          )
        }
        throw error
      }

      throw new Error('Unknown error occurred while calling Margill API')
    }
  }

  /**
   * Formater les données en payload Margill (38 champs question/answer)
   */
  private formatPayload(data: LoanApplicationFormData): MargillPayload {
    const payload: MargillPayload = {
      origin: data.origin,

      // Question 1-5: Informations personnelles
      question1: 'Prénom',
      answer1: data.prenom,
      question2: 'Nom',
      answer2: data.nom,
      question3: 'Courriel',
      answer3: data.courriel,
      question4: 'Téléphone',
      answer4: data.telephone,
      question5: 'Date de naissance',
      answer5: data.date_naissance || '',

      // Question 6-11: Adresse
      question6: 'Adresse',
      answer6: data.adresse_rue || '',
      question7: 'Ville',
      answer7: data.adresse_ville || '',
      question8: 'Province',
      answer8: data.adresse_province || '',
      question9: 'Code postal',
      answer9: data.adresse_code_postal || '',
      question10: 'Durée de résidence (mois)',
      answer10: data.duree_residence_mois?.toString() || '',
      question11: 'Type de logement',
      answer11: data.type_logement || '',

      // Question 12-14: Montant et prêt
      question12: 'Montant demandé',
      answer12: (data.montant_demande / 100).toString(), // Convertir cents en dollars
      question13: 'Raison du prêt',
      answer13: data.raison_pret || '',
      question14: 'Durée du prêt (mois)',
      answer14: data.duree_pret_mois?.toString() || '',

      // Question 15-21: Emploi
      question15: 'Statut d\'emploi',
      answer15: data.statut_emploi || '',
      question16: 'Employeur',
      answer16: data.employeur || '',
      question17: 'Poste',
      answer17: data.poste || '',
      question18: 'Revenu annuel',
      answer18: data.revenu_annuel ? (data.revenu_annuel / 100).toString() : '',
      question19: 'Ancienneté emploi (mois)',
      answer19: data.anciennete_emploi_mois?.toString() || '',
      question20: 'Fréquence de paie',
      answer20: data.frequence_paie || '',
      question21: 'Prochaine paie',
      answer21: data.prochaine_paie || '',

      // Question 22-25: Informations bancaires
      question22: 'Institution financière',
      answer22: data.institution_financiere || '',
      question23: 'Numéro de transit',
      answer23: data.transit || '',
      question24: 'Numéro de compte',
      answer24: data.numero_compte || '',
      question25: 'Type de compte',
      answer25: data.type_compte || '',

      // Question 26-27: Autres revenus
      question26: 'Autres revenus',
      answer26: data.autres_revenus ? (data.autres_revenus / 100).toString() : '',
      question27: 'Source autres revenus',
      answer27: data.source_autres_revenus || '',

      // Question 28-31: Dettes
      question28: 'Paiement loyer/hypothèque',
      answer28: data.paiement_loyer_hypotheque
        ? (data.paiement_loyer_hypotheque / 100).toString()
        : '',
      question29: 'Autres prêts',
      answer29: data.autres_prets ? (data.autres_prets / 100).toString() : '',
      question30: 'Cartes de crédit',
      answer30: data.cartes_credit ? (data.cartes_credit / 100).toString() : '',
      question31: 'Autres dettes',
      answer31: data.autres_dettes ? (data.autres_dettes / 100).toString() : '',

      // Question 32-35: Co-emprunteur
      question32: 'Co-emprunteur prénom',
      answer32: data.coemprunteur_prenom || '',
      question33: 'Co-emprunteur nom',
      answer33: data.coemprunteur_nom || '',
      question34: 'Co-emprunteur téléphone',
      answer34: data.coemprunteur_telephone || '',
      question35: 'Co-emprunteur revenu',
      answer35: data.coemprunteur_revenu
        ? (data.coemprunteur_revenu / 100).toString()
        : '',

      // Question 36-38: Références
      question36: 'Référence 1 - Nom',
      answer36: data.reference_1_nom || '',
      question37: 'Référence 1 - Téléphone',
      answer37: data.reference_1_telephone || '',
      question38: 'Référence 1 - Relation',
      answer38: data.reference_1_relation || '',

      // Note: Questions pour Référence 2 peuvent être ajoutées si Margill supporte plus de 38 questions
      // Sinon, on peut les mettre dans les métadonnées
    }

    return payload
  }

  /**
   * Parser et valider la réponse de Margill
   */
  private handleResponse(result: unknown): MargillResponse {
    // Si Margill retourne un objet avec success/error
    if (this.isValidMargillResponse(result)) {
      return result
    }

    // Si Margill retourne juste un objet avec data
    if (typeof result === 'object' && result !== null) {
      // Vérifier si c'est un succès ou une erreur
      const response = result as Record<string, unknown>

      // Si on trouve une propriété 'error' ou 'success'
      if ('error' in response && response.error) {
        return {
          success: false,
          error: String(response.error),
          data: response,
        }
      }

      if ('success' in response) {
        return {
          success: Boolean(response.success),
          data: response,
        }
      }

      // Par défaut, considérer que c'est un succès si pas d'erreur explicite
      return {
        success: true,
        data: response,
      }
    }

    // Format de réponse inconnu
    throw new Error(
      `Unexpected response format from Margill: ${JSON.stringify(result)}`
    )
  }

  /**
   * Type guard pour vérifier si c'est une réponse Margill valide
   */
  private isValidMargillResponse(obj: unknown): obj is MargillResponse {
    if (typeof obj !== 'object' || obj === null) return false

    const response = obj as Record<string, unknown>
    return 'success' in response && typeof response.success === 'boolean'
  }

  /**
   * Helper pour attendre (pour retry avec backoff)
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }

  /**
   * Tester la connexion à Margill
   */
  async testConnection(): Promise<{ connected: boolean; message: string }> {
    try {
      // Créer une requête de test minimale
      const testPayload: MargillPayload = {
        origin: this.config.origin,
        question1: 'Test',
        answer1: 'Test',
        question2: 'Connection',
        answer2: 'Check',
        question3: 'Mode',
        answer3: 'Test',
      }

      const controller = new AbortController()
      const timeoutId = setTimeout(
        () => controller.abort(),
        this.config.timeout
      )

      const response = await fetch(this.config.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(testPayload),
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (response.ok) {
        return {
          connected: true,
          message: 'Successfully connected to Margill API',
        }
      } else {
        return {
          connected: false,
          message: `Margill API returned status ${response.status}`,
        }
      }
    } catch (error) {
      return {
        connected: false,
        message:
          error instanceof Error
            ? error.message
            : 'Unknown error connecting to Margill',
      }
    }
  }
}

// Export singleton instance
export const margillClient = new MargillClient()
