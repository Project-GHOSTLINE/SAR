/**
 * DevOps Tasks System - Types & Constants
 * Date: 2026-02-02
 */

// ============================================
// Task Types
// ============================================
export const TASK_TYPES = [
  { id: 'todo' as const, label: '📋 À faire', color: 'blue', bgColor: 'bg-blue-100', textColor: 'text-blue-800' },
  { id: 'fix' as const, label: '🔧 Corriger', color: 'red', bgColor: 'bg-red-100', textColor: 'text-red-800' },
  { id: 'modify' as const, label: '✏️ Modifier', color: 'yellow', bgColor: 'bg-yellow-100', textColor: 'text-yellow-800' },
  { id: 'debug' as const, label: '🐛 Débuguer', color: 'orange', bgColor: 'bg-orange-100', textColor: 'text-orange-800' },
  { id: 'create' as const, label: '✨ Créer', color: 'green', bgColor: 'bg-green-100', textColor: 'text-green-800' }
] as const

// ============================================
// Departments
// ============================================
export const DEPARTMENTS = [
  { id: 'accounting' as const, label: '💰 Comptabilité & Administration', color: 'emerald', bgColor: 'bg-emerald-100', textColor: 'text-emerald-800' },
  { id: 'web_sar' as const, label: '🌐 Site Web SAR', color: 'blue', bgColor: 'bg-blue-100', textColor: 'text-blue-800' },
  { id: 'web_credit' as const, label: '🌐 Site Web Crédit Secours', color: 'cyan', bgColor: 'bg-cyan-100', textColor: 'text-cyan-800' },
  { id: 'logistics' as const, label: '📧 Logistique Employés', color: 'purple', bgColor: 'bg-purple-100', textColor: 'text-purple-800' },
  { id: 'margill_app' as const, label: '📱 Margill Application', color: 'indigo', bgColor: 'bg-indigo-100', textColor: 'text-indigo-800' },
  { id: 'margill_dashboard' as const, label: '📊 Margill Dashboard', color: 'violet', bgColor: 'bg-violet-100', textColor: 'text-violet-800' },
  { id: 'infrastructure' as const, label: '🏗️ Infrastructure', color: 'gray', bgColor: 'bg-gray-100', textColor: 'text-gray-800' }
] as const

// ============================================
// Infrastructure Layers
// ============================================
export const INFRASTRUCTURE_LAYERS = [
  { id: 'frontend' as const, label: '🎨 Frontend', color: 'blue', gradient: 'from-blue-500 to-blue-700' },
  { id: 'backend' as const, label: '⚙️ Backend', color: 'green', gradient: 'from-green-500 to-green-700' },
  { id: 'database' as const, label: '🗄️ Database', color: 'purple', gradient: 'from-purple-500 to-purple-700' },
  { id: 'hosting' as const, label: '☁️ Hosting', color: 'cyan', gradient: 'from-cyan-500 to-cyan-700' },
  { id: 'external' as const, label: '🔌 Services Externes', color: 'orange', gradient: 'from-orange-500 to-orange-700' }
] as const

// ============================================
// Statuses
// ============================================
export const TASK_STATUSES = [
  { id: 'todo' as const, label: 'À faire', color: 'bg-gray-100 text-gray-800', icon: '⚪' },
  { id: 'in_progress' as const, label: 'En cours', color: 'bg-blue-100 text-blue-800', icon: '🔵' },
  { id: 'blocked' as const, label: 'Bloqué', color: 'bg-red-100 text-red-800', icon: '🔴' },
  { id: 'done' as const, label: 'Terminé', color: 'bg-green-100 text-green-800', icon: '🟢' }
] as const

// ============================================
// Priorities
// ============================================
export const TASK_PRIORITIES = [
  { id: 'low' as const, label: 'Basse', color: 'bg-gray-400 text-white', badge: '⚪' },
  { id: 'medium' as const, label: 'Moyenne', color: 'bg-yellow-500 text-white', badge: '🟡' },
  { id: 'high' as const, label: 'Haute', color: 'bg-orange-500 text-white', badge: '🟠' },
  { id: 'urgent' as const, label: 'Urgente', color: 'bg-red-600 text-white', badge: '🔴' }
] as const

// ============================================
// Assignees
// ============================================
export const ASSIGNEES = [
  { name: 'Frederic', email: 'frederic@solutionargentrapide.ca', role: 'Admin', initials: 'FR', color: 'bg-blue-500' },
  { name: 'Anthony', email: 'anthony@solutionargentrapide.ca', role: 'DevOps', initials: 'AN', color: 'bg-green-500' }
] as const

