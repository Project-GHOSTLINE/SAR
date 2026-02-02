'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Plus, RefreshCw, LayoutGrid, List, Zap,
  Loader2, CheckCircle, Clock,
  AlertTriangle, Target, TrendingUp
} from 'lucide-react'
import {
  type DevOpsTask,
  type DevOpsStats
} from '@/lib/devops-types'
import { motion } from 'framer-motion'
import DevOpsTaskList from './devops/DevOpsTaskList'
import DevOpsDashboard from './devops/DevOpsDashboard'
import DevOpsInfrastructure from './devops/DevOpsInfrastructure'
import CreateTaskModal from './devops/CreateTaskModal'

type SubView = 'dashboard' | 'tasks' | 'infrastructure'

export default function DevOpsView() {
  const [subView, setSubView] = useState<SubView>('dashboard')
  const [tasks, setTasks] = useState<DevOpsTask[]>([])
  const [stats, setStats] = useState<DevOpsStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)

  // Filters
  const [statusFilter, setStatusFilter] = useState('all')
  const [departmentFilter, setDepartmentFilter] = useState('all')
  const [assignedFilter, setAssignedFilter] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')

  // Fetch tasks
  const fetchTasks = useCallback(async () => {
    try {
      const params = new URLSearchParams()
      if (statusFilter !== 'all') params.append('status', statusFilter)
      if (departmentFilter !== 'all') params.append('department', departmentFilter)
      if (assignedFilter !== 'all') params.append('assigned_to', assignedFilter)
      if (searchQuery) params.append('search', searchQuery)

      const res = await fetch(`/api/admin/devops/tasks?${params.toString()}`, {
        credentials: 'include'
      })

      if (res.ok) {
        const data = await res.json()
        setTasks(data.tasks || [])
      } else {
        console.error('Erreur fetch tasks:', await res.text())
      }
    } catch (error) {
      console.error('Erreur fetch tasks:', error)
    } finally {
      setLoading(false)
    }
  }, [statusFilter, departmentFilter, assignedFilter, searchQuery])

  // Fetch stats
  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/devops/stats', {
        credentials: 'include'
      })

      if (res.ok) {
        const data = await res.json()
        setStats(data.stats)
      } else {
        console.error('Erreur fetch stats:', await res.text())
      }
    } catch (error) {
      console.error('Erreur fetch stats:', error)
    }
  }, [])

  useEffect(() => {
    fetchTasks()
    fetchStats()
  }, [fetchTasks, fetchStats])

  const handleRefresh = () => {
    setLoading(true)
    fetchTasks()
    fetchStats()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Loader2 size={48} className="animate-spin text-[#10B981] mx-auto mb-4" />
          <p className="text-gray-600 font-medium">Chargement DevOps...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              🚀 DevOps Management
            </h2>
            <p className="text-gray-600 mt-1">
              Gestion des tâches pour SAR, Crédit Secours et Infrastructure
            </p>
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleRefresh}
              className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2"
            >
              <RefreshCw size={16} />
              <span className="hidden sm:inline">Actualiser</span>
            </button>

            <button
              onClick={() => setIsModalOpen(true)}
              className="px-4 py-2 bg-[#10B981] text-white rounded-lg hover:bg-emerald-600 transition-colors flex items-center gap-2 shadow-sm"
            >
              <Plus size={16} />
              <span>Nouvelle Tâche</span>
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-white rounded-lg shadow-sm border border-gray-100 p-4"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-gray-600">Total</span>
                <Target size={16} className="text-gray-400" />
              </div>
              <p className="text-2xl font-bold text-gray-900">{stats.total_tasks}</p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="bg-white rounded-lg shadow-sm border border-gray-100 p-4"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-gray-600">À faire</span>
                <Clock size={16} className="text-gray-400" />
              </div>
              <p className="text-2xl font-bold text-gray-900">{stats.todo_count}</p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-white rounded-lg shadow-sm border border-blue-200 p-4 bg-blue-50"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-blue-700">En cours</span>
                <Zap size={16} className="text-blue-600" />
              </div>
              <p className="text-2xl font-bold text-blue-900">{stats.in_progress_count}</p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
              className="bg-white rounded-lg shadow-sm border border-red-200 p-4 bg-red-50"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-red-700">Urgentes</span>
                <AlertTriangle size={16} className="text-red-600" />
              </div>
              <p className="text-2xl font-bold text-red-900">{stats.urgent_count}</p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-white rounded-lg shadow-sm border border-green-200 p-4 bg-green-50"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-green-700">Terminées</span>
                <CheckCircle size={16} className="text-green-600" />
              </div>
              <p className="text-2xl font-bold text-green-900">{stats.done_count}</p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35 }}
              className="bg-white rounded-lg shadow-sm border border-purple-200 p-4 bg-purple-50"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-purple-700">Cette semaine</span>
                <TrendingUp size={16} className="text-purple-600" />
              </div>
              <p className="text-2xl font-bold text-purple-900">{stats.completed_this_week}</p>
            </motion.div>
          </div>
        )}

        {/* Sub-Navigation Tabs */}
        <div className="flex gap-2 border-b border-gray-200">
          <button
            onClick={() => setSubView('dashboard')}
            className={`px-4 py-2 font-medium transition-all flex items-center gap-2 ${
              subView === 'dashboard'
                ? 'text-[#10B981] border-b-2 border-[#10B981]'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <LayoutGrid size={16} />
            Dashboard
          </button>

          <button
            onClick={() => setSubView('tasks')}
            className={`px-4 py-2 font-medium transition-all flex items-center gap-2 ${
              subView === 'tasks'
                ? 'text-[#10B981] border-b-2 border-[#10B981]'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <List size={16} />
            Tâches
            {tasks.length > 0 && (
              <span className="text-xs bg-gray-200 px-2 py-0.5 rounded-full">
                {tasks.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setSubView('infrastructure')}
            className={`px-4 py-2 font-medium transition-all flex items-center gap-2 ${
              subView === 'infrastructure'
                ? 'text-[#10B981] border-b-2 border-[#10B981]'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Zap size={16} />
            Infrastructure
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1">
        {subView === 'dashboard' && (
          <DevOpsDashboard stats={stats} tasks={tasks} />
        )}

        {subView === 'tasks' && (
          <DevOpsTaskList
            tasks={tasks}
            onRefresh={fetchTasks}
            statusFilter={statusFilter}
            setStatusFilter={setStatusFilter}
            departmentFilter={departmentFilter}
            setDepartmentFilter={setDepartmentFilter}
            assignedFilter={assignedFilter}
            setAssignedFilter={setAssignedFilter}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
          />
        )}

        {subView === 'infrastructure' && (
          <DevOpsInfrastructure tasks={tasks} />
        )}
      </div>

      {/* Create Task Modal */}
      <CreateTaskModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={() => {
          setIsModalOpen(false)
          fetchTasks()
          fetchStats()
        }}
      />
    </div>
  )
}
