/**
 * Support System Utilities
 * Fonctions helper pour le système de support technique SAR
 */

// Catégories de problèmes disponibles
export const SUPPORT_CATEGORIES = [
  { id: 'acces', label: '🔐 Problème d\'accès / Connexion', color: 'red' },
  { id: 'bug', label: '🐛 Bug / Erreur dans l\'application', color: 'orange' },
  { id: 'lenteur', label: '🐌 Lenteur / Performance', color: 'yellow' },
  { id: 'affichage', label: '👁️ Problème d\'affichage', color: 'purple' },
  { id: 'donnees', label: '📊 Données manquantes ou incorrectes', color: 'blue' },
  { id: 'formation', label: '📚 Question / Formation', color: 'green' },
  { id: 'amelioration', label: '💡 Suggestion d\'amélioration', color: 'teal' },
  { id: 'autre', label: '❓ Autre problème', color: 'gray' }
] as const

// Niveaux de priorité
export const PRIORITY_LEVELS = [
  { id: 'low', label: '⚪ Basse', color: 'bg-gray-400 text-white' },
  { id: 'medium', label: '🟡 Moyenne', color: 'bg-yellow-500 text-white' },
  { id: 'high', label: '🟠 Haute', color: 'bg-orange-500 text-white' },
  { id: 'urgent', label: '🔴 Urgente', color: 'bg-red-600 text-white' }
] as const

// Statuts des tickets
export const TICKET_STATUSES = [
  { id: 'nouveau', label: 'Nouveau', color: 'bg-red-100 text-red-800', icon: '🔴' },
  { id: 'en_cours', label: 'En cours', color: 'bg-yellow-100 text-yellow-800', icon: '🟡' },
  { id: 'resolu', label: 'Résolu', color: 'bg-green-100 text-green-800', icon: '🟢' },
  { id: 'ferme', label: 'Fermé', color: 'bg-gray-100 text-gray-800', icon: '⚫' }
] as const

// Employés autorisés à créer des tickets
export const AUTHORIZED_EMPLOYEES = [
  { name: 'Frederic Rosa', email: 'frederic@solutionargentrapide.ca', role: 'Admin et Propriétaire' },
  { name: 'Anthony Rosa', email: 'anthony@solutionargentrapide.ca', role: 'Support technique DevOps' },
  { name: 'Michel Rosa', email: 'michel@solutionargentrapide.ca', role: 'Analyse' },
  { name: 'Karine Rosa', email: 'karine@solutionargentrapide.ca', role: 'Comptabilité' },
  { name: 'Stephanie Galland', email: 'stephanie@solutionargentrapide.ca', role: 'Administration' },
  { name: 'Sandra Liberta', email: 'sandra@solutionargentrapide.ca', role: 'Administration' },
  { name: 'Melissa Paulin', email: 'melissa@solutionargentrapide.ca', role: 'Comptabilité' }
] as const

// Support assignees
export const SUPPORT_ASSIGNEES = [
  { name: 'Anthony Rosa', email: 'anthony@solutionargentrapide.ca' },
  { name: 'Frederic Rosa', email: 'frederic@solutionargentrapide.ca' }
] as const

// Obtenir la couleur d'une catégorie
export function getCategoryColor(categoryId: string): string {
  const category = SUPPORT_CATEGORIES.find(c => c.id === categoryId)
  return category?.color || 'gray'
}

// Obtenir le label d'une catégorie
export function getCategoryLabel(categoryId: string): string {
  const category = SUPPORT_CATEGORIES.find(c => c.id === categoryId)
  return category?.label || categoryId
}

// Obtenir la couleur d'une priorité
export function getPriorityColor(priorityId: string): string {
  const priority = PRIORITY_LEVELS.find(p => p.id === priorityId)
  return priority?.color || 'bg-gray-400 text-white'
}

// Obtenir le label d'une priorité
export function getPriorityLabel(priorityId: string): string {
  const priority = PRIORITY_LEVELS.find(p => p.id === priorityId)
  return priority?.label || priorityId
}

// Obtenir la couleur d'un statut
export function getStatusColor(statusId: string): string {
  const status = TICKET_STATUSES.find(s => s.id === statusId)
  return status?.color || 'bg-gray-100 text-gray-800'
}

// Obtenir le label d'un statut
export function getStatusLabel(statusId: string): string {
  const status = TICKET_STATUSES.find(s => s.id === statusId)
  return status?.label || statusId
}

// Obtenir l'icône d'un statut
export function getStatusIcon(statusId: string): string {
  const status = TICKET_STATUSES.find(s => s.id === statusId)
  return status?.icon || '❓'
}

// Formater une date relative (ex: "Il y a 5 min")
export function formatRelativeTime(dateString: string): string {
  const now = new Date()
  const date = new Date(dateString)
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'À l\'instant'
  if (diffMins < 60) return `Il y a ${diffMins} min`
  if (diffHours < 24) return `Il y a ${diffHours}h`
  if (diffDays === 1) return 'Hier'
  if (diffDays < 7) return `Il y a ${diffDays} jours`

  // Format complet
  return date.toLocaleDateString('fr-CA', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit'
  })
}

// Formater une date complète
export function formatFullDate(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString('fr-CA', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

// Tronquer un texte avec ellipse
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return text.substring(0, maxLength) + '...'
}

// Déterminer si un employé est autorisé
export function isAuthorizedEmployee(email: string): boolean {
  return AUTHORIZED_EMPLOYEES.some(e => e.email.toLowerCase() === email.toLowerCase())
}

// Obtenir les infos d'un employé par email
export function getEmployeeByEmail(email: string) {
  return AUTHORIZED_EMPLOYEES.find(e => e.email.toLowerCase() === email.toLowerCase())
}

// Obtenir les initiales d'un nom
export function getInitials(name: string): string {
  const parts = name.split(' ')
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase()
  }
  return name.substring(0, 2).toUpperCase()
}

// Valider un ticket number (format: SUP-000001)
export function isValidTicketNumber(ticketNumber: string): boolean {
  return /^SUP-\d{6}$/.test(ticketNumber)
}
