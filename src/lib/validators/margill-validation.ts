/**
 * 🔍 Validation Margill - 38 Champs
 * Validation complète pour le formulaire de demande de prêt
 */

import type {
  LoanApplicationFormData,
  ValidationResult,
  ValidationError,
  FormStepValidation,
} from '../types/titan'
import { validateEmail, validateCanadianPhone } from '../validators'

// ============================================
// CONSTANTES
// ============================================

export const MIN_LOAN_AMOUNT = 50000 // 500$ en cents
export const MAX_LOAN_AMOUNT = 5000000 // 50 000$ en cents
export const MIN_AGE = 18
export const MAX_AGE = 100
export const MIN_ANNUAL_INCOME = 1000000 // 10 000$ en cents

export const VALID_PROVINCES = [
  'AB', 'BC', 'MB', 'NB', 'NL', 'NS', 'NT', 'NU', 'ON', 'PE', 'QC', 'SK', 'YT',
]

export const VALID_EMPLOYMENT_STATUS = [
  'salarie',
  'autonome',
  'retraite',
  'sans_emploi',
]

export const VALID_PAY_FREQUENCY = ['hebdomadaire', 'bi_hebdomadaire', 'mensuel']

export const VALID_HOUSING_TYPE = ['proprietaire', 'locataire', 'autre']

export const VALID_ACCOUNT_TYPE = ['cheque', 'epargne']

// ============================================
// VALIDATION PAR CHAMP
// ============================================

export function validatePrenom(prenom: string): ValidationResult {
  if (!prenom || prenom.trim().length === 0) {
    return { valid: false, error: 'Le prénom est requis' }
  }
  if (prenom.trim().length < 2) {
    return { valid: false, error: 'Le prénom doit contenir au moins 2 caractères' }
  }
  if (prenom.length > 50) {
    return { valid: false, error: 'Le prénom est trop long (max 50 caractères)' }
  }
  if (!/^[a-zA-ZÀ-ÿ\s'-]+$/.test(prenom)) {
    return {
      valid: false,
      error: 'Le prénom ne peut contenir que des lettres, espaces, traits d\'union et apostrophes',
    }
  }
  return { valid: true }
}

export function validateNom(nom: string): ValidationResult {
  if (!nom || nom.trim().length === 0) {
    return { valid: false, error: 'Le nom est requis' }
  }
  if (nom.trim().length < 2) {
    return { valid: false, error: 'Le nom doit contenir au moins 2 caractères' }
  }
  if (nom.length > 50) {
    return { valid: false, error: 'Le nom est trop long (max 50 caractères)' }
  }
  if (!/^[a-zA-ZÀ-ÿ\s'-]+$/.test(nom)) {
    return {
      valid: false,
      error: 'Le nom ne peut contenir que des lettres, espaces, traits d\'union et apostrophes',
    }
  }
  return { valid: true }
}

export function validateCourriel(courriel: string): ValidationResult {
  const result = validateEmail(courriel)
  return { valid: result.valid, error: result.error }
}

export function validateTelephone(telephone: string): ValidationResult {
  const result = validateCanadianPhone(telephone)
  return {
    valid: result.valid,
    error: result.error,
    cleaned: result.cleaned,
  }
}

export function validateDateNaissance(dateNaissance: string): ValidationResult {
  if (!dateNaissance || dateNaissance.trim().length === 0) {
    return { valid: false, error: 'La date de naissance est requise' }
  }

  const date = new Date(dateNaissance)
  const today = new Date()

  if (isNaN(date.getTime())) {
    return { valid: false, error: 'Date de naissance invalide' }
  }

  // Calculer l'âge
  let age = today.getFullYear() - date.getFullYear()
  const monthDiff = today.getMonth() - date.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < date.getDate())) {
    age--
  }

  if (age < MIN_AGE) {
    return {
      valid: false,
      error: `Vous devez avoir au moins ${MIN_AGE} ans`,
    }
  }

  if (age > MAX_AGE) {
    return { valid: false, error: 'Date de naissance invalide' }
  }

  if (date > today) {
    return { valid: false, error: 'La date de naissance ne peut pas être dans le futur' }
  }

  return { valid: true }
}

