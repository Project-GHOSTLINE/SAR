'use client'

import { useMemo } from 'react'
import {
  AlertTriangle, Clock, TrendingUp, Target, Zap
} from 'lucide-react'
import {
  type DevOpsTask,
  type DevOpsStats,
  DEPARTMENTS,
  getDepartmentConfig,
  getTaskTypeConfig,
  getPriorityConfig,
  formatRelativeTime,
  isOverdue
} from '@/lib/devops-types'
import { motion } from 'framer-motion'
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts'

interface DevOpsDashboardProps {
  stats: DevOpsStats | null
  tasks: DevOpsTask[]
}

export default function DevOpsDashboard({ stats, tasks }: DevOpsDashboardProps) {
  // Prepare chart data
  const departmentData = useMemo(() => {
    if (!stats?.tasks_by_department) return []

    return DEPARTMENTS.map(dept => {
      const deptStats = stats.tasks_by_department[dept.id] || { total: 0, todo: 0, in_progress: 0, done: 0 }
      return {
        name: dept.label.replace(/^.+?\s/, ''), // Remove emoji
        total: deptStats.total || 0,
        todo: deptStats.todo || 0,
        in_progress: deptStats.in_progress || 0,
        done: deptStats.done || 0,
        color: dept.color
      }
    }).filter(d => d.total > 0)
  }, [stats])

  // Timeline data (last 7 days)
  const timelineData = useMemo(() => {
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = new Date()
      date.setDate(date.getDate() - (6 - i))
      return date.toISOString().split('T')[0]
    })

    return last7Days.map(date => {
      const completedOnDate = tasks.filter(t =>
        t.completed_at && t.completed_at.startsWith(date)
      ).length

      return {
        date: new Date(date).toLocaleDateString('fr-CA', { weekday: 'short', day: 'numeric' }),
        completed: completedOnDate
      }
    })
  }, [tasks])

  // Recent tasks (last 10)
  const recentTasks = useMemo(() => {
    return [...tasks]
      .sort((a, b) => new Date(b.last_activity_at).getTime() - new Date(a.last_activity_at).getTime())
      .slice(0, 10)
  }, [tasks])

  // Urgent tasks
  const urgentTasks = useMemo(() => {
    return tasks.filter(t => t.priority === 'urgent' && t.status !== 'done')
  }, [tasks])

  // Overdue tasks
  const overdueTasks = useMemo(() => {
    return tasks.filter(t => isOverdue(t.due_date, t.status))
  }, [tasks])

  const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#6B7280']

  return (
    <div className="space-y-6">
      {/* KPI Cards by Department */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Par Département</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {DEPARTMENTS.map((dept, index) => {
            const deptStats = stats?.tasks_by_department?.[dept.id] || { total: 0, todo: 0, in_progress: 0, done: 0 }
            return (
              <motion.div
                key={dept.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium text-gray-600">{dept.label}</span>
                  <Target size={16} className="text-gray-400" />
                </div>
                <p className="text-3xl font-bold text-gray-900 mb-2">{deptStats.total || 0}</p>
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span>⚪ {deptStats.todo || 0}</span>
                  <span>🔵 {deptStats.in_progress || 0}</span>
                  <span>🟢 {deptStats.done || 0}</span>
                </div>
              </motion.div>
            )
          })}
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Bar Chart: Répartition par département */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Répartition par Département</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={departmentData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="todo" name="À faire" stackId="a" fill="#9CA3AF" />
              <Bar dataKey="in_progress" name="En cours" stackId="a" fill="#3B82F6" />
              <Bar dataKey="done" name="Terminées" stackId="a" fill="#10B981" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Line Chart: Timeline */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Tâches Complétées (7 derniers jours)</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={timelineData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis dataKey="date" tick={{ fontSize: 12 }} />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line
                type="monotone"
                dataKey="completed"
                name="Complétées"
                stroke="#10B981"
                strokeWidth={2}
                dot={{ fill: '#10B981', r: 4 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Urgent & Overdue Tasks */}
      {(urgentTasks.length > 0 || overdueTasks.length > 0) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Urgent Tasks */}
          {urgentTasks.length > 0 && (
            <div className="bg-red-50 rounded-lg border border-red-200 p-6">
              <div className="flex items-center gap-2 mb-4">
                <AlertTriangle size={20} className="text-red-600" />
                <h3 className="text-lg font-semibold text-red-900">Tâches Urgentes ({urgentTasks.length})</h3>
              </div>
              <div className="space-y-2">
                {urgentTasks.slice(0, 5).map(task => (
                  <div key={task.id} className="bg-white rounded p-3 border border-red-200">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 truncate">{task.title}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          {getDepartmentConfig(task.department)?.label} • {formatRelativeTime(task.last_activity_at)}
                        </p>
                      </div>
                      <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded font-medium whitespace-nowrap">
                        {task.task_number}
                      </span>
                    </div>
                  </div>
                ))}
                {urgentTasks.length > 5 && (
                  <p className="text-xs text-red-600 text-center pt-2">
                    +{urgentTasks.length - 5} autres tâches urgentes
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Overdue Tasks */}
          {overdueTasks.length > 0 && (
            <div className="bg-orange-50 rounded-lg border border-orange-200 p-6">
              <div className="flex items-center gap-2 mb-4">
                <Clock size={20} className="text-orange-600" />
                <h3 className="text-lg font-semibold text-orange-900">Tâches En Retard ({overdueTasks.length})</h3>
              </div>
              <div className="space-y-2">
                {overdueTasks.slice(0, 5).map(task => (
                  <div key={task.id} className="bg-white rounded p-3 border border-orange-200">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 truncate">{task.title}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          Échéance: {task.due_date} • {getDepartmentConfig(task.department)?.label}
                        </p>
                      </div>
                      <span className="text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded font-medium whitespace-nowrap">
                        {task.task_number}
                      </span>
                    </div>
                  </div>
                ))}
                {overdueTasks.length > 5 && (
                  <p className="text-xs text-orange-600 text-center pt-2">
                    +{overdueTasks.length - 5} autres tâches en retard
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Recent Tasks */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center gap-2 mb-4">
          <Zap size={20} className="text-gray-600" />
          <h3 className="text-lg font-semibold text-gray-900">Activité Récente</h3>
        </div>
        <div className="space-y-2">
          {recentTasks.length === 0 ? (
            <p className="text-gray-500 text-center py-8">Aucune activité récente</p>
          ) : (
            recentTasks.map(task => (
              <div key={task.id} className="flex items-center justify-between p-3 hover:bg-gray-50 rounded transition-colors">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <span className={`text-xs px-2 py-1 rounded font-medium ${getPriorityConfig(task.priority)?.color}`}>
                    {getPriorityConfig(task.priority)?.badge}
                  </span>
                  <span className={`text-xs px-2 py-1 rounded font-medium ${getTaskTypeConfig(task.task_type)?.bgColor} ${getTaskTypeConfig(task.task_type)?.textColor}`}>
                    {getTaskTypeConfig(task.task_type)?.label}
                  </span>
                  <p className="font-medium text-gray-900 truncate">{task.title}</p>
                </div>
                <div className="flex items-center gap-4 text-xs text-gray-500">
                  <span>{getDepartmentConfig(task.department)?.label}</span>
                  <span>{formatRelativeTime(task.last_activity_at)}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-gradient-to-r from-blue-50 to-green-50 rounded-lg border border-blue-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Actions Rapides</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <button className="bg-white hover:bg-gray-50 border border-gray-200 rounded-lg p-4 text-left transition-colors">
            <p className="text-2xl mb-1">⚪</p>
            <p className="text-sm font-medium text-gray-900">À faire</p>
            <p className="text-xs text-gray-500">{stats?.todo_count || 0} tâches</p>
          </button>
          <button className="bg-white hover:bg-gray-50 border border-gray-200 rounded-lg p-4 text-left transition-colors">
            <p className="text-2xl mb-1">🔵</p>
            <p className="text-sm font-medium text-gray-900">En cours</p>
            <p className="text-xs text-gray-500">{stats?.in_progress_count || 0} tâches</p>
          </button>
          <button className="bg-white hover:bg-gray-50 border border-gray-200 rounded-lg p-4 text-left transition-colors">
            <p className="text-2xl mb-1">🔴</p>
            <p className="text-sm font-medium text-gray-900">Urgentes</p>
            <p className="text-xs text-gray-500">{stats?.urgent_count || 0} tâches</p>
          </button>
          <button className="bg-white hover:bg-gray-50 border border-gray-200 rounded-lg p-4 text-left transition-colors">
            <p className="text-2xl mb-1">📅</p>
            <p className="text-sm font-medium text-gray-900">En retard</p>
            <p className="text-xs text-gray-500">{overdueTasks.length} tâches</p>
          </button>
        </div>
      </div>
    </div>
  )
}
