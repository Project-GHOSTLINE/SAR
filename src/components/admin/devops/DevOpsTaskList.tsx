'use client'

import { useState } from 'react'
import {
  Search, Filter, Trash2, Edit2, Calendar,
  User, Tag, AlertCircle, Clock, CheckCircle2, XCircle
} from 'lucide-react'
import {
  type DevOpsTask,
  TASK_STATUSES,
  TASK_PRIORITIES,
  DEPARTMENTS,
  ASSIGNEES,
  getStatusColor,
  getPriorityColor,
  getDepartmentConfig,
  getTaskTypeConfig,
  formatRelativeTime,
  isOverdue,
  formatDate,
  getInitials,
  getAssigneeColor
} from '@/lib/devops-types'
import { motion, AnimatePresence } from 'framer-motion'

interface DevOpsTaskListProps {
  tasks: DevOpsTask[]
  onRefresh: () => void
  statusFilter: string
  setStatusFilter: (value: string) => void
  departmentFilter: string
  setDepartmentFilter: (value: string) => void
  assignedFilter: string
  setAssignedFilter: (value: string) => void
  searchQuery: string
  setSearchQuery: (value: string) => void
}

export default function DevOpsTaskList({
  tasks,
  onRefresh,
  statusFilter,
  setStatusFilter,
  departmentFilter,
  setDepartmentFilter,
  assignedFilter,
  setAssignedFilter,
  searchQuery,
  setSearchQuery
}: DevOpsTaskListProps) {
  const [selectedTask, setSelectedTask] = useState<DevOpsTask | null>(null)
  const [sortBy, setSortBy] = useState<'activity' | 'priority' | 'due_date'>('activity')

  // Sort tasks
  const sortedTasks = [...tasks].sort((a, b) => {
    if (sortBy === 'activity') {
      return new Date(b.last_activity_at).getTime() - new Date(a.last_activity_at).getTime()
    } else if (sortBy === 'priority') {
      const priorityOrder: Record<string, number> = { urgent: 0, high: 1, medium: 2, low: 3 }
      return priorityOrder[a.priority] - priorityOrder[b.priority]
    } else if (sortBy === 'due_date') {
      if (!a.due_date) return 1
      if (!b.due_date) return -1
      return new Date(a.due_date).getTime() - new Date(b.due_date).getTime()
    }
    return 0
  })

  const handleDelete = async (taskId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette tâche ?')) return

    try {
      const res = await fetch(`/api/admin/devops/tasks/${taskId}`, {
        method: 'DELETE',
        credentials: 'include'
      })

      if (res.ok) {
        onRefresh()
      } else {
        alert('Erreur lors de la suppression')
      }
    } catch (error) {
      console.error('Erreur delete:', error)
      alert('Erreur serveur')
    }
  }

  const handleStatusChange = async (taskId: string, newStatus: string) => {
    try {
      const res = await fetch(`/api/admin/devops/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status: newStatus })
      })

      if (res.ok) {
        onRefresh()
      }
    } catch (error) {
      console.error('Erreur update status:', error)
    }
  }

  return (
    <div className="space-y-4">
      {/* Filters Bar */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Search */}
          <div className="flex-1">
            <div className="relative">
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Rechercher par titre, description, numéro..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#10B981] focus:border-transparent"
              />
            </div>
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#10B981]"
          >
            <option value="all">Tous les statuts</option>
            {TASK_STATUSES.map(status => (
              <option key={status.id} value={status.id}>
                {status.icon} {status.label}
              </option>
            ))}
          </select>

          {/* Department Filter */}
          <select
            value={departmentFilter}
            onChange={(e) => setDepartmentFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#10B981]"
          >
            <option value="all">Tous les départements</option>
            {DEPARTMENTS.map(dept => (
              <option key={dept.id} value={dept.id}>
                {dept.label}
              </option>
            ))}
          </select>

          {/* Assigned Filter */}
          <select
            value={assignedFilter}
            onChange={(e) => setAssignedFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#10B981]"
          >
            <option value="all">Tous</option>
            <option value="unassigned">Non assigné</option>
            {ASSIGNEES.map(assignee => (
              <option key={assignee.name} value={assignee.name}>
                {assignee.name}
              </option>
            ))}
          </select>

          {/* Sort */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#10B981]"
          >
            <option value="activity">Dernière activité</option>
            <option value="priority">Priorité</option>
            <option value="due_date">Date d'échéance</option>
          </select>
        </div>
      </div>

      {/* Task List */}
      <div className="space-y-3">
        <AnimatePresence>
          {sortedTasks.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
              <AlertCircle size={48} className="text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 font-medium">Aucune tâche trouvée</p>
              <p className="text-sm text-gray-500 mt-1">
                Essayez de modifier les filtres ou créez une nouvelle tâche
              </p>
            </div>
          ) : (
            sortedTasks.map((task, index) => (
              <motion.div
                key={task.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ delay: index * 0.05 }}
                className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-all cursor-pointer"
                onClick={() => setSelectedTask(task)}
              >
                <div className="flex items-start justify-between gap-4">
                  {/* Left: Main Info */}
                  <div className="flex-1 min-w-0">
                    {/* Header */}
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs font-mono text-gray-500 bg-gray-100 px-2 py-1 rounded">
                        {task.task_number}
                      </span>
                      <span className={`text-xs px-2 py-1 rounded font-medium ${getPriorityConfig(task.priority)?.color || ''}`}>
                        {getPriorityConfig(task.priority)?.badge} {getPriorityConfig(task.priority)?.label}
                      </span>
                      <span className={`text-xs px-2 py-1 rounded font-medium ${getTaskTypeConfig(task.task_type)?.bgColor} ${getTaskTypeConfig(task.task_type)?.textColor}`}>
                        {getTaskTypeConfig(task.task_type)?.label}
                      </span>
                    </div>

                    {/* Title */}
                    <h3 className="font-semibold text-gray-900 mb-1 truncate">
                      {task.title}
                    </h3>

                    {/* Description */}
                    {task.description && (
                      <p className="text-sm text-gray-600 line-clamp-2 mb-2">
                        {task.description}
                      </p>
                    )}

                    {/* Footer Info */}
                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <Tag size={14} />
                        {getDepartmentConfig(task.department)?.label}
                      </span>

                      {task.assigned_to && (
                        <span className="flex items-center gap-1">
                          <User size={14} />
                          {task.assigned_to}
                        </span>
                      )}

                      {task.due_date && (
                        <span className={`flex items-center gap-1 ${isOverdue(task.due_date, task.status) ? 'text-red-600 font-medium' : ''}`}>
                          <Calendar size={14} />
                          {formatDate(task.due_date)}
                          {isOverdue(task.due_date, task.status) && ' ⚠️'}
                        </span>
                      )}

                      <span className="flex items-center gap-1">
                        <Clock size={14} />
                        {formatRelativeTime(task.last_activity_at)}
                      </span>
                    </div>
                  </div>

                  {/* Right: Status & Actions */}
                  <div className="flex flex-col items-end gap-2">
                    {/* Status */}
                    <select
                      value={task.status}
                      onChange={(e) => {
                        e.stopPropagation()
                        handleStatusChange(task.id, e.target.value)
                      }}
                      onClick={(e) => e.stopPropagation()}
                      className={`text-xs px-3 py-1 rounded font-medium border-0 cursor-pointer ${getStatusColor(task.status)}`}
                    >
                      {TASK_STATUSES.map(status => (
                        <option key={status.id} value={status.id}>
                          {status.icon} {status.label}
                        </option>
                      ))}
                    </select>

                    {/* Assignee Avatar */}
                    {task.assigned_to && (
                      <div className={`w-8 h-8 rounded-full ${getAssigneeColor(task.assigned_to)} flex items-center justify-center text-white text-xs font-bold`}>
                        {getInitials(task.assigned_to)}
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          setSelectedTask(task)
                        }}
                        className="p-1.5 hover:bg-blue-50 rounded transition-colors"
                        title="Voir détails"
                      >
                        <Edit2 size={14} className="text-blue-600" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDelete(task.id)
                        }}
                        className="p-1.5 hover:bg-red-50 rounded transition-colors"
                        title="Supprimer"
                      >
                        <Trash2 size={14} className="text-red-600" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Tags */}
                {task.tags && task.tags.length > 0 && (
                  <div className="flex gap-2 mt-3">
                    {task.tags.map((tag, i) => (
                      <span key={i} className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded">
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>

      {/* Task Detail Modal - Simple version */}
      {selectedTask && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedTask(null)}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[80vh] overflow-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between mb-4">
              <div>
                <span className="text-sm font-mono text-gray-500">{selectedTask.task_number}</span>
                <h2 className="text-2xl font-bold text-gray-900 mt-1">{selectedTask.title}</h2>
              </div>
              <button
                onClick={() => setSelectedTask(null)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <XCircle size={20} className="text-gray-500" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Badges */}
              <div className="flex flex-wrap gap-2">
                <span className={`text-xs px-3 py-1 rounded font-medium ${getStatusColor(selectedTask.status)}`}>
                  {TASK_STATUSES.find(s => s.id === selectedTask.status)?.icon} {TASK_STATUSES.find(s => s.id === selectedTask.status)?.label}
                </span>
                <span className={`text-xs px-3 py-1 rounded font-medium ${getPriorityColor(selectedTask.priority)}`}>
                  {TASK_PRIORITIES.find(p => p.id === selectedTask.priority)?.badge} {TASK_PRIORITIES.find(p => p.id === selectedTask.priority)?.label}
                </span>
                <span className={`text-xs px-3 py-1 rounded font-medium ${getDepartmentConfig(selectedTask.department)?.bgColor} ${getDepartmentConfig(selectedTask.department)?.textColor}`}>
                  {getDepartmentConfig(selectedTask.department)?.label}
                </span>
              </div>

              {/* Description */}
              {selectedTask.description && (
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-2">Description</h3>
                  <p className="text-gray-600 whitespace-pre-wrap">{selectedTask.description}</p>
                </div>
              )}

              {/* Details */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-sm text-gray-500">Assigné à</span>
                  <p className="font-medium">{selectedTask.assigned_to || 'Non assigné'}</p>
                </div>
                <div>
                  <span className="text-sm text-gray-500">Date d'échéance</span>
                  <p className="font-medium">{selectedTask.due_date ? formatDate(selectedTask.due_date) : '-'}</p>
                </div>
                <div>
                  <span className="text-sm text-gray-500">Créé le</span>
                  <p className="font-medium">{formatDate(selectedTask.created_at)}</p>
                </div>
                <div>
                  <span className="text-sm text-gray-500">Dernière activité</span>
                  <p className="font-medium">{formatRelativeTime(selectedTask.last_activity_at)}</p>
                </div>
              </div>

              {/* Tags */}
              {selectedTask.tags && selectedTask.tags.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-2">Tags</h3>
                  <div className="flex flex-wrap gap-2">
                    {selectedTask.tags.map((tag, i) => (
                      <span key={i} className="text-sm bg-gray-100 text-gray-700 px-3 py-1 rounded">
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Blocked Reason */}
              {selectedTask.status === 'blocked' && selectedTask.blocked_reason && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <h3 className="text-sm font-medium text-red-700 mb-1">Raison du blocage</h3>
                  <p className="text-sm text-red-600">{selectedTask.blocked_reason}</p>
                </div>
              )}
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setSelectedTask(null)}
                className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg transition-colors"
              >
                Fermer
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  )
}
