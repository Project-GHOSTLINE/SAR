/**
 * ANIMATED DATAFLOW HEALTH DASHBOARD
 *
 * Observabilité moderne avec animations fluides
 * - Flow diagram animé avec particules
 * - KPIs avec glassmorphism et gradients
 * - Timeline en temps réel avec effets
 * - Alertes animées
 */

'use client'

import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import AdminNav from '@/components/admin/AdminNav'

// Dynamic imports with SSR disabled for React Flow and animations
const AnimatedDataflowDiagram = dynamic(
  () => import('@/components/admin/dataflow/AnimatedDataflowDiagram'),
  { ssr: false }
)
const AnimatedKPICard = dynamic(
  () => import('@/components/admin/dataflow/AnimatedKPICard'),
  { ssr: false }
)
const LiveStreamTimeline = dynamic(
  () => import('@/components/admin/dataflow/LiveStreamTimeline'),
  { ssr: false }
)
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Activity,
  AlertTriangle,
  CheckCircle,
  Clock,
  Database,
  ExternalLink,
  RefreshCw,
  TrendingUp,
  XCircle,
  Zap
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

interface KPIData {
  requestsPerMinute: number
  errorRate: number
  p95Latency: number
  webhookSuccessRate: number
  dbLatencyP95: number
  externalErrorRate: number
}

interface TraceItem {
  traceId: string
  timestamp: string
  method: string
  path: string
  status: number
  durationMs: number
  source: string
  spanCount: number
  hasErrors: boolean
}

interface Alert {
  id: string
  alertKey: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  summary: string
  occurrenceCount: number
  firstSeenAt: string
  lastSeenAt: string
}

