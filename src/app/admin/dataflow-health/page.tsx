/**
 * DATAFLOW HEALTH DASHBOARD
 *
 * Observabilité end-to-end pour SAR
 * - KPIs real-time
 * - Timeline des traces
 * - Security checks
 * - Alertes
 * - Cross-référence GA4 + Vercel + Telemetry
 */

'use client'

import { useState, useEffect } from 'react'
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
  Filter,
  RefreshCw,
  TrendingUp,
  XCircle,
  Zap
} from 'lucide-react'

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
    } catch (err) {
      console.error('Failed to fetch dashboard data:', err)
      setLoading(false)
    }
  }

  function getStatusColor(status: number): string {
    if (status >= 200 && status < 300) return 'text-green-600'
    if (status >= 400 && status < 500) return 'text-yellow-600'
    return 'text-red-600'
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
      <div className="flex items-center justify-center h-screen">
        <div className="flex items-center space-x-2">
          <RefreshCw className="animate-spin" />
          <span>Chargement...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">🔍 Santé du Dataflow</h1>
          <p className="text-gray-500">Observabilité end-to-end</p>
        </div>
        <div className="flex items-center space-x-2">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-32">
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
          <Button onClick={fetchDashboardData} variant="outline" size="sm">
            <RefreshCw className="w-4 h-4 mr-2" />
            Actualiser
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              Req/min
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpis?.requestsPerMinute?.toFixed(1) || '0'}</div>
            <p className="text-xs text-gray-500 flex items-center mt-1">
              <Activity className="w-3 h-3 mr-1" />
              Temps réel
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              Taux d'erreur
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${(kpis?.errorRate || 0) > 5 ? 'text-red-600' : 'text-green-600'}`}>
              {kpis?.errorRate?.toFixed(1) || '0'}%
            </div>
            <p className="text-xs text-gray-500 flex items-center mt-1">
              {(kpis?.errorRate || 0) > 5 ? (
                <><XCircle className="w-3 h-3 mr-1 text-red-500" /> Élevé</>
              ) : (
                <><CheckCircle className="w-3 h-3 mr-1 text-green-500" /> Normal</>
              )}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              P95 Latence
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpis?.p95Latency?.toFixed(0) || '0'}ms</div>
            <p className="text-xs text-gray-500 flex items-center mt-1">
              <Clock className="w-3 h-3 mr-1" />
              Percentile 95
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              Webhooks
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${(kpis?.webhookSuccessRate || 0) < 95 ? 'text-yellow-600' : 'text-green-600'}`}>
              {kpis?.webhookSuccessRate?.toFixed(1) || '0'}%
            </div>
            <p className="text-xs text-gray-500 flex items-center mt-1">
              <Zap className="w-3 h-3 mr-1" />
              Succès
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              DB P95
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpis?.dbLatencyP95?.toFixed(0) || '0'}ms</div>
            <p className="text-xs text-gray-500 flex items-center mt-1">
              <Database className="w-3 h-3 mr-1" />
              Supabase
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              APIs Externes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${(kpis?.externalErrorRate || 0) > 5 ? 'text-red-600' : 'text-green-600'}`}>
              {kpis?.externalErrorRate?.toFixed(1) || '0'}%
            </div>
            <p className="text-xs text-gray-500 flex items-center mt-1">
              <ExternalLink className="w-3 h-3 mr-1" />
              Erreurs
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="traces" className="space-y-4">
        <TabsList>
          <TabsTrigger value="traces">Timeline</TabsTrigger>
          <TabsTrigger value="alerts">
            Alertes {alerts.length > 0 && (
              <Badge variant="destructive" className="ml-2">{alerts.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="security">Sécurité</TabsTrigger>
          <TabsTrigger value="analytics">Analytics Cross-Ref</TabsTrigger>
        </TabsList>

        {/* Timeline Tab */}
        <TabsContent value="traces" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Timeline des Traces</CardTitle>
                <Select value={sourceFilter} onValueChange={setSourceFilter}>
                  <SelectTrigger className="w-40">
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
              <div className="space-y-2">
                {traces.length === 0 ? (
                  <p className="text-center text-gray-500 py-8">Aucune trace trouvée</p>
                ) : (
                  traces.map((trace) => (
                    <div
                      key={trace.traceId}
                      onClick={() => setSelectedTrace(trace.traceId)}
                      className="p-4 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div className={`w-2 h-2 rounded-full ${trace.hasErrors ? 'bg-red-500' : trace.status >= 400 ? 'bg-yellow-500' : 'bg-green-500'}`} />
                          <div>
                            <div className="font-mono text-sm">{trace.method} {trace.path}</div>
                            <div className="text-xs text-gray-500">
                              {new Date(trace.timestamp).toLocaleTimeString()} • {trace.source} • {trace.spanCount} spans
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-4">
                          <Badge variant="outline">{trace.durationMs}ms</Badge>
                          <Badge className={getStatusColor(trace.status)}>{trace.status}</Badge>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Alerts Tab */}
        <TabsContent value="alerts" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Alertes Actives</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {alerts.length === 0 ? (
                  <div className="text-center py-8">
                    <CheckCircle className="w-12 h-12 mx-auto text-green-500 mb-2" />
                    <p className="text-gray-500">Aucune alerte active</p>
                  </div>
                ) : (
                  alerts.map((alert) => (
                    <div key={alert.id} className="p-4 border rounded-lg">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-2">
                            <Badge className={getSeverityColor(alert.severity)}>
                              {alert.severity.toUpperCase()}
                            </Badge>
                            <span className="font-semibold">{alert.summary}</span>
                          </div>
                          <div className="text-sm text-gray-500">
                            {alert.occurrenceCount} occurrences •
                            Première: {new Date(alert.firstSeenAt).toLocaleString()} •
                            Dernière: {new Date(alert.lastSeenAt).toLocaleString()}
                          </div>
                        </div>
                        <Button size="sm" variant="outline">
                          Acquitter
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security Tab */}
        <TabsContent value="security" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Checks de Sécurité</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-500">Vérifications de sécurité des webhooks et APIs...</p>
              {/* TODO: Implémenter */}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Analytics Cross-Reference (GA4 + Vercel + Telemetry)</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-500">Corrélation des données GA4, Vercel Analytics et Telemetry interne...</p>
              {/* TODO: Implémenter */}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Trace Detail Modal (TODO) */}
      {selectedTrace && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4">
          <Card className="w-full max-w-4xl max-h-[80vh] overflow-auto">
            <CardHeader>
              <CardTitle>Trace Details: {selectedTrace}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-500">Timeline détaillé du trace...</p>
              <Button onClick={() => setSelectedTrace(null)} className="mt-4">
                Fermer
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
