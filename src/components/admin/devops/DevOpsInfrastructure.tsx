'use client'

import { useMemo, useCallback } from 'react'
import ReactFlow, {
  Node,
  Edge,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
} from 'reactflow'
import 'reactflow/dist/style.css'
import { type DevOpsTask } from '@/lib/devops-types'

interface DevOpsInfrastructureProps {
  tasks: DevOpsTask[]
}

// Custom Node Component
function ServiceNode({ data }: any) {
  const getColorClass = (count: number) => {
    if (count === 0) return 'from-green-500 to-green-600'
    if (count <= 3) return 'from-yellow-500 to-yellow-600'
    return 'from-red-500 to-red-600'
  }

  return (
    <div className="relative">
      <div className={`bg-gradient-to-br ${data.gradient} rounded-lg shadow-lg p-4 border-2 border-white min-w-[150px]`}>
        <div className="flex items-center justify-between mb-2">
          <span className="text-2xl">{data.icon}</span>
          {data.taskCount > 0 && (
            <span className={`text-xs px-2 py-1 rounded-full bg-white font-bold ${
              data.taskCount <= 3 ? 'text-yellow-700' : 'text-red-700'
            }`}>
              {data.taskCount}
            </span>
          )}
        </div>
        <p className="text-white font-semibold text-sm">{data.label}</p>
        <p className="text-white/80 text-xs mt-1">{data.layer}</p>
      </div>
      {data.taskCount > 0 && (
        <div className={`absolute -top-1 -right-1 w-3 h-3 bg-gradient-to-br ${getColorClass(data.taskCount)} rounded-full animate-pulse`} />
      )}
    </div>
  )
}

const nodeTypes = {
  service: ServiceNode
}