export default function DataflowHealthPage() {
  const [kpis, setKpis] = useState<KPIData | null>(null)
  const [traces, setTraces] = useState<TraceItem[]>([])
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [loading, setLoading] = useState(true)
  const [timeRange, setTimeRange] = useState('1h')
  const [sourceFilter, setSourceFilter] = useState('all')
  const [selectedTrace, setSelectedTrace] = useState<string | null>(null)
  const [isRefreshing, setIsRefreshing] = useState(false)

  // Auto-refresh every 10 seconds
  useEffect(() => {
    fetchDashboardData()

    const interval = setInterval(() => {
      fetchDashboardData()
    }, 10000)

    return () => clearInterval(interval)
  }, [timeRange, sourceFilter])

  async function fetchDashboardData() {
    try {
      setIsRefreshing(true)

      // Fetch KPIs
      const kpiRes = await fetch(`/api/admin/dataflow-health/kpis?timeRange=${timeRange}`)
      const kpiData = await kpiRes.json()
      setKpis(kpiData)

      // Fetch traces
      const tracesRes = await fetch(
        `/api/admin/dataflow-health/traces?timeRange=${timeRange}&source=${sourceFilter}&limit=50`
      )
      const tracesData = await tracesRes.json()
      setTraces(tracesData.traces || [])

      // Fetch alerts
      const alertsRes = await fetch(`/api/admin/dataflow-health/alerts?state=open`)
      const alertsData = await alertsRes.json()
      setAlerts(alertsData.alerts || [])

      setLoading(false)
      setIsRefreshing(false)
    } catch (err) {
      console.error('Failed to fetch dashboard data:', err)
      setLoading(false)
      setIsRefreshing(false)
    }
  }

  function getSeverityColor(severity: string): string {
    switch (severity) {
      case 'low': return 'bg-blue-100 text-blue-800'
      case 'medium': return 'bg-yellow-100 text-yellow-800'
      case 'high': return 'bg-orange-100 text-orange-800'
      case 'critical': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  if (loading) {
    return (
      <>
        <AdminNav currentPage="dataflow-health" />
        <div className="min-h-screen flex items-center justify-center"
          style={{
            background: 'linear-gradient(135deg, #0f0f1e 0%, #1a1a2e 50%, #16213e 100%)',
          }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center space-y-4"
          >
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
            >
              <RefreshCw className="w-12 h-12 text-blue-500" />
            </motion.div>
            <span className="text-white/70 text-lg">Chargement du dashboard...</span>
          </motion.div>
        </div>
      </>
    )
  }

  return (
    <>
      <AdminNav currentPage="dataflow-health" />
      <div
        className="min-h-screen p-6 space-y-6"
        style={{
          background: 'linear-gradient(135deg, #0f0f1e 0%, #1a1a2e 50%, #16213e 100%)',
        }}
      >
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex justify-between items-center"
        >
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 bg-clip-text text-transparent">
              🔍 Santé du Dataflow
            </h1>
            <p className="text-white/60 mt-2">Observabilité end-to-end avec animations en temps réel</p>
          </div>
          <div className="flex items-center space-x-2">
            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger className="w-32 bg-white/5 border-white/20 text-white backdrop-blur-xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="5m">5 minutes</SelectItem>
                <SelectItem value="15m">15 minutes</SelectItem>
                <SelectItem value="1h">1 heure</SelectItem>
                <SelectItem value="24h">24 heures</SelectItem>
                <SelectItem value="7d">7 jours</SelectItem>
              </SelectContent>
            </Select>
            <Button
              onClick={fetchDashboardData}
              variant="outline"
              size="sm"
              className="bg-white/5 border-white/20 text-white backdrop-blur-xl hover:bg-white/10"
            >
              <motion.div
                animate={isRefreshing ? { rotate: 360 } : {}}
                transition={{ duration: 1, repeat: isRefreshing ? Infinity : 0, ease: 'linear' }}
              >
                <RefreshCw className="w-4 h-4 mr-2" />
              </motion.div>
              Actualiser
            </Button>
          </div>
        </motion.div>

        {/* Animated Flow Diagram */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
        >
          <AnimatedDataflowDiagram
            stats={{
              browserRequests: kpis?.requestsPerMinute || 0,
              middlewareProcessed: kpis?.requestsPerMinute || 0,
              apiCalls: kpis?.requestsPerMinute || 0,
              dbWrites: kpis?.requestsPerMinute || 0,
            }}
            realtimeRequests={traces.slice(0, 5).map(t => ({
              id: t.traceId,
              timestamp: t.timestamp,
              path: t.path,
              status: t.status,
            }))}
          />
        </motion.div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          <AnimatedKPICard
            title="Req/min"
            value={kpis?.requestsPerMinute?.toFixed(1) || '0'}
            subtitle="Temps réel"
            icon={Activity}
            gradient={['#667eea', '#764ba2']}
            trend="up"
            delay={0}
          />
          <AnimatedKPICard
            title="Erreurs"
            value={`${kpis?.errorRate?.toFixed(1) || '0'}%`}
            subtitle="Taux d'erreur"
            icon={XCircle}
            gradient={['#f093fb', '#f5576c']}
            trend={(kpis?.errorRate || 0) > 5 ? 'up' : 'down'}
            isAlert={(kpis?.errorRate || 0) > 5}
            delay={0.05}
          />
          <AnimatedKPICard
            title="P95 Latence"
            value={`${kpis?.p95Latency?.toFixed(0) || '0'}ms`}
            subtitle="Percentile 95"
            icon={Clock}
            gradient={['#4facfe', '#00f2fe']}
            trend="neutral"
            delay={0.1}
          />
          <AnimatedKPICard
            title="Webhooks"
            value={`${kpis?.webhookSuccessRate?.toFixed(1) || '0'}%`}
            subtitle="Succès"
            icon={Zap}
            gradient={['#43e97b', '#38f9d7']}
            trend={(kpis?.webhookSuccessRate || 0) >= 95 ? 'up' : 'down'}
            delay={0.15}
          />
          <AnimatedKPICard
            title="DB P95"
            value={`${kpis?.dbLatencyP95?.toFixed(0) || '0'}ms`}
            subtitle="Supabase"
            icon={Database}
            gradient={['#fa709a', '#fee140']}
            trend="neutral"
            delay={0.2}
          />
          <AnimatedKPICard
            title="APIs Externes"
            value={`${kpis?.externalErrorRate?.toFixed(1) || '0'}%`}
            subtitle="Erreurs"
            icon={ExternalLink}
            gradient={['#30cfd0', '#330867']}
            trend={(kpis?.externalErrorRate || 0) > 5 ? 'up' : 'down'}
            isAlert={(kpis?.externalErrorRate || 0) > 5}
            delay={0.25}
          />
        </div>

        {/* Tabs */}
        <Tabs defaultValue="traces" className="space-y-4">
          <TabsList className="bg-white/5 border border-white/20 backdrop-blur-xl">
            <TabsTrigger value="traces" className="data-[state=active]:bg-white/10">
              Timeline
            </TabsTrigger>
            <TabsTrigger value="alerts" className="data-[state=active]:bg-white/10">
              Alertes {alerts.length > 0 && (
                <Badge variant="destructive" className="ml-2">{alerts.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="security" className="data-[state=active]:bg-white/10">
              Sécurité
            </TabsTrigger>
            <TabsTrigger value="analytics" className="data-[state=active]:bg-white/10">
              Analytics
            </TabsTrigger>
          </TabsList>

          {/* Timeline Tab */}
          <TabsContent value="traces" className="space-y-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Card className="bg-white/5 border-white/20 backdrop-blur-xl">
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <CardTitle className="text-white">Timeline des Traces</CardTitle>
                    <Select value={sourceFilter} onValueChange={setSourceFilter}>
                      <SelectTrigger className="w-40 bg-white/5 border-white/20 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Toutes sources</SelectItem>
                        <SelectItem value="web">Web</SelectItem>
                        <SelectItem value="webhook">Webhook</SelectItem>
                        <SelectItem value="cron">Cron</SelectItem>
                        <SelectItem value="internal">Interne</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardHeader>
                <CardContent>
                  <LiveStreamTimeline
                    traces={traces}
                    onTraceClick={setSelectedTrace}
                  />
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>

          {/* Alerts Tab */}
          <TabsContent value="alerts" className="space-y-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Card className="bg-white/5 border-white/20 backdrop-blur-xl">
                <CardHeader>
                  <CardTitle className="text-white">Alertes Actives</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <AnimatePresence mode="popLayout">
                      {alerts.length === 0 ? (
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className="text-center py-8"
                        >
                          <CheckCircle className="w-12 h-12 mx-auto text-green-500 mb-2" />
                          <p className="text-white/70">Aucune alerte active</p>
                        </motion.div>
                      ) : (
                        alerts.map((alert, index) => (
                          <motion.div
                            key={alert.id}
                            layout
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 20 }}
                            transition={{ delay: index * 0.05 }}
                            className="p-4 border border-white/10 rounded-lg bg-white/5 backdrop-blur-xl"
                          >
                            <div className="flex justify-between items-start">
                              <div className="flex-1">
                                <div className="flex items-center space-x-2 mb-2">
                                  <Badge className={getSeverityColor(alert.severity)}>
                                    {alert.severity.toUpperCase()}
                                  </Badge>
                                  <span className="font-semibold text-white">{alert.summary}</span>
                                </div>
                                <div className="text-sm text-white/60">
                                  {alert.occurrenceCount} occurrences •
                                  Première: {new Date(alert.firstSeenAt).toLocaleString()} •
                                  Dernière: {new Date(alert.lastSeenAt).toLocaleString()}
                                </div>
                              </div>
                              <Button
                                size="sm"
                                variant="outline"
                                className="bg-white/5 border-white/20 text-white hover:bg-white/10"
                              >
                                Acquitter
                              </Button>
                            </div>
                          </motion.div>
                        ))
                      )}
                    </AnimatePresence>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>

          {/* Security Tab */}
          <TabsContent value="security" className="space-y-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Card className="bg-white/5 border-white/20 backdrop-blur-xl">
                <CardHeader>
                  <CardTitle className="text-white">Checks de Sécurité</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-white/70">Vérifications de sécurité des webhooks et APIs...</p>
                  {/* TODO: Implémenter */}
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics" className="space-y-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Card className="bg-white/5 border-white/20 backdrop-blur-xl">
                <CardHeader>
                  <CardTitle className="text-white">Analytics Cross-Reference</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-white/70">Corrélation GA4, Vercel Analytics et Telemetry interne...</p>
                  {/* TODO: Implémenter */}
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>
        </Tabs>

        {/* Trace Detail Modal */}
        <AnimatePresence>
          {selectedTrace && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50"
              onClick={() => setSelectedTrace(null)}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-4xl max-h-[80vh] overflow-auto"
              >
                <Card className="bg-gray-900/95 border-white/20 backdrop-blur-xl">
                  <CardHeader>
                    <CardTitle className="text-white">Trace Details: {selectedTrace}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-white/70 mb-4">Timeline détaillé du trace...</p>
                    <Button
                      onClick={() => setSelectedTrace(null)}
                      className="bg-white/10 hover:bg-white/20 text-white"
                    >
                      Fermer
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  )
}