// ============================================
// Related Services (pour tags)
// ============================================
export const INFRASTRUCTURE_SERVICES = [
  { id: 'vercel', label: 'Vercel', icon: '▲', color: 'black' },
  { id: 'railway', label: 'Railway', icon: '🚂', color: 'purple' },
  { id: 'cloudflare', label: 'Cloudflare', icon: '☁️', color: 'orange' },
  { id: 'godaddy', label: 'GoDaddy', icon: '🌐', color: 'green' },
  { id: 'cloudways', label: 'Cloudways', icon: '☁️', color: 'blue' },
  { id: 'supabase', label: 'Supabase', icon: '🗄️', color: 'green' },
  { id: 'vopay', label: 'VoPay', icon: '💳', color: 'blue' },
  { id: 'flinks', label: 'Flinks', icon: '🏦', color: 'cyan' },
  { id: 'margill', label: 'Margill', icon: '📊', color: 'indigo' },
  { id: 'nextjs', label: 'Next.js', icon: '▲', color: 'black' }
] as const

// ============================================
// TypeScript Types
// ============================================
export type TaskType = typeof TASK_TYPES[number]['id']
export type Department = typeof DEPARTMENTS[number]['id']
export type InfrastructureLayer = typeof INFRASTRUCTURE_LAYERS[number]['id']
export type TaskStatus = typeof TASK_STATUSES[number]['id']
export type TaskPriority = typeof TASK_PRIORITIES[number]['id']

// ============================================
// Interfaces
// ============================================
export interface DevOpsTask {
  id: string
  task_number: string
  title: string
  description: string | null
  task_type: TaskType
  department: Department
  infrastructure_layer: InfrastructureLayer | null
  status: TaskStatus
  priority: TaskPriority
  assigned_to: string | null
  assigned_at: string | null
  due_date: string | null
  completed_at: string | null
  blocked_reason: string | null
  tags: string[]
  related_service: string | null
  metadata: Record<string, any>
  created_by: string
  created_at: string
  updated_at: string
  last_activity_at: string
}

export interface DevOpsTaskComment {
  id: string
  task_id: string
  user_name: string
  user_email: string | null
  comment: string
  is_internal: boolean
  created_at: string
}

export interface DevOpsTaskAttachment {
  id: string
  task_id: string
  file_name: string
  file_url: string
  file_type: string | null
  file_size: number | null
  uploaded_by: string
  created_at: string
}

export interface DevOpsStats {
  total_tasks: number
  todo_count: number
  in_progress_count: number
  blocked_count: number
  done_count: number
  urgent_count: number
  high_priority_count: number
  overdue_count: number
  completed_this_week: number
  tasks_by_department: Record<string, any>
  tasks_by_layer: Record<string, any>
  tasks_by_assignee: Record<string, any>
}

// ============================================
// Helper Functions
// ============================================

/**
 * Get task type label from ID
 */
export function getTaskTypeLabel(typeId: TaskType): string {
  return TASK_TYPES.find(t => t.id === typeId)?.label || typeId
}

/**
 * Get task type config from ID
 */
export function getTaskTypeConfig(typeId: TaskType) {
  return TASK_TYPES.find(t => t.id === typeId)
}

/**
 * Get department label from ID
 */
export function getDepartmentLabel(deptId: Department): string {
  return DEPARTMENTS.find(d => d.id === deptId)?.label || deptId
}

/**
 * Get department config from ID
 */
export function getDepartmentConfig(deptId: Department) {
  return DEPARTMENTS.find(d => d.id === deptId)
}

/**
 * Get status color classes from ID
 */
export function getStatusColor(statusId: TaskStatus): string {
  return TASK_STATUSES.find(s => s.id === statusId)?.color || 'bg-gray-100 text-gray-800'
}

/**
 * Get status config from ID
 */
export function getStatusConfig(statusId: TaskStatus) {
  return TASK_STATUSES.find(s => s.id === statusId)
}

/**
 * Get priority color classes from ID
 */
export function getPriorityColor(priorityId: TaskPriority): string {
  return TASK_PRIORITIES.find(p => p.id === priorityId)?.color || 'bg-gray-400 text-white'
}

/**
 * Get priority config from ID
 */
export function getPriorityConfig(priorityId: TaskPriority) {
  return TASK_PRIORITIES.find(p => p.id === priorityId)
}

/**
 * Get infrastructure layer label from ID
 */
export function getLayerLabel(layerId: InfrastructureLayer): string {
  return INFRASTRUCTURE_LAYERS.find(l => l.id === layerId)?.label || layerId
}

/**
 * Get infrastructure layer config from ID
 */
export function getLayerConfig(layerId: InfrastructureLayer) {
  return INFRASTRUCTURE_LAYERS.find(l => l.id === layerId)
}

