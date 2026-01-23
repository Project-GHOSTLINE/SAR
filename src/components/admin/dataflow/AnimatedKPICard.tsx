'use client'

import { motion, useAnimation } from 'framer-motion'
import { useEffect } from 'react'
import { LucideIcon } from 'lucide-react'

interface AnimatedKPICardProps {
  title: string
  value: string | number
  subtitle: string
  icon: LucideIcon
  gradient: [string, string]
  trend?: 'up' | 'down' | 'neutral'
  isAlert?: boolean
  delay?: number
}

export default function AnimatedKPICard({
  title,
  value,
  subtitle,
  icon: Icon,
  gradient,
  trend = 'neutral',
  isAlert = false,
  delay = 0,
}: AnimatedKPICardProps) {
  const controls = useAnimation()

  useEffect(() => {
    controls.start({
      scale: [1, 1.02, 1],
      transition: { duration: 2, repeat: Infinity, ease: 'easeInOut' },
    })
  }, [controls])

  // Pulse animation for alerts
  useEffect(() => {
    if (isAlert) {
      controls.start({
        scale: [1, 1.05, 1],
        transition: { duration: 0.8, repeat: Infinity, ease: 'easeInOut' },
      })
    }
  }, [isAlert, controls])

  const getTrendColor = () => {
    if (trend === 'up') return 'text-green-400'
    if (trend === 'down') return 'text-red-400'
    return 'text-gray-400'
  }

  const getTrendIcon = () => {
    if (trend === 'up') return '↗'
    if (trend === 'down') return '↘'
    return '→'
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
      whileHover={{ scale: 1.03, transition: { duration: 0.2 } }}
      className="relative group"
    >
      {/* Glassmorphism card */}
      <div
        className="relative overflow-hidden rounded-2xl p-6 backdrop-blur-xl border border-white/20 shadow-2xl"
        style={{
          background: `linear-gradient(135deg, ${gradient[0]} 0%, ${gradient[1]} 100%)`,
        }}
      >
        {/* Animated background gradient */}
        <motion.div
          className="absolute inset-0 opacity-0 group-hover:opacity-20"
          animate={{
            background: [
              `radial-gradient(circle at 0% 0%, ${gradient[0]} 0%, transparent 50%)`,
              `radial-gradient(circle at 100% 100%, ${gradient[1]} 0%, transparent 50%)`,
              `radial-gradient(circle at 0% 0%, ${gradient[0]} 0%, transparent 50%)`,
            ],
          }}
          transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
        />

        {/* Content */}
        <div className="relative z-10">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="text-white/70 text-sm font-medium uppercase tracking-wide">
              {title}
            </div>
            <motion.div
              animate={{
                rotate: [0, 10, -10, 0],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
            >
              <Icon className="w-5 h-5 text-white/50" />
            </motion.div>
          </div>

          {/* Value */}
          <motion.div
            className="text-white font-bold mb-2"
            style={{ fontSize: '2rem' }}
            animate={{
              textShadow: [
                '0 0 10px rgba(255, 255, 255, 0.5)',
                '0 0 20px rgba(255, 255, 255, 0.8)',
                '0 0 10px rgba(255, 255, 255, 0.5)',
              ],
            }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          >
            {value}
          </motion.div>

          {/* Subtitle with trend */}
          <div className="flex items-center space-x-2">
            <span className="text-white/70 text-sm">{subtitle}</span>
            <span className={`text-lg ${getTrendColor()}`}>{getTrendIcon()}</span>
          </div>
        </div>

        {/* Alert indicator */}
        {isAlert && (
          <motion.div
            className="absolute top-2 right-2 w-3 h-3 bg-red-500 rounded-full"
            animate={{
              scale: [1, 1.5, 1],
              opacity: [1, 0.5, 1],
            }}
            transition={{ duration: 1, repeat: Infinity, ease: 'easeInOut' }}
          />
        )}

        {/* Shine effect on hover */}
        <motion.div
          className="absolute inset-0 opacity-0 group-hover:opacity-100"
          style={{
            background:
              'linear-gradient(45deg, transparent 30%, rgba(255, 255, 255, 0.1) 50%, transparent 70%)',
            backgroundSize: '200% 200%',
          }}
          animate={{
            backgroundPosition: ['200% 0', '-200% 0'],
          }}
          transition={{ duration: 1.5, ease: 'linear' }}
        />
      </div>

      {/* Glow effect */}
      <motion.div
        className="absolute inset-0 -z-10 rounded-2xl opacity-0 group-hover:opacity-50 blur-xl"
        style={{
          background: `linear-gradient(135deg, ${gradient[0]} 0%, ${gradient[1]} 100%)`,
        }}
        animate={{
          scale: [1, 1.1, 1],
        }}
        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
      />
    </motion.div>
  )
}
