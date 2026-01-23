'use client'

import { useEffect, useState, useCallback } from 'react'
import ReactFlow, {
  Node,
  Edge,
  Background,
  Controls,
  useNodesState,
  useEdgesState,
  MarkerType,
} from 'reactflow'
import 'reactflow/dist/style.css'
import { motion } from 'framer-motion'

interface DataflowStats {
  browserRequests: number
  middlewareProcessed: number
  apiCalls: number
  dbWrites: number
}

interface AnimatedDataflowDiagramProps {
  stats?: DataflowStats
  realtimeRequests?: Array<{
    id: string
    timestamp: string
    path: string
    status: number
  }>
}

// Custom Node Component with Glassmorphism
function CustomNode({ data }: any) {
  return (
    <motion.div
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="relative"
    >
      <div className="px-6 py-4 rounded-xl border border-white/20 backdrop-blur-xl shadow-2xl"
        style={{
          background: `linear-gradient(135deg, ${data.gradientFrom} 0%, ${data.gradientTo} 100%)`,
        }}
      >
        <div className="flex items-center space-x-3">
          <div className="text-3xl">{data.icon}</div>
          <div>
            <div className="text-white font-bold text-lg">{data.label}</div>
            <div className="text-white/80 text-sm">{data.description}</div>
            {data.stat !== undefined && (
              <div className="text-white font-mono text-xl mt-1">
                {data.stat.toLocaleString()} req/min
              </div>
            )}
          </div>
        </div>

        {/* Pulse effect when active */}
        {data.isActive && (
          <motion.div
            className="absolute inset-0 rounded-xl border-2 border-white/50"
            animate={{
              scale: [1, 1.1, 1],
              opacity: [0.5, 0, 0.5],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />
        )}
      </div>
    </motion.div>
  )
}

const nodeTypes = {
  custom: CustomNode,
}

export default function AnimatedDataflowDiagram({
  stats = {
    browserRequests: 0,
    middlewareProcessed: 0,
    apiCalls: 0,
    dbWrites: 0,
  },
  realtimeRequests = []
}: AnimatedDataflowDiagramProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState([])
  const [edges, setEdges, onEdgesChange] = useEdgesState([])
  const [particles, setParticles] = useState<Array<{ id: string; progress: number }>>([])

  // Initialize nodes
  useEffect(() => {
    const initialNodes: Node[] = [
      {
        id: 'browser',
        type: 'custom',
        position: { x: 50, y: 200 },
        data: {
          label: 'Browser',
          description: 'User requests',
          icon: '🌐',
          gradientFrom: '#667eea',
          gradientTo: '#764ba2',
          stat: stats.browserRequests,
          isActive: realtimeRequests.length > 0,
        },
      },
      {
        id: 'middleware',
        type: 'custom',
        position: { x: 300, y: 200 },
        data: {
          label: 'Middleware',
          description: 'Edge Runtime',
          icon: '⚡',
          gradientFrom: '#f093fb',
          gradientTo: '#f5576c',
          stat: stats.middlewareProcessed,
          isActive: realtimeRequests.length > 0,
        },
      },
      {
        id: 'api',
        type: 'custom',
        position: { x: 550, y: 200 },
        data: {
          label: 'API Routes',
          description: 'Node.js Runtime',
          icon: '🔧',
          gradientFrom: '#4facfe',
          gradientTo: '#00f2fe',
          stat: stats.apiCalls,
          isActive: realtimeRequests.length > 0,
        },
      },
      {
        id: 'database',
        type: 'custom',
        position: { x: 800, y: 200 },
        data: {
          label: 'Database',
          description: 'Supabase',
          icon: '🗄️',
          gradientFrom: '#43e97b',
          gradientTo: '#38f9d7',
          stat: stats.dbWrites,
          isActive: realtimeRequests.length > 0,
        },
      },
    ]

    setNodes(initialNodes)
  }, [stats, realtimeRequests, setNodes])

  // Initialize edges with animated gradients
  useEffect(() => {
    const initialEdges: Edge[] = [
      {
        id: 'e1',
        source: 'browser',
        target: 'middleware',
        animated: true,
        style: { stroke: '#667eea', strokeWidth: 3 },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: '#667eea',
        },
      },
      {
        id: 'e2',
        source: 'middleware',
        target: 'api',
        animated: true,
        style: { stroke: '#f093fb', strokeWidth: 3 },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: '#f093fb',
        },
      },
      {
        id: 'e3',
        source: 'api',
        target: 'database',
        animated: true,
        style: { stroke: '#4facfe', strokeWidth: 3 },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: '#4facfe',
        },
      },
    ]

    setEdges(initialEdges)
  }, [setEdges])

  // Animate particles when new requests come in
  useEffect(() => {
    if (realtimeRequests.length > 0) {
      const newParticle = {
        id: `particle-${Date.now()}`,
        progress: 0,
      }
      setParticles(prev => [...prev, newParticle])

      // Animate particle across the flow
      const interval = setInterval(() => {
        setParticles(prev =>
          prev.map(p =>
            p.id === newParticle.id
              ? { ...p, progress: Math.min(p.progress + 0.02, 1) }
              : p
          ).filter(p => p.progress < 1)
        )
      }, 50)

      return () => clearInterval(interval)
    }
  }, [realtimeRequests])

  return (
    <div className="relative h-[500px] w-full rounded-xl overflow-hidden border border-white/10"
      style={{
        background: 'linear-gradient(135deg, #1e1e2e 0%, #2d2d44 100%)',
      }}
    >
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        fitView
        className="bg-transparent"
        proOptions={{ hideAttribution: true }}
      >
        <Background color="#ffffff" gap={16} size={1} style={{ opacity: 0.1 }} />
        <Controls className="bg-white/10 backdrop-blur-xl border border-white/20" />
      </ReactFlow>

      {/* Animated particles overlay */}
      <div className="absolute inset-0 pointer-events-none">
        {particles.map(particle => (
          <motion.div
            key={particle.id}
            className="absolute w-3 h-3 rounded-full bg-gradient-to-r from-cyan-400 to-blue-500 shadow-lg"
            style={{
              left: `${10 + particle.progress * 80}%`,
              top: '50%',
              boxShadow: '0 0 20px rgba(34, 211, 238, 0.8)',
            }}
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0 }}
          />
        ))}
      </div>

      {/* Stats overlay */}
      <div className="absolute top-4 right-4 px-4 py-2 rounded-lg bg-black/30 backdrop-blur-xl border border-white/10">
        <div className="text-white/80 text-sm">
          Live: <span className="text-green-400 font-bold">{realtimeRequests.length}</span> req
        </div>
      </div>
    </div>
  )
}