export default function DevOpsInfrastructure({ tasks }: DevOpsInfrastructureProps) {
  // Count tasks by department and service
  const getTaskCount = useCallback((department?: string, service?: string) => {
    return tasks.filter(t => {
      if (t.status === 'done') return false
      if (department && t.department !== department) return false
      if (service && t.related_service !== service) return false
      return true
    }).length
  }, [tasks])

  // Define nodes for each layer
  const initialNodes: Node[] = useMemo(() => [
    // Layer 1: Frontend
    {
      id: 'sar-site',
      type: 'service',
      position: { x: 100, y: 50 },
      data: {
        label: 'Site SAR',
        icon: '🌐',
        layer: 'Frontend',
        gradient: 'from-blue-500 to-blue-700',
        taskCount: getTaskCount('web_sar')
      }
    },
    {
      id: 'credit-site',
      type: 'service',
      position: { x: 320, y: 50 },
      data: {
        label: 'Site Crédit Secours',
        icon: '🌐',
        layer: 'Frontend',
        gradient: 'from-cyan-500 to-cyan-700',
        taskCount: getTaskCount('web_credit')
      }
    },

    // Layer 2: Backend
    {
      id: 'nextjs-api',
      type: 'service',
      position: { x: 100, y: 200 },
      data: {
        label: 'Next.js API',
        icon: '▲',
        layer: 'Backend',
        gradient: 'from-green-500 to-green-700',
        taskCount: getTaskCount(undefined, 'nextjs')
      }
    },
    {
      id: 'margill-app',
      type: 'service',
      position: { x: 320, y: 200 },
      data: {
        label: 'Margill App',
        icon: '📱',
        layer: 'Backend',
        gradient: 'from-indigo-500 to-indigo-700',
        taskCount: getTaskCount('margill_app')
      }
    },
    {
      id: 'margill-dashboard',
      type: 'service',
      position: { x: 540, y: 200 },
      data: {
        label: 'Margill Dashboard',
        icon: '📊',
        layer: 'Backend',
        gradient: 'from-violet-500 to-violet-700',
        taskCount: getTaskCount('margill_dashboard')
      }
    },

    // Layer 3: Database
    {
      id: 'supabase',
      type: 'service',
      position: { x: 320, y: 350 },
      data: {
        label: 'Supabase',
        icon: '🗄️',
        layer: 'Database',
        gradient: 'from-purple-500 to-purple-700',
        taskCount: getTaskCount(undefined, 'supabase')
      }
    },

    // Layer 4: Hosting
    {
      id: 'vercel',
      type: 'service',
      position: { x: 50, y: 500 },
      data: {
        label: 'Vercel',
        icon: '▲',
        layer: 'Hosting',
        gradient: 'from-gray-700 to-gray-900',
        taskCount: getTaskCount(undefined, 'vercel')
      }
    },
    {
      id: 'railway',
      type: 'service',
      position: { x: 250, y: 500 },
      data: {
        label: 'Railway',
        icon: '🚂',
        layer: 'Hosting',
        gradient: 'from-purple-600 to-purple-800',
        taskCount: getTaskCount(undefined, 'railway')
      }
    },
    {
      id: 'cloudways',
      type: 'service',
      position: { x: 450, y: 500 },
      data: {
        label: 'Cloudways',
        icon: '☁️',
        layer: 'Hosting',
        gradient: 'from-cyan-600 to-cyan-800',
        taskCount: getTaskCount(undefined, 'cloudways')
      }
    },

    // Layer 5: External Services
    {
      id: 'cloudflare',
      type: 'service',
      position: { x: 50, y: 650 },
      data: {
        label: 'Cloudflare',
        icon: '☁️',
        layer: 'External',
        gradient: 'from-orange-500 to-orange-700',
        taskCount: getTaskCount(undefined, 'cloudflare')
      }
    },
    {
      id: 'godaddy',
      type: 'service',
      position: { x: 230, y: 650 },
      data: {
        label: 'GoDaddy',
        icon: '🌐',
        layer: 'External',
        gradient: 'from-green-600 to-green-800',
        taskCount: getTaskCount(undefined, 'godaddy')
      }
    },
    {
      id: 'vopay',
      type: 'service',
      position: { x: 410, y: 650 },
      data: {
        label: 'VoPay',
        icon: '💳',
        layer: 'External',
        gradient: 'from-blue-600 to-blue-800',
        taskCount: getTaskCount(undefined, 'vopay')
      }
    },
    {
      id: 'flinks',
      type: 'service',
      position: { x: 590, y: 650 },
      data: {
        label: 'Flinks',
        icon: '🏦',
        layer: 'External',
        gradient: 'from-cyan-600 to-cyan-800',
        taskCount: getTaskCount(undefined, 'flinks')
      }
    }
  ], [getTaskCount])

  // Define edges (connections)
  const initialEdges: Edge[] = useMemo(() => [
    // Frontend -> Backend
    { id: 'e1', source: 'sar-site', target: 'nextjs-api', animated: true, style: { stroke: '#3B82F6' } },
    { id: 'e2', source: 'credit-site', target: 'nextjs-api', animated: true, style: { stroke: '#06B6D4' } },
    { id: 'e3', source: 'sar-site', target: 'margill-app', animated: true, style: { stroke: '#3B82F6' } },

    // Backend -> Database
    { id: 'e4', source: 'nextjs-api', target: 'supabase', animated: true, style: { stroke: '#10B981' } },
    { id: 'e5', source: 'margill-app', target: 'supabase', animated: true, style: { stroke: '#6366F1' } },
    { id: 'e6', source: 'margill-dashboard', target: 'supabase', animated: true, style: { stroke: '#8B5CF6' } },

    // Database -> Hosting
    { id: 'e7', source: 'supabase', target: 'vercel', animated: true, style: { stroke: '#8B5CF6' } },
    { id: 'e8', source: 'supabase', target: 'railway', animated: true, style: { stroke: '#8B5CF6' } },

    // Hosting -> External
    { id: 'e9', source: 'vercel', target: 'cloudflare', animated: true, style: { stroke: '#F97316' } },
    { id: 'e10', source: 'nextjs-api', target: 'vopay', animated: true, style: { stroke: '#3B82F6' } },
    { id: 'e11', source: 'nextjs-api', target: 'flinks', animated: true, style: { stroke: '#06B6D4' } },
  ], [])

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges)

  return (
    <div className="h-[800px] bg-gray-50 rounded-lg border border-gray-200 overflow-hidden">
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Architecture Infrastructure</h3>
        <p className="text-sm text-gray-600">
          Visualisation en couches des systèmes SAR et Crédit Secours
        </p>
        <div className="flex gap-4 mt-3 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-green-500 rounded-full" />
            <span className="text-gray-600">0 tâches</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-yellow-500 rounded-full" />
            <span className="text-gray-600">1-3 tâches</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-red-500 rounded-full" />
            <span className="text-gray-600">4+ tâches</span>
          </div>
        </div>
      </div>

      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        fitView
        minZoom={0.5}
        maxZoom={1.5}
      >
        <Background color="#E5E7EB" gap={16} />
        <Controls />
        <MiniMap
          nodeColor={(node) => {
            const taskCount = node.data.taskCount || 0
            if (taskCount === 0) return '#10B981'
            if (taskCount <= 3) return '#F59E0B'
            return '#EF4444'
          }}
          maskColor="rgba(0, 0, 0, 0.1)"
        />
      </ReactFlow>
    </div>
  )
}
