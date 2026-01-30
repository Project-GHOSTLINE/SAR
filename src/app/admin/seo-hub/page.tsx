'use client'

import { useRouter } from 'next/navigation'
import AdminNav from '@/components/admin/AdminNav'
import {
  TrendingUp,
  BarChart3,
  Activity,
  Globe,
  Zap,
  Eye,
  Database,
  Gauge,
  Search,
  LineChart,
  Shield,
  Users,
  MapPin,
  ChevronRight
} from 'lucide-react'

interface SeoPage {
  id: string
  name: string
  description: string
  href: string
  icon: any
  badge?: string
  stats?: {
    label: string
    value: string
  }[]
  color: string
}

export default function SeoHubPage() {
  const router = useRouter()

  const seoPages: SeoPage[] = [
    {
      id: 'overview',
      name: 'SEO Overview',
      description: 'Vue d\'ensemble consolidée: GA4, GSC, Semrush, Speed Insights. KPIs globaux et timeline.',
      href: '/admin/seo',
      icon: TrendingUp,
      badge: 'Principal',
      stats: [
        { label: 'Sources', value: '4+' },
        { label: 'KPIs', value: '12+' }
      ],
      color: 'blue'
    },
    {
      id: 'analytics',
      name: 'SEO Analytics',
      description: 'Analytics détaillées avec segments avancés, cohorts, et analyses approfondies.',
      href: '/admin/seo/analytics',
      icon: BarChart3,
      stats: [
        { label: 'Segments', value: 'Multi' },
        { label: 'Cohorts', value: 'Oui' }
      ],
      color: 'purple'
    },
    {
      id: 'command-center',
      name: 'Command Center',
      description: 'NSA-style telemetry dashboard. Monitoring en temps réel des requêtes, spans, alertes.',
      href: '/admin/seo/command-center',
      icon: Activity,
      badge: 'Real-time',
      stats: [
        { label: 'Tables', value: '4' },
        { label: 'Refresh', value: '5s' }
      ],
      color: 'red'
    },
    {
      id: 'ip-explorer',
      name: 'IP Explorer',
      description: 'Recherche et analyse d\'IPs. Dossier complet par IP avec timeline, metrics, device detection.',
      href: '/admin/seo/ip-explorer',
      icon: MapPin,
      stats: [
        { label: 'IPs trackées', value: '1000+' },
        { label: 'Metrics', value: '20+' }
      ],
      color: 'green'
    },
    {
      id: 'fraud-detection',
      name: 'Fraud Detection',
      description: 'Détection de fraude en temps réel. Correlation scoring, device profiles, bot detection.',
      href: '/admin/seo/fraud',
      icon: Shield,
      badge: 'NSA',
      stats: [
        { label: 'Accuracy', value: '94%' },
        { label: 'Bots', value: '18' }
      ],
      color: 'orange'
    },
    {
      id: 'network-graph',
      name: 'Network Graph',
      description: 'Visualisation des relations: IP ↔ sessions ↔ users ↔ clients. Identity graph.',
      href: '/admin/seo/network',
      icon: Users,
      stats: [
        { label: 'Nodes', value: '5000+' },
        { label: 'Links', value: '10K+' }
      ],
      color: 'indigo'
    },
    {
      id: 'performance',
      name: 'Performance Monitor',
      description: 'Speed Insights détaillés par page, device, date. LCP, INP, CLS, TTFB metrics.',
      href: '/admin/seo/performance',
      icon: Zap,
      stats: [
        { label: 'Pages', value: '50+' },
        { label: 'Devices', value: '3' }
      ],
      color: 'yellow'
    },
    {
      id: 'gsc',
      name: 'Google Search Console',
      description: 'GSC détaillé: Top queries, top pages, CTR, position moyenne, impressions.',
      href: '/admin/seo/gsc',
      icon: Search,
      stats: [
        { label: 'Queries', value: '500+' },
        { label: 'Pages', value: '100+' }
      ],
      color: 'teal'
    },
    {
      id: 'ga4',
      name: 'Google Analytics 4',
      description: 'GA4 enriched: Sessions, events, conversions, engagement rate, bounce rate.',
      href: '/admin/seo/ga4',
      icon: LineChart,
      stats: [
        { label: 'Sessions', value: '10K+' },
        { label: 'Events', value: '50K+' }
      ],
      color: 'pink'
    },
    {
      id: 'semrush',
      name: 'Semrush',
      description: 'Semrush data: Keywords, traffic, rank, authority, backlinks.',
      href: '/admin/seo/semrush',
      icon: Globe,
      stats: [
        { label: 'Keywords', value: '1000+' },
        { label: 'Backlinks', value: '500+' }
      ],
      color: 'cyan'
    },
    {
      id: 'data-explorer',
      name: 'Data Explorer',
      description: 'Metric Inspector + Database Explorer. 115 tables, 1.3M+ lignes.',
      href: '/admin/data-explorer',
      icon: Database,
      badge: '94%',
      stats: [
        { label: 'Tables', value: '115' },
        { label: 'Rows', value: '1.3M' }
      ],
      color: 'slate'
    },
    {
      id: 'realtime',
      name: 'Real-time Monitor',
      description: 'Monitoring en temps réel des visites, événements, conversions.',
      href: '/admin/seo/realtime',
      icon: Eye,
      badge: 'Live',
      stats: [
        { label: 'Update', value: '1s' },
        { label: 'Active', value: 'Now' }
      ],
      color: 'emerald'
    }
  ]

  const getColorClasses = (color: string) => {
    const colors: Record<string, { bg: string, border: string, badge: string, icon: string, hover: string }> = {
      blue: {
        bg: 'bg-blue-50',
        border: 'border-blue-200',
        badge: 'bg-blue-100 text-blue-700',
        icon: 'text-blue-600',
        hover: 'hover:border-blue-300 hover:bg-blue-100'
      },
      purple: {
        bg: 'bg-purple-50',
        border: 'border-purple-200',
        badge: 'bg-purple-100 text-purple-700',
        icon: 'text-purple-600',
        hover: 'hover:border-purple-300 hover:bg-purple-100'
      },
      red: {
        bg: 'bg-red-50',
        border: 'border-red-200',
        badge: 'bg-red-100 text-red-700',
        icon: 'text-red-600',
        hover: 'hover:border-red-300 hover:bg-red-100'
      },
      green: {
        bg: 'bg-green-50',
        border: 'border-green-200',
        badge: 'bg-green-100 text-green-700',
        icon: 'text-green-600',
        hover: 'hover:border-green-300 hover:bg-green-100'
      },
      orange: {
        bg: 'bg-orange-50',
        border: 'border-orange-200',
        badge: 'bg-orange-100 text-orange-700',
        icon: 'text-orange-600',
        hover: 'hover:border-orange-300 hover:bg-orange-100'
      },
      indigo: {
        bg: 'bg-indigo-50',
        border: 'border-indigo-200',
        badge: 'bg-indigo-100 text-indigo-700',
        icon: 'text-indigo-600',
        hover: 'hover:border-indigo-300 hover:bg-indigo-100'
      },
      yellow: {
        bg: 'bg-yellow-50',
        border: 'border-yellow-200',
        badge: 'bg-yellow-100 text-yellow-700',
        icon: 'text-yellow-600',
        hover: 'hover:border-yellow-300 hover:bg-yellow-100'
      },
      teal: {
        bg: 'bg-teal-50',
        border: 'border-teal-200',
        badge: 'bg-teal-100 text-teal-700',
        icon: 'text-teal-600',
        hover: 'hover:border-teal-300 hover:bg-teal-100'
      },
      pink: {
        bg: 'bg-pink-50',
        border: 'border-pink-200',
        badge: 'bg-pink-100 text-pink-700',
        icon: 'text-pink-600',
        hover: 'hover:border-pink-300 hover:bg-pink-100'
      },
      cyan: {
        bg: 'bg-cyan-50',
        border: 'border-cyan-200',
        badge: 'bg-cyan-100 text-cyan-700',
        icon: 'text-cyan-600',
        hover: 'hover:border-cyan-300 hover:bg-cyan-100'
      },
      slate: {
        bg: 'bg-slate-50',
        border: 'border-slate-200',
        badge: 'bg-slate-100 text-slate-700',
        icon: 'text-slate-600',
        hover: 'hover:border-slate-300 hover:bg-slate-100'
      },
      emerald: {
        bg: 'bg-emerald-50',
        border: 'border-emerald-200',
        badge: 'bg-emerald-100 text-emerald-700',
        icon: 'text-emerald-600',
        hover: 'hover:border-emerald-300 hover:bg-emerald-100'
      }
    }
    return colors[color] || colors.blue
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50">
      <AdminNav currentPage="/admin/seo-hub" />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-3 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl shadow-lg">
              <TrendingUp className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">SEO & Analytics Hub</h1>
              <p className="text-gray-600 mt-1">Centre de contrôle SEO - Toutes les pages et outils disponibles</p>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-4 gap-4 mt-6">
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="text-sm text-gray-600">Total Pages</div>
              <div className="text-2xl font-bold text-gray-900 mt-1">{seoPages.length}</div>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="text-sm text-gray-600">Data Sources</div>
              <div className="text-2xl font-bold text-gray-900 mt-1">7+</div>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="text-sm text-gray-600">Real-time</div>
              <div className="text-2xl font-bold text-green-600 mt-1">Active</div>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="text-sm text-gray-600">Status</div>
              <div className="text-2xl font-bold text-blue-600 mt-1">✓ Live</div>
            </div>
          </div>
        </div>

        {/* SEO Pages Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {seoPages.map((page) => {
            const Icon = page.icon
            const colors = getColorClasses(page.color)

            return (
              <button
                key={page.id}
                onClick={() => router.push(page.href)}
                className={`
                  relative group text-left
                  bg-white rounded-xl border-2 ${colors.border}
                  p-6 transition-all duration-200
                  ${colors.hover}
                  shadow-sm hover:shadow-md
                `}
              >
                {/* Badge */}
                {page.badge && (
                  <div className="absolute top-4 right-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${colors.badge}`}>
                      {page.badge}
                    </span>
                  </div>
                )}

                {/* Icon */}
                <div className={`inline-flex p-3 rounded-xl ${colors.bg} mb-4`}>
                  <Icon className={`w-6 h-6 ${colors.icon}`} />
                </div>

                {/* Title */}
                <h3 className="text-lg font-bold text-gray-900 mb-2 flex items-center gap-2">
                  {page.name}
                  <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-gray-600 group-hover:translate-x-1 transition-all" />
                </h3>

                {/* Description */}
                <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                  {page.description}
                </p>

                {/* Stats */}
                {page.stats && (
                  <div className="flex gap-4 text-xs">
                    {page.stats.map((stat, i) => (
                      <div key={i} className={`flex items-center gap-1 ${colors.badge} px-2 py-1 rounded`}>
                        <span className="font-medium">{stat.label}:</span>
                        <span className="font-bold">{stat.value}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Hover indicator */}
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-gray-300 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>
            )
          })}
        </div>

        {/* Footer Info */}
        <div className="mt-12 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-white rounded-lg border border-gray-200 text-sm text-gray-600">
            <Gauge className="w-4 h-4 text-blue-500" />
            <span>Toutes les pages sont opérationnelles et à jour</span>
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
          </div>
        </div>
      </main>
    </div>
  )
}