export function validateAdresseRue(adresse: string | undefined): ValidationResult {
  if (!adresse || adresse.trim().length === 0) {
    return { valid: false, error: 'L\'adresse est requise' }
  }
  if (adresse.trim().length < 5) {
    return { valid: false, error: 'L\'adresse doit contenir au moins 5 caractères' }
  }
  if (adresse.length > 100) {
    return { valid: false, error: 'L\'adresse est trop longue (max 100 caractères)' }
  }
  return { valid: true }
}

export function validateAdresseVille(ville: string | undefined): ValidationResult {
  if (!ville || ville.trim().length === 0) {
    return { valid: false, error: 'La ville est requise' }
  }
  if (ville.trim().length < 2) {
    return { valid: false, error: 'Le nom de ville doit contenir au moins 2 caractères' }
  }
  if (ville.length > 50) {
    return { valid: false, error: 'Le nom de ville est trop long (max 50 caractères)' }
  }
  return { valid: true }
}

export function validateAdresseProvince(province: string | undefined): ValidationResult {
  if (!province || province.trim().length === 0) {
    return { valid: false, error: 'La province est requise' }
  }
  if (!VALID_PROVINCES.includes(province.toUpperCase())) {
    return { valid: false, error: 'Province invalide' }
  }
  return { valid: true }
}

export function validateCodePostal(codePostal: string | undefined): ValidationResult {
  if (!codePostal || codePostal.trim().length === 0) {
    return { valid: false, error: 'Le code postal est requis' }
  }

  // Format canadien: A1A 1A1 ou A1A1A1
  const cleaned = codePostal.replace(/\s/g, '').toUpperCase()
  if (!/^[A-Z]\d[A-Z]\d[A-Z]\d$/.test(cleaned)) {
    return { valid: false, error: 'Code postal invalide (format: A1A 1A1)' }
  }

  return { valid: true, cleaned }
}

export function validateDureeResidence(mois: number | undefined): ValidationResult {
  if (mois === undefined || mois === null) {
    return { valid: false, error: 'La durée de résidence est requise' }
  }
  if (mois < 0) {
    return { valid: false, error: 'La durée de résidence ne peut pas être négative' }
  }
  if (mois > 1200) {
    // 100 ans max
    return { valid: false, error: 'Durée de résidence invalide' }
  }
  return { valid: true }
}

export function validateTypeLogement(type: string | undefined): ValidationResult {
  if (!type || type.trim().length === 0) {
    return { valid: false, error: 'Le type de logement est requis' }
  }
  if (!VALID_HOUSING_TYPE.includes(type)) {
    return { valid: false, error: 'Type de logement invalide' }
  }
  return { valid: true }
}

export function validateMontantDemande(montant: number): ValidationResult {
  if (!montant || montant <= 0) {
    return { valid: false, error: 'Le montant demandé est requis' }
  }
  if (montant < MIN_LOAN_AMOUNT) {
    return {
      valid: false,
      error: `Le montant minimum est de ${MIN_LOAN_AMOUNT / 100}$`,
    }
  }
  if (montant > MAX_LOAN_AMOUNT) {
    return {
      valid: false,
      error: `Le montant maximum est de ${MAX_LOAN_AMOUNT / 100}$`,
    }
  }
  return { valid: true }
}

export function validateRaisonPret(raison: string | undefined): ValidationResult {
  // Optionnel mais si fourni, doit avoir min 5 caractères
  if (raison && raison.trim().length > 0 && raison.trim().length < 5) {
    return { valid: false, error: 'La raison doit contenir au moins 5 caractères' }
  }
  if (raison && raison.length > 200) {
    return { valid: false, error: 'La raison est trop longue (max 200 caractères)' }
  }
  return { valid: true }
}

export function validateDureePret(mois: number | undefined): ValidationResult {
  if (!mois || mois <= 0) {
    return { valid: false, error: 'La durée du prêt est requise' }
  }
  if (mois < 1) {
    return { valid: false, error: 'La durée minimale est de 1 mois' }
  }
  if (mois > 120) {
    // 10 ans max
    return { valid: false, error: 'La durée maximale est de 120 mois (10 ans)' }
  }
  return { valid: true }
}

