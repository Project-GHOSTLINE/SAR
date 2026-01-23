'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Area,
  AreaChart
} from 'recharts'
import {
  Users,
  Globe,
  Smartphone,
  Monitor,
  TrendingUp,
  Eye,
  MousePointer,
  Clock,
  Target
} from 'lucide-react'

interface GA4Data {
  summary: {
    totalUsers: number
    newUsers: number
    activeUsers: number
    sessions: number
    pageViews: number
    averageSessionDuration: number
    bounceRate: number
    engagementRate: number
  }
  devices: Array<{ category: string; users: number; percentage: number }>
  browsers: Array<{ name: string; users: number; percentage: number }>
  locations: Array<{ country: string; city: string; users: number }>
  sources: Array<{ source: string; medium: string; users: number; conversions: number }>
  timeSeries: Array<{ date: string; users: number; sessions: number; pageViews: number }>
  realtime: {
    activeUsers: number
    topPages: Array<{ path: string; views: number }>
  }
}

const COLORS = ['#667eea', '#f093fb', '#4facfe', '#43e97b', '#fa709a', '#30cfd0']

export default function GA4Analytics() {
  const [data, setData] = useState<GA4Data | null>(null)
  const [loading, setLoading] = useState(true)
  const [timeRange, setTimeRange] = useState('7daysAgo')

  useEffect(() => {
    fetchGA4Data()
    const interval = setInterval(fetchGA4Data, 30000) // Refresh every 30s
    return () => clearInterval(interval)
  }, [timeRange])

  async function fetchGA4Data() {
    try {
      const res = await fetch(`/api/admin/ga4/enriched?startDate=${timeRange}&endDate=today`)
      if (res.ok) {
        const result = await res.json()
        setData(result)
      } else {
        console.log('GA4 unavailable:', res.status)
        setData(null) // No mock data, just null
      }
      setLoading(false)
    } catch (err) {
      console.error('Failed to fetch GA4 data:', err)
      setData(null)
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <Card className="bg-white/5 border-white/20 backdrop-blur-xl">
        <CardContent className="p-6">
          <div className="text-white/70 text-center">Loading GA4 data...</div>
        </CardContent>
      </Card>
    )
  }

  if (!data) {
    return (
      <Card className="bg-white/5 border-white/20 backdrop-blur-xl">
        <CardContent className="p-6">
          <div className="text-center py-8">
            <div className="text-white text-2xl font-bold mb-2">N/A</div>
            <div className="text-white/70">
              Google Analytics 4 data unavailable
            </div>
            <div className="text-white/50 text-sm mt-2">
              Check GA4 credentials configuration
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Summary KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 rounded-xl bg-gradient-to-br from-purple-500/20 to-purple-600/20 border border-white/10 backdrop-blur-xl"
        >
          <div className="flex items-center space-x-3">
            <Users className="w-8 h-8 text-purple-400" />
            <div>
              <div className="text-white/70 text-sm">Total Users</div>
              <div className="text-white text-2xl font-bold">
                {data.summary.totalUsers.toLocaleString()}
              </div>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="p-4 rounded-xl bg-gradient-to-br from-blue-500/20 to-blue-600/20 border border-white/10 backdrop-blur-xl"
        >
          <div className="flex items-center space-x-3">
            <Eye className="w-8 h-8 text-blue-400" />
            <div>
              <div className="text-white/70 text-sm">Page Views</div>
              <div className="text-white text-2xl font-bold">
                {data.summary.pageViews.toLocaleString()}
              </div>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="p-4 rounded-xl bg-gradient-to-br from-green-500/20 to-green-600/20 border border-white/10 backdrop-blur-xl"
        >
          <div className="flex items-center space-x-3">
            <Target className="w-8 h-8 text-green-400" />
            <div>
              <div className="text-white/70 text-sm">Engagement</div>
              <div className="text-white text-2xl font-bold">
                {(data.summary.engagementRate * 100).toFixed(1)}%
              </div>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="p-4 rounded-xl bg-gradient-to-br from-pink-500/20 to-pink-600/20 border border-white/10 backdrop-blur-xl"
        >
          <div className="flex items-center space-x-3">
            <Clock className="w-8 h-8 text-pink-400" />
            <div>
              <div className="text-white/70 text-sm">Avg Duration</div>
              <div className="text-white text-2xl font-bold">
                {Math.round(data.summary.averageSessionDuration)}s
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Time Series Chart */}
        <Card className="bg-white/5 border-white/20 backdrop-blur-xl">
          <CardHeader>
            <CardTitle className="text-white flex items-center space-x-2">
              <TrendingUp className="w-5 h-5" />
              <span>Traffic Over Time</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={data.timeSeries}>
                <defs>
                  <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#667eea" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#667eea" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorSessions" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f093fb" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#f093fb" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff20" />
                <XAxis dataKey="date" stroke="#ffffff70" />
                <YAxis stroke="#ffffff70" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(0,0,0,0.8)',
                    border: '1px solid rgba(255,255,255,0.2)',
                    borderRadius: '8px',
                    color: '#fff'
                  }}
                />
                <Legend />
                <Area
                  type="monotone"
                  dataKey="users"
                  stroke="#667eea"
                  fillOpacity={1}
                  fill="url(#colorUsers)"
                  name="Users"
                />
                <Area
                  type="monotone"
                  dataKey="sessions"
                  stroke="#f093fb"
                  fillOpacity={1}
                  fill="url(#colorSessions)"
                  name="Sessions"
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Device Breakdown */}
        <Card className="bg-white/5 border-white/20 backdrop-blur-xl">
          <CardHeader>
            <CardTitle className="text-white flex items-center space-x-2">
              <Smartphone className="w-5 h-5" />
              <span>Device Breakdown</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={data.devices}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={(entry: any) => `${entry.category} (${entry.percentage.toFixed(0)}%)`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="users"
                >
                  {data.devices.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(0,0,0,0.8)',
                    border: '1px solid rgba(255,255,255,0.2)',
                    borderRadius: '8px',
                    color: '#fff'
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Top Browsers */}
        <Card className="bg-white/5 border-white/20 backdrop-blur-xl">
          <CardHeader>
            <CardTitle className="text-white flex items-center space-x-2">
              <Monitor className="w-5 h-5" />
              <span>Top Browsers</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={data.browsers.slice(0, 5)}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff20" />
                <XAxis dataKey="name" stroke="#ffffff70" />
                <YAxis stroke="#ffffff70" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(0,0,0,0.8)',
                    border: '1px solid rgba(255,255,255,0.2)',
                    borderRadius: '8px',
                    color: '#fff'
                  }}
                />
                <Bar dataKey="users" fill="#4facfe" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Traffic Sources */}
        <Card className="bg-white/5 border-white/20 backdrop-blur-xl">
          <CardHeader>
            <CardTitle className="text-white flex items-center space-x-2">
              <MousePointer className="w-5 h-5" />
              <span>Traffic Sources</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.sources.slice(0, 5).map((source, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/10"
                >
                  <div className="flex-1">
                    <div className="text-white font-medium">{source.source}</div>
                    <div className="text-white/60 text-sm">{source.medium}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-white font-bold">{source.users}</div>
                    <div className="text-green-400 text-sm">
                      {source.conversions} conv
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Locations */}
      <Card className="bg-white/5 border-white/20 backdrop-blur-xl">
        <CardHeader>
          <CardTitle className="text-white flex items-center space-x-2">
            <Globe className="w-5 h-5" />
            <span>Top Locations</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {data.locations.slice(0, 6).map((location, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.05 }}
                className="p-4 rounded-lg bg-gradient-to-br from-blue-500/10 to-purple-500/10 border border-white/10"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-white font-medium">{location.city}</div>
                    <div className="text-white/60 text-sm">{location.country}</div>
                  </div>
                  <Badge variant="outline" className="bg-white/10 text-white border-white/20">
                    {location.users}
                  </Badge>
                </div>
              </motion.div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Real-time Active Users */}
      {data.realtime && (
        <Card className="bg-gradient-to-br from-green-500/20 to-emerald-500/20 border-green-500/30 backdrop-blur-xl">
          <CardHeader>
            <CardTitle className="text-white flex items-center space-x-2">
              <div className="relative">
                <Users className="w-5 h-5" />
                <motion.div
                  className="absolute -top-1 -right-1 w-2 h-2 bg-green-400 rounded-full"
                  animate={{ scale: [1, 1.5, 1], opacity: [1, 0.5, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                />
              </div>
              <span>Live Right Now</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-6">
              <div>
                <div className="text-white/70 text-sm">Active Users</div>
                <div className="text-white text-4xl font-bold">
                  {data.realtime.activeUsers}
                </div>
              </div>
              <div className="flex-1">
                <div className="text-white/70 text-sm mb-2">Top Pages</div>
                <div className="space-y-1">
                  {data.realtime.topPages.slice(0, 3).map((page, index) => (
                    <div key={index} className="flex items-center justify-between text-sm">
                      <code className="text-white/80">{page.path}</code>
                      <Badge variant="outline" className="bg-white/10 text-white border-white/20">
                        {page.views}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