/**
 * Get assignee config from name
 */
export function getAssigneeConfig(name: string) {
  return ASSIGNEES.find(a => a.name === name)
}

/**
 * Get service config from ID
 */
export function getServiceConfig(serviceId: string) {
  return INFRASTRUCTURE_SERVICES.find(s => s.id === serviceId)
}

/**
 * Format date as relative time (Il y a X min/heures/jours)
 */
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
  if (diffDays < 7) return `Il y a ${diffDays}j`
  if (diffDays < 30) return `Il y a ${Math.floor(diffDays / 7)} sem`

  // Format date for longer periods
  return date.toLocaleDateString('fr-CA', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}

/**
 * Check if task is overdue
 */
export function isOverdue(dueDate: string | null, status: TaskStatus): boolean {
  if (!dueDate || status === 'done') return false
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return new Date(dueDate) < today
}

/**
 * Format date as short string (DD MMM YYYY)
 */
export function formatDate(dateString: string | null): string {
  if (!dateString) return '-'
  const date = new Date(dateString)
  return date.toLocaleDateString('fr-CA', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}

/**
 * Format date as time (HH:MM)
 */
export function formatTime(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleTimeString('fr-CA', {
    hour: '2-digit',
    minute: '2-digit'
  })
}

/**
 * Get initials from name
 */
export function getInitials(name: string): string {
  if (!name) return '??'
  return name
    .split(' ')
    .map(part => part[0])
    .join('')
    .toUpperCase()
    .substring(0, 2)
}

/**
 * Get color for assignee avatar
 */
export function getAssigneeColor(name: string): string {
  const assignee = ASSIGNEES.find(a => a.name === name)
  if (assignee) return assignee.color

  // Fallback: generate color from name hash
  const colors = [
    'bg-blue-500',
    'bg-green-500',
    'bg-purple-500',
    'bg-orange-500',
    'bg-pink-500',
    'bg-indigo-500'
  ]
  const hash = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
  return colors[hash % colors.length]
}

/**
 * Sort tasks by priority (urgent > high > medium > low)
 */
export function sortByPriority(tasks: DevOpsTask[]): DevOpsTask[] {
  const priorityOrder: Record<TaskPriority, number> = {
    urgent: 0,
    high: 1,
    medium: 2,
    low: 3
  }

  return [...tasks].sort((a, b) => {
    return priorityOrder[a.priority] - priorityOrder[b.priority]
  })
}

/**
 * Sort tasks by last activity (most recent first)
 */
export function sortByActivity(tasks: DevOpsTask[]): DevOpsTask[] {
  return [...tasks].sort((a, b) => {
    return new Date(b.last_activity_at).getTime() - new Date(a.last_activity_at).getTime()
  })
}

/**
 * Sort tasks by due date (closest first)
 */
export function sortByDueDate(tasks: DevOpsTask[]): DevOpsTask[] {
  return [...tasks].sort((a, b) => {
    if (!a.due_date) return 1
    if (!b.due_date) return -1
    return new Date(a.due_date).getTime() - new Date(b.due_date).getTime()
  })
}

/**
 * Filter tasks by search query (title + description)
 */
export function filterTasksBySearch(tasks: DevOpsTask[], query: string): DevOpsTask[] {
  if (!query.trim()) return tasks

  const lowerQuery = query.toLowerCase()
  return tasks.filter(task => {
    return (
      task.title.toLowerCase().includes(lowerQuery) ||
      task.description?.toLowerCase().includes(lowerQuery) ||
      task.task_number.toLowerCase().includes(lowerQuery) ||
      task.tags.some(tag => tag.toLowerCase().includes(lowerQuery))
    )
  })
}

/**
 * Get tasks count by status
 */
export function getTasksCountByStatus(tasks: DevOpsTask[], status: TaskStatus): number {
  return tasks.filter(t => t.status === status).length
}

/**
 * Get urgent tasks
 */
export function getUrgentTasks(tasks: DevOpsTask[]): DevOpsTask[] {
  return tasks.filter(t => t.priority === 'urgent' && t.status !== 'done')
}

/**
 * Get overdue tasks
 */
export function getOverdueTasks(tasks: DevOpsTask[]): DevOpsTask[] {
  return tasks.filter(t => isOverdue(t.due_date, t.status))
}

/**
 * Get tasks by assignee
 */
export function getTasksByAssignee(tasks: DevOpsTask[], assignee: string): DevOpsTask[] {
  return tasks.filter(t => t.assigned_to === assignee)
}

/**
 * Get unassigned tasks
 */
export function getUnassignedTasks(tasks: DevOpsTask[]): DevOpsTask[] {
  return tasks.filter(t => !t.assigned_to)
}