export function validateStatutEmploi(statut: string | undefined): ValidationResult {
  if (!statut || statut.trim().length === 0) {
    return { valid: false, error: 'Le statut d\'emploi est requis' }
  }
  if (!VALID_EMPLOYMENT_STATUS.includes(statut)) {
    return { valid: false, error: 'Statut d\'emploi invalide' }
  }
  return { valid: true }
}

export function validateEmployeur(employeur: string | undefined, statutEmploi?: string): ValidationResult {
  // Requis si salarié ou autonome
  if (
    (statutEmploi === 'salarie' || statutEmploi === 'autonome') &&
    (!employeur || employeur.trim().length === 0)
  ) {
    return { valid: false, error: 'Le nom de l\'employeur est requis' }
  }
  if (employeur && employeur.trim().length > 0 && employeur.trim().length < 2) {
    return { valid: false, error: 'Le nom de l\'employeur doit contenir au moins 2 caractères' }
  }
  if (employeur && employeur.length > 100) {
    return { valid: false, error: 'Le nom de l\'employeur est trop long (max 100 caractères)' }
  }
  return { valid: true }
}

export function validatePoste(poste: string | undefined): ValidationResult {
  // Optionnel
  if (poste && poste.trim().length > 0 && poste.trim().length < 2) {
    return { valid: false, error: 'Le poste doit contenir au moins 2 caractères' }
  }
  if (poste && poste.length > 100) {
    return { valid: false, error: 'Le poste est trop long (max 100 caractères)' }
  }
  return { valid: true }
}

export function validateRevenuAnnuel(revenu: number | undefined): ValidationResult {
  if (revenu === undefined || revenu === null || revenu <= 0) {
    return { valid: false, error: 'Le revenu annuel est requis' }
  }
  if (revenu < MIN_ANNUAL_INCOME) {
    return {
      valid: false,
      error: `Le revenu minimum requis est de ${MIN_ANNUAL_INCOME / 100}$`,
    }
  }
  if (revenu > 1000000000) {
    // 10M$ max
    return { valid: false, error: 'Revenu annuel invalide' }
  }
  return { valid: true }
}

export function validateAncienneteEmploi(mois: number | undefined): ValidationResult {
  if (mois === undefined || mois === null) {
    return { valid: false, error: 'L\'ancienneté d\'emploi est requise' }
  }
  if (mois < 0) {
    return { valid: false, error: 'L\'ancienneté ne peut pas être négative' }
  }
  if (mois > 600) {
    // 50 ans max
    return { valid: false, error: 'Ancienneté invalide' }
  }
  return { valid: true }
}

export function validateFrequencePaie(frequence: string | undefined): ValidationResult {
  if (!frequence || frequence.trim().length === 0) {
    return { valid: false, error: 'La fréquence de paie est requise' }
  }
  if (!VALID_PAY_FREQUENCY.includes(frequence)) {
    return { valid: false, error: 'Fréquence de paie invalide' }
  }
  return { valid: true }
}

export function validateProchainePaie(date: string | undefined): ValidationResult {
  if (!date || date.trim().length === 0) {
    return { valid: false, error: 'La date de la prochaine paie est requise' }
  }

  const paieDate = new Date(date)
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  if (isNaN(paieDate.getTime())) {
    return { valid: false, error: 'Date invalide' }
  }

  if (paieDate < today) {
    return { valid: false, error: 'La date de paie ne peut pas être dans le passé' }
  }

  const sixMonthsFromNow = new Date()
  sixMonthsFromNow.setMonth(sixMonthsFromNow.getMonth() + 6)

  if (paieDate > sixMonthsFromNow) {
    return { valid: false, error: 'La date de paie doit être dans les 6 prochains mois' }
  }

  return { valid: true }
}

export function validateInstitutionFinanciere(institution: string | undefined): ValidationResult {
  if (!institution || institution.trim().length === 0) {
    return { valid: false, error: 'L\'institution financière est requise' }
  }
  if (institution.trim().length < 2) {
    return {
      valid: false,
      error: 'Le nom de l\'institution doit contenir au moins 2 caractères',
    }
  }
  if (institution.length > 100) {
    return { valid: false, error: 'Le nom de l\'institution est trop long (max 100 caractères)' }
  }
  return { valid: true }
}

