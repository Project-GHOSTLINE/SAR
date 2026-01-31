'use client';

import { Activity, Zap, Eye, Network, Shield, Smartphone, GitBranch, LineChart, Route, Radio, FileText, Database, AlertTriangle, Wifi, TrendingUp, Globe, Layers } from 'lucide-react';
import AdminNav from '@/components/admin/AdminNav';
import { useRouter } from 'next/navigation';

interface DataflowEndpoint {
  id: string;
  title: string;
  description: string;
  icon: any;
  path: string;
  color: string;
  category: string;
}

export default function DataflowHubPage() {
  const router = useRouter();

  const endpoints: DataflowEndpoint[] = [
    // System Health & Monitoring
    {
      id: '1',
      title: 'Dataflow Health',
      description: 'Vue d\'ensemble de la santé du système de flux de données',
      icon: Activity,
      path: '/admin/dataflow-health',
      color: 'blue',
      category: 'System Health'
    },
    {
      id: '2',
      title: 'KPIs',
      description: 'Indicateurs clés de performance en temps réel',
      icon: TrendingUp,
      path: '/admin/dataflow/kpis',
      color: 'green',
      category: 'System Health'
    },
    {
      id: '3',
      title: 'Traces',
      description: 'Traçage distribué des requêtes et transactions',
      icon: GitBranch,
      path: '/admin/dataflow/traces',
      color: 'purple',
      category: 'System Health'
    },
    {
      id: '4',
      title: 'Alerts',
      description: 'Alertes système et notifications critiques',
      icon: AlertTriangle,
      path: '/admin/dataflow/alerts',
      color: 'red',
      category: 'System Health'
    },

    // Telemetry & Debugging
    {
      id: '5',
      title: 'Telemetry Debug',
      description: 'Outils de débogage pour la télémétrie',
      icon: Database,
      path: '/admin/dataflow/telemetry-debug',
      color: 'indigo',
      category: 'Telemetry'
    },
    {
      id: '6',
      title: 'Telemetry Health',
      description: 'État de santé du système de télémétrie',
      icon: Zap,
      path: '/admin/dataflow/telemetry-health',
      color: 'yellow',
      category: 'Telemetry'
    },
    {
      id: '7',
      title: 'Command Center',
      description: 'Centre de commande NSA avec visualisations avancées',
      icon: Layers,
      path: '/admin/seo/command-center',
      color: 'slate',
      category: 'Telemetry'
    },

    // Performance & Monitoring
    {
      id: '8',
      title: 'Performance Monitor',
      description: 'Monitoring des performances par page et endpoint',
      icon: Zap,
      path: '/admin/seo/performance',
      color: 'yellow',
      category: 'Performance'
    },
    {
      id: '9',
      title: 'Real-time Monitor',
      description: 'Activité en temps réel des visiteurs',
      icon: Eye,
      path: '/admin/seo/realtime',
      color: 'emerald',
      category: 'Performance'
    },
    {
      id: '10',
      title: 'Network Trace',
      description: 'Traçage réseau et analyse de latence',
      icon: Network,
      path: '/admin/dataflow/network-trace',
      color: 'cyan',
      category: 'Performance'
    },

    // Security & Fraud
    {
      id: '11',
      title: 'Fraud Detection',
      description: 'Détection de fraude et bots en temps réel',
      icon: Shield,
      path: '/admin/seo/fraud',
      color: 'orange',
      category: 'Security'
    },
    {
      id: '12',
      title: 'Device Intelligence',
      description: 'Analyse des appareils et empreintes digitales',
      icon: Smartphone,
      path: '/admin/dataflow/device-intelligence',
      color: 'violet',
      category: 'Security'
    },

    // Analytics & Flow
    {
      id: '13',
      title: 'Analytics Timeline',
      description: 'Timeline des événements et interactions',
      icon: LineChart,
      path: '/admin/dataflow/analytics-timeline',
      color: 'pink',
      category: 'Analytics'
    },
    {
      id: '14',
      title: 'Page Flow',
      description: 'Visualisation des flux de navigation',
      icon: Route,
      path: '/admin/dataflow/page-flow',
      color: 'lime',
      category: 'Analytics'
    },
    {
      id: '15',
      title: 'User Journeys',
      description: 'Parcours utilisateurs bout-en-bout',
      icon: FileText,
      path: '/admin/dataflow/journeys',
      color: 'amber',
      category: 'Analytics'
    },

    // Network & Infrastructure
    {
      id: '16',
      title: 'Active Recon',
      description: 'Reconnaissance active et scan réseau',
      icon: Radio,
      path: '/admin/dataflow/active-recon',
      color: 'teal',
      category: 'Network'
    },
    {
      id: '17',
      title: 'Packet Capture',
      description: 'Capture et analyse de paquets réseau',
      icon: Wifi,
      path: '/admin/dataflow/packet-capture',
      color: 'sky',
      category: 'Network'
    }
  ];

  const categories = [...new Set(endpoints.map(e => e.category))];

  const getColorClasses = (color: string) => {
    const colors: Record<string, { bg: string, text: string, border: string, hover: string }> = {
      blue: { bg: 'bg-blue-50', text: 'text-blue-600', border: 'border-blue-200', hover: 'hover:bg-blue-100' },
      green: { bg: 'bg-green-50', text: 'text-green-600', border: 'border-green-200', hover: 'hover:bg-green-100' },
      purple: { bg: 'bg-purple-50', text: 'text-purple-600', border: 'border-purple-200', hover: 'hover:bg-purple-100' },
      red: { bg: 'bg-red-50', text: 'text-red-600', border: 'border-red-200', hover: 'hover:bg-red-100' },
      indigo: { bg: 'bg-indigo-50', text: 'text-indigo-600', border: 'border-indigo-200', hover: 'hover:bg-indigo-100' },
      yellow: { bg: 'bg-yellow-50', text: 'text-yellow-600', border: 'border-yellow-200', hover: 'hover:bg-yellow-100' },
      slate: { bg: 'bg-slate-50', text: 'text-slate-600', border: 'border-slate-200', hover: 'hover:bg-slate-100' },
      emerald: { bg: 'bg-emerald-50', text: 'text-emerald-600', border: 'border-emerald-200', hover: 'hover:bg-emerald-100' },
      cyan: { bg: 'bg-cyan-50', text: 'text-cyan-600', border: 'border-cyan-200', hover: 'hover:bg-cyan-100' },
      orange: { bg: 'bg-orange-50', text: 'text-orange-600', border: 'border-orange-200', hover: 'hover:bg-orange-100' },
      violet: { bg: 'bg-violet-50', text: 'text-violet-600', border: 'border-violet-200', hover: 'hover:bg-violet-100' },
      pink: { bg: 'bg-pink-50', text: 'text-pink-600', border: 'border-pink-200', hover: 'hover:bg-pink-100' },
      lime: { bg: 'bg-lime-50', text: 'text-lime-600', border: 'border-lime-200', hover: 'hover:bg-lime-100' },
      amber: { bg: 'bg-amber-50', text: 'text-amber-600', border: 'border-amber-200', hover: 'hover:bg-amber-100' },
      teal: { bg: 'bg-teal-50', text: 'text-teal-600', border: 'border-teal-200', hover: 'hover:bg-teal-100' },
      sky: { bg: 'bg-sky-50', text: 'text-sky-600', border: 'border-sky-200', hover: 'hover:bg-sky-100' },
    };
    return colors[color] || colors.blue;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminNav currentPage="/admin/dataflow" />

      <div className="p-8 max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-3 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl">
              <Activity className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Dataflow Hub</h1>
              <p className="text-gray-600">Monitoring, télémétrie et analyse des flux de données</p>
            </div>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-lg border p-4">
            <div className="text-sm text-gray-600 mb-1">Total Endpoints</div>
            <div className="text-3xl font-bold text-blue-600">{endpoints.length}</div>
          </div>
          <div className="bg-white rounded-lg border p-4">
            <div className="text-sm text-gray-600 mb-1">Catégories</div>
            <div className="text-3xl font-bold text-green-600">{categories.length}</div>
          </div>
          <div className="bg-white rounded-lg border p-4">
            <div className="text-sm text-gray-600 mb-1">Système</div>
            <div className="text-xl font-bold text-emerald-600">Opérationnel</div>
          </div>
          <div className="bg-white rounded-lg border p-4">
            <div className="text-sm text-gray-600 mb-1">Uptime</div>
            <div className="text-xl font-bold text-purple-600">99.9%</div>
          </div>
        </div>

        {/* Endpoints by Category */}
        {categories.map(category => (
          <div key={category} className="mb-8">
            <h2 className="text-xl font-bold text-gray-900 mb-4">{category}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {endpoints.filter(e => e.category === category).map(endpoint => {
                const Icon = endpoint.icon;
                const colors = getColorClasses(endpoint.color);

                return (
                  <button
                    key={endpoint.id}
                    onClick={() => router.push(endpoint.path)}
                    className={`${colors.bg} ${colors.border} ${colors.hover} border-2 rounded-xl p-5 text-left transition-all hover:shadow-lg hover:scale-105`}
                  >
                    <div className="flex items-start gap-4">
                      <div className={`${colors.bg} p-3 rounded-lg`}>
                        <Icon className={`w-6 h-6 ${colors.text}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className={`font-semibold ${colors.text} mb-1`}>
                          {endpoint.title}
                        </h3>
                        <p className="text-sm text-gray-600 line-clamp-2">
                          {endpoint.description}
                        </p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
