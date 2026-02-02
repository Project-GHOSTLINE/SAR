'use client'

import { useMemo } from 'react'
import {
  AlertTriangle, Clock, TrendingUp, Target, Zap, User, CheckCircle, Circle
} from 'lucide-react'
import {
  type DevOpsTask,
  type DevOpsStats,
  DEPARTMENTS,
  ASSIGNEES,
  getDepartmentConfig,
  getTaskTypeConfig,
  getPriorityConfig,
  formatRelativeTime,
  isOverdue,
  getInitials,
  getAssigneeColor
} from '@/lib/devops-types'
import { motion } from 'framer-motion'
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'

interface DevOpsDashboardProps {
  stats: DevOpsStats | null
  tasks: DevOpsTask[]
}

export default function DevOpsDashboard({ stats, tasks }: DevOpsDashboardProps) {
  // Tasks by user
  const tasksByUser = useMemo(() => {
    return ASSIGNEES.map(user => {
      const userTasks = tasks.filter(t => t.assigned_to === user.name && t.status !== 'done')
      const urgent = userTasks.filter(t => t.priority === 'urgent').length
      const high = userTasks.filter(t => t.priority === 'high').length
      const overdue = userTasks.filter(t => isOverdue(t.due_date, t.status)).length

      return {
        ...user,
        total: userTasks.length,
        urgent,
        high,
        overdue,
        tasks: userTasks.slice(0, 5) // Top 5 tasks
      }
    }).filter(u => u.total > 0)
  }, [tasks])

  // Unassigned tasks
  const unassignedTasks = useMemo(() => {
    return tasks.filter(t => !t.assigned_to && t.status !== 'done')
  }, [tasks])

  // Priority distribution
  const priorityData = useMemo(() => {
    const counts = { urgent: 0, high: 0, medium: 0, low: 0 }
    tasks.filter(t => t.status !== 'done').forEach(t => {
      counts[t.priority]++
    })
    return [
      { name: 'Urgente', value: counts.urgent, color: '#DC2626' },
      { name: 'Haute', value: counts.high, color: '#F59E0B' },
      { name: 'Moyenne', value: counts.medium, color: '#EAB308' },
      { name: 'Basse', value: counts.low, color: '#9CA3AF' }
    ].filter(d => d.value > 0)
  }, [tasks])

  // Department data for chart
  const departmentData = useMemo(() => {
    if (!stats?.tasks_by_department) return []

    return DEPARTMENTS.map(dept => {
      const deptStats = stats.tasks_by_department[dept.id] || { total: 0, todo: 0, in_progress: 0, done: 0 }
      return {
        name: dept.label.replace(/^.+?\s/, '').substring(0, 15),
        todo: deptStats.todo || 0,
        in_progress: deptStats.in_progress || 0,
        done: deptStats.done || 0
      }
    }).filter(d => d.todo + d.in_progress + d.done > 0)
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

  // Urgent tasks
  const urgentTasks = useMemo(() => {
    return tasks.filter(t => t.priority === 'urgent' && t.status !== 'done')
  }, [tasks])

  // Overdue tasks
  const overdueTasks = useMemo(() => {
    return tasks.filter(t => isOverdue(t.due_date, t.status))
  }, [tasks])

  return (
    <div className="space-y-6">
      {/* Vue Par Utilisateur - Section Principale */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <User size={24} className="text-[#10B981]" />
              Tâches par Membre de l'Équipe
            </h3>
            <p className="text-sm text-gray-600 mt-1">Vue personnalisée pour chaque membre</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {tasksByUser.map((user, index) => (
            <motion.div
              key={user.name}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="bg-gradient-to-br from-white to-gray-50 rounded-xl border-2 border-gray-200 p-5 hover:shadow-lg transition-all hover:border-[#10B981]"
            >
              {/* User Header */}
              <div className="flex items-center gap-3 mb-4">
                <div className={`w-12 h-12 rounded-full ${user.color} flex items-center justify-center text-white font-bold text-lg shadow-md`}>
                  {user.initials}
                </div>
                <div className="flex-1">
                  <h4 className="font-bold text-gray-900">{user.name}</h4>
                  <p className="text-xs text-gray-500">{user.role}</p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-gray-900">{user.total}</p>
                  <p className="text-xs text-gray-500">tâches</p>
                </div>
              </div>

              {/* Stats Badges */}
              <div className="flex gap-2 mb-4">
                {user.urgent > 0 && (
                  <span className="px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs font-semibold flex items-center gap-1">
                    🔴 {user.urgent} urgente{user.urgent > 1 ? 's' : ''}
                  </span>
                )}
                {user.high > 0 && (
                  <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded-full text-xs font-semibold">
                    🟠 {user.high} haute{user.high > 1 ? 's' : ''}
                  </span>
                )}
                {user.overdue > 0 && (
                  <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs font-semibold">
                    ⏰ {user.overdue} retard
                  </span>
                )}
              </div>

              {/* Tasks Preview */}
              <div className="space-y-2">
                {user.tasks.length > 0 ? (
                  user.tasks.map(task => (
                    <div key={task.id} className="bg-white rounded-lg p-2 border border-gray-200 hover:border-gray-300 transition-colors">
                      <div className="flex items-start gap-2">
                        <span className={`text-xs px-2 py-0.5 rounded font-medium ${getPriorityConfig(task.priority)?.color}`}>
                          {getPriorityConfig(task.priority)?.badge}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{task.title}</p>
                          <p className="text-xs text-gray-500">{getDepartmentConfig(task.department)?.label}</p>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-gray-500 text-center py-2">Aucune tâche assignée</p>
                )}
                {user.tasks.length > 5 && (
                  <p className="text-xs text-gray-500 text-center">+{user.total - 5} autres tâches</p>
                )}
              </div>
            </motion.div>
          ))}

          {/* Unassigned Tasks Card */}
          {unassignedTasks.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: tasksByUser.length * 0.05 }}
              className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl border-2 border-dashed border-gray-300 p-5 hover:shadow-lg transition-all hover:border-gray-400"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-full bg-gray-400 flex items-center justify-center text-white font-bold text-lg">
                  ?
                </div>
                <div className="flex-1">
                  <h4 className="font-bold text-gray-900">Non assignées</h4>
                  <p className="text-xs text-gray-500">À distribuer</p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-gray-900">{unassignedTasks.length}</p>
                  <p className="text-xs text-gray-500">tâches</p>
                </div>
              </div>

              <div className="space-y-2">
                {unassignedTasks.slice(0, 5).map(task => (
                  <div key={task.id} className="bg-white rounded-lg p-2 border border-gray-200">
                    <div className="flex items-start gap-2">
                      <span className={`text-xs px-2 py-0.5 rounded font-medium ${getPriorityConfig(task.priority)?.color}`}>
                        {getPriorityConfig(task.priority)?.badge}
                      </span>
                      <p className="text-sm font-medium text-gray-900 truncate flex-1">{task.title}</p>
                    </div>
                  </div>
                ))}
                {unassignedTasks.length > 5 && (
                  <p className="text-xs text-gray-500 text-center">+{unassignedTasks.length - 5} autres</p>
                )}
              </div>
            </motion.div>
          )}
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Priority Distribution - Pie Chart */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Target size={20} className="text-[#10B981]" />
            Par Priorité
          </h3>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={priorityData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {priorityData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Department Bar Chart */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm lg:col-span-2">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Zap size={20} className="text-[#10B981]" />
            Par Département
          </h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={departmentData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis />
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: '12px' }} />
              <Bar dataKey="todo" name="À faire" stackId="a" fill="#9CA3AF" radius={[0, 0, 0, 0]} />
              <Bar dataKey="in_progress" name="En cours" stackId="a" fill="#3B82F6" radius={[0, 0, 0, 0]} />
              <Bar dataKey="done" name="Terminées" stackId="a" fill="#10B981" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Timeline Chart */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <TrendingUp size={20} className="text-[#10B981]" />
          Productivité (7 derniers jours)
        </h3>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={timelineData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
            <XAxis dataKey="date" tick={{ fontSize: 12 }} />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line
              type="monotone"
              dataKey="completed"
              name="Tâches complétées"
              stroke="#10B981"
              strokeWidth={3}
              dot={{ fill: '#10B981', r: 5 }}
              activeDot={{ r: 7 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Alerts Row */}
      {(urgentTasks.length > 0 || overdueTasks.length > 0) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Urgent Tasks */}
          {urgentTasks.length > 0 && (
            <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-xl border-2 border-red-300 p-6 shadow-md">
              <div className="flex items-center gap-2 mb-4">
                <AlertTriangle size={24} className="text-red-600" />
                <h3 className="text-lg font-bold text-red-900">Tâches Urgentes ({urgentTasks.length})</h3>
              </div>
              <div className="space-y-2">
                {urgentTasks.slice(0, 5).map(task => (
                  <div key={task.id} className="bg-white rounded-lg p-3 border-2 border-red-200 hover:border-red-300 transition-colors">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-900 truncate">{task.title}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-gray-600">{getDepartmentConfig(task.department)?.label}</span>
                          {task.assigned_to && (
                            <>
                              <span className="text-gray-400">•</span>
                              <div className="flex items-center gap-1">
                                <div className={`w-5 h-5 rounded-full ${getAssigneeColor(task.assigned_to)} flex items-center justify-center text-white text-[10px] font-bold`}>
                                  {getInitials(task.assigned_to)}
                                </div>
                                <span className="text-xs text-gray-600">{task.assigned_to}</span>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                      <span className="text-xs bg-red-600 text-white px-2 py-1 rounded font-bold whitespace-nowrap">
                        {task.task_number}
                      </span>
                    </div>
                  </div>
                ))}
                {urgentTasks.length > 5 && (
                  <p className="text-sm text-red-700 text-center pt-2 font-medium">
                    +{urgentTasks.length - 5} autres tâches urgentes
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Overdue Tasks */}
          {overdueTasks.length > 0 && (
            <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl border-2 border-orange-300 p-6 shadow-md">
              <div className="flex items-center gap-2 mb-4">
                <Clock size={24} className="text-orange-600" />
                <h3 className="text-lg font-bold text-orange-900">Tâches En Retard ({overdueTasks.length})</h3>
              </div>
              <div className="space-y-2">
                {overdueTasks.slice(0, 5).map(task => (
                  <div key={task.id} className="bg-white rounded-lg p-3 border-2 border-orange-200 hover:border-orange-300 transition-colors">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-900 truncate">{task.title}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-gray-600">Échéance: {task.due_date}</span>
                          {task.assigned_to && (
                            <>
                              <span className="text-gray-400">•</span>
                              <div className="flex items-center gap-1">
                                <div className={`w-5 h-5 rounded-full ${getAssigneeColor(task.assigned_to)} flex items-center justify-center text-white text-[10px] font-bold`}>
                                  {getInitials(task.assigned_to)}
                                </div>
                                <span className="text-xs text-gray-600">{task.assigned_to}</span>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                      <span className="text-xs bg-orange-600 text-white px-2 py-1 rounded font-bold whitespace-nowrap">
                        {task.task_number}
                      </span>
                    </div>
                  </div>
                ))}
                {overdueTasks.length > 5 && (
                  <p className="text-sm text-orange-700 text-center pt-2 font-medium">
                    +{overdueTasks.length - 5} autres tâches en retard
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