export function validateTransit(transit: string | undefined): ValidationResult {
  if (!transit || transit.trim().length === 0) {
    return { valid: false, error: 'Le numéro de transit est requis' }
  }

  const cleaned = transit.replace(/\D/g, '')
  if (cleaned.length !== 5) {
    return { valid: false, error: 'Le numéro de transit doit contenir 5 chiffres' }
  }

  return { valid: true, cleaned }
}

export function validateNumeroCompte(compte: string | undefined): ValidationResult {
  if (!compte || compte.trim().length === 0) {
    return { valid: false, error: 'Le numéro de compte est requis' }
  }

  const cleaned = compte.replace(/\D/g, '')
  if (cleaned.length < 7 || cleaned.length > 12) {
    return { valid: false, error: 'Le numéro de compte doit contenir entre 7 et 12 chiffres' }
  }

  return { valid: true, cleaned }
}

export function validateTypeCompte(type: string | undefined): ValidationResult {
  if (!type || type.trim().length === 0) {
    return { valid: false, error: 'Le type de compte est requis' }
  }
  if (!VALID_ACCOUNT_TYPE.includes(type)) {
    return { valid: false, error: 'Type de compte invalide' }
  }
  return { valid: true }
}

export function validateAutresRevenus(montant: number | undefined): ValidationResult {
  // Optionnel, mais si fourni doit être positif
  if (montant !== undefined && montant !== null && montant < 0) {
    return { valid: false, error: 'Le montant ne peut pas être négatif' }
  }
  if (montant !== undefined && montant !== null && montant > 1000000000) {
    return { valid: false, error: 'Montant invalide' }
  }
  return { valid: true }
}

export function validateDettes(montant: number | undefined): ValidationResult {
  // Optionnel, mais si fourni doit être positif
  if (montant !== undefined && montant !== null && montant < 0) {
    return { valid: false, error: 'Le montant ne peut pas être négatif' }
  }
  if (montant !== undefined && montant !== null && montant > 1000000000) {
    return { valid: false, error: 'Montant invalide' }
  }
  return { valid: true }
}

// ============================================
// VALIDATION PAR ÉTAPE
// ============================================

export function validateStep1(data: Partial<LoanApplicationFormData>): FormStepValidation {
  const errors: ValidationError[] = []

  // Informations personnelles
  const prenomResult = validatePrenom(data.prenom || '')
  if (!prenomResult.valid) {
    errors.push({ field: 'prenom', message: prenomResult.error! })
  }

  const nomResult = validateNom(data.nom || '')
  if (!nomResult.valid) {
    errors.push({ field: 'nom', message: nomResult.error! })
  }

  const courrielResult = validateCourriel(data.courriel || '')
  if (!courrielResult.valid) {
    errors.push({ field: 'courriel', message: courrielResult.error! })
  }

  const telephoneResult = validateTelephone(data.telephone || '')
  if (!telephoneResult.valid) {
    errors.push({ field: 'telephone', message: telephoneResult.error! })
  }

  const dateNaissanceResult = validateDateNaissance(data.date_naissance || '')
  if (!dateNaissanceResult.valid) {
    errors.push({ field: 'date_naissance', message: dateNaissanceResult.error! })
  }

  // Adresse
  const adresseResult = validateAdresseRue(data.adresse_rue)
  if (!adresseResult.valid) {
    errors.push({ field: 'adresse_rue', message: adresseResult.error! })
  }

  const villeResult = validateAdresseVille(data.adresse_ville)
  if (!villeResult.valid) {
    errors.push({ field: 'adresse_ville', message: villeResult.error! })
  }

  const provinceResult = validateAdresseProvince(data.adresse_province)
  if (!provinceResult.valid) {
    errors.push({ field: 'adresse_province', message: provinceResult.error! })
  }

  const codePostalResult = validateCodePostal(data.adresse_code_postal)
  if (!codePostalResult.valid) {
    errors.push({ field: 'adresse_code_postal', message: codePostalResult.error! })
  }

  const dureeResidenceResult = validateDureeResidence(data.duree_residence_mois)
  if (!dureeResidenceResult.valid) {
    errors.push({ field: 'duree_residence_mois', message: dureeResidenceResult.error! })
  }

  const typeLogementResult = validateTypeLogement(data.type_logement)
  if (!typeLogementResult.valid) {
    errors.push({ field: 'type_logement', message: typeLogementResult.error! })
  }

  return {
    step: 1,
    valid: errors.length === 0,
    errors,
  }
}

