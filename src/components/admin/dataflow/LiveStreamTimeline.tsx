'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { Badge } from '@/components/ui/badge'
import { CheckCircle, XCircle, AlertTriangle } from 'lucide-react'

interface TraceItem {
  traceId: string
  timestamp: string
  method: string
  path: string
  status: number
  durationMs: number
  source: string
  spanCount?: number
  hasErrors?: boolean
}

interface LiveStreamTimelineProps {
  traces: TraceItem[]
  onTraceClick?: (traceId: string) => void
}

export default function LiveStreamTimeline({
  traces,
  onTraceClick,
}: LiveStreamTimelineProps) {
  const getStatusColor = (status: number) => {
    if (status >= 200 && status < 300) return 'bg-green-500'
    if (status >= 400 && status < 500) return 'bg-yellow-500'
    return 'bg-red-500'
  }

  const getStatusIcon = (status: number, hasErrors?: boolean) => {
    if (hasErrors || status >= 500) return <XCircle className="w-4 h-4 text-red-400" />
    if (status >= 400) return <AlertTriangle className="w-4 h-4 text-yellow-400" />
    return <CheckCircle className="w-4 h-4 text-green-400" />
  }

  const getSourceGradient = (source: string) => {
    switch (source) {
      case 'webhook':
        return ['#f093fb', '#f5576c']
      case 'cron':
        return ['#4facfe', '#00f2fe']
      case 'internal':
        return ['#43e97b', '#38f9d7']
      default:
        return ['#667eea', '#764ba2']
    }
  }

  const getDurationColor = (duration: number) => {
    if (duration < 100) return 'text-green-400'
    if (duration < 500) return 'text-yellow-400'
    return 'text-red-400'
  }

  return (
    <div className="relative">
      {/* Vertical timeline line */}
      <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-gradient-to-b from-purple-500 via-blue-500 to-green-500 opacity-30" />

      {/* Traces */}
      <div className="space-y-3">
        <AnimatePresence mode="popLayout">
          {traces.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-center py-12 text-gray-400"
            >
              <div className="text-4xl mb-2">👀</div>
              <p>Waiting for requests...</p>
            </motion.div>
          ) : (
            traces.map((trace, index) => {
              const gradient = getSourceGradient(trace.source)

              return (
                <motion.div
                  key={trace.traceId}
                  layout
                  initial={{ opacity: 0, x: -50, scale: 0.9 }}
                  animate={{ opacity: 1, x: 0, scale: 1 }}
                  exit={{ opacity: 0, x: 50, scale: 0.9 }}
                  transition={{
                    duration: 0.3,
                    delay: index * 0.05,
                    layout: { duration: 0.2 },
                  }}
                  whileHover={{ scale: 1.02, x: 5 }}
                  onClick={() => onTraceClick?.(trace.traceId)}
                  className="relative cursor-pointer"
                >
                  {/* Timeline dot */}
                  <motion.div
                    className={`absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full ${getStatusColor(
                      trace.status
                    )} border-4 border-gray-900 z-10`}
                    animate={{
                      scale: [1, 1.2, 1],
                      boxShadow: [
                        '0 0 0 0 rgba(59, 130, 246, 0.7)',
                        '0 0 0 10px rgba(59, 130, 246, 0)',
                        '0 0 0 0 rgba(59, 130, 246, 0)',
                      ],
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      ease: 'easeInOut',
                    }}
                  />

                  {/* Card */}
                  <div className="ml-16 relative overflow-hidden rounded-xl border border-white/10 backdrop-blur-xl p-4 group">
                    {/* Gradient background */}
                    <div
                      className="absolute inset-0 opacity-10 group-hover:opacity-20 transition-opacity"
                      style={{
                        background: `linear-gradient(135deg, ${gradient[0]} 0%, ${gradient[1]} 100%)`,
                      }}
                    />

                    {/* Shine effect */}
                    <motion.div
                      className="absolute inset-0 opacity-0 group-hover:opacity-100"
                      style={{
                        background:
                          'linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent)',
                      }}
                      animate={{
                        x: ['-100%', '200%'],
                      }}
                      transition={{
                        duration: 1.5,
                        ease: 'linear',
                        repeat: Infinity,
                        repeatDelay: 1,
                      }}
                    />

                    {/* Content */}
                    <div className="relative z-10">
                      <div className="flex items-start justify-between">
                        {/* Left side */}
                        <div className="flex-1 space-y-2">
                          {/* Method and path */}
                          <div className="flex items-center space-x-3">
                            <Badge
                              variant="outline"
                              className="bg-white/5 border-white/20 text-white font-mono"
                            >
                              {trace.method}
                            </Badge>
                            <code className="text-white/90 font-mono text-sm">
                              {trace.path}
                            </code>
                          </div>

                          {/* Metadata */}
                          <div className="flex items-center space-x-4 text-xs text-white/60">
                            <span className="flex items-center space-x-1">
                              <span>🕐</span>
                              <span>
                                {new Date(trace.timestamp).toLocaleTimeString()}
                              </span>
                            </span>
                            <span className="flex items-center space-x-1">
                              <span>📡</span>
                              <span className="capitalize">{trace.source}</span>
                            </span>
                            {trace.spanCount && (
                              <span className="flex items-center space-x-1">
                                <span>🔗</span>
                                <span>{trace.spanCount} spans</span>
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Right side - Status & Duration */}
                        <div className="flex items-center space-x-3">
                          {/* Duration */}
                          <motion.div
                            className={`font-mono text-sm ${getDurationColor(
                              trace.durationMs
                            )}`}
                            animate={{
                              scale: trace.durationMs > 1000 ? [1, 1.1, 1] : 1,
                            }}
                            transition={{
                              duration: 0.5,
                              repeat: trace.durationMs > 1000 ? Infinity : 0,
                            }}
                          >
                            {trace.durationMs}ms
                          </motion.div>

                          {/* Status icon */}
                          <motion.div
                            initial={{ scale: 0, rotate: -180 }}
                            animate={{ scale: 1, rotate: 0 }}
                            transition={{ type: 'spring', stiffness: 200 }}
                          >
                            {getStatusIcon(trace.status, trace.hasErrors)}
                          </motion.div>

                          {/* Status code */}
                          <Badge
                            className={`${
                              trace.status >= 200 && trace.status < 300
                                ? 'bg-green-500/20 text-green-400 border-green-500/30'
                                : trace.status >= 400 && trace.status < 500
                                ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
                                : 'bg-red-500/20 text-red-400 border-red-500/30'
                            } border font-mono`}
                          >
                            {trace.status}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )
            })
          )}
        </AnimatePresence>
      </div>

      {/* Scroll fade effect at bottom */}
      <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-gray-900 to-transparent pointer-events-none" />
    </div>
  )
}