export function validateStep2(data: Partial<LoanApplicationFormData>): FormStepValidation {
  const errors: ValidationError[] = []

  // Emploi
  const statutEmploiResult = validateStatutEmploi(data.statut_emploi)
  if (!statutEmploiResult.valid) {
    errors.push({ field: 'statut_emploi', message: statutEmploiResult.error! })
  }

  const employeurResult = validateEmployeur(data.employeur, data.statut_emploi)
  if (!employeurResult.valid) {
    errors.push({ field: 'employeur', message: employeurResult.error! })
  }

  const revenuResult = validateRevenuAnnuel(data.revenu_annuel)
  if (!revenuResult.valid) {
    errors.push({ field: 'revenu_annuel', message: revenuResult.error! })
  }

  const ancienneteResult = validateAncienneteEmploi(data.anciennete_emploi_mois)
  if (!ancienneteResult.valid) {
    errors.push({ field: 'anciennete_emploi_mois', message: ancienneteResult.error! })
  }

  const frequenceResult = validateFrequencePaie(data.frequence_paie)
  if (!frequenceResult.valid) {
    errors.push({ field: 'frequence_paie', message: frequenceResult.error! })
  }

  const prochainePaieResult = validateProchainePaie(data.prochaine_paie)
  if (!prochainePaieResult.valid) {
    errors.push({ field: 'prochaine_paie', message: prochainePaieResult.error! })
  }

  return {
    step: 2,
    valid: errors.length === 0,
    errors,
  }
}

export function validateStep3(data: Partial<LoanApplicationFormData>): FormStepValidation {
  const errors: ValidationError[] = []

  // Prêt
  const montantResult = validateMontantDemande(data.montant_demande || 0)
  if (!montantResult.valid) {
    errors.push({ field: 'montant_demande', message: montantResult.error! })
  }

  const dureeResult = validateDureePret(data.duree_pret_mois)
  if (!dureeResult.valid) {
    errors.push({ field: 'duree_pret_mois', message: dureeResult.error! })
  }

  return {
    step: 3,
    valid: errors.length === 0,
    errors,
  }
}

export function validateStep4(data: Partial<LoanApplicationFormData>): FormStepValidation {
  const errors: ValidationError[] = []

  // Banque
  const institutionResult = validateInstitutionFinanciere(data.institution_financiere)
  if (!institutionResult.valid) {
    errors.push({ field: 'institution_financiere', message: institutionResult.error! })
  }

  const transitResult = validateTransit(data.transit)
  if (!transitResult.valid) {
    errors.push({ field: 'transit', message: transitResult.error! })
  }

  const compteResult = validateNumeroCompte(data.numero_compte)
  if (!compteResult.valid) {
    errors.push({ field: 'numero_compte', message: compteResult.error! })
  }

  const typeCompteResult = validateTypeCompte(data.type_compte)
  if (!typeCompteResult.valid) {
    errors.push({ field: 'type_compte', message: typeCompteResult.error! })
  }

  return {
    step: 4,
    valid: errors.length === 0,
    errors,
  }
}

export function validateStep5(data: Partial<LoanApplicationFormData>): FormStepValidation {
  // Step 5 = Révision, valider toutes les étapes précédentes
  const step1 = validateStep1(data)
  const step2 = validateStep2(data)
  const step3 = validateStep3(data)
  const step4 = validateStep4(data)

  return {
    step: 5,
    valid: step1.valid && step2.valid && step3.valid && step4.valid,
    errors: [...step1.errors, ...step2.errors, ...step3.errors, ...step4.errors],
  }
}

// ============================================
// VALIDATION COMPLÈTE
// ============================================

export function validateLoanApplication(
  data: Partial<LoanApplicationFormData>
): ValidationResult {
  const step5 = validateStep5(data)

  return {
    valid: step5.valid,
    errors: step5.errors,
  }
}
