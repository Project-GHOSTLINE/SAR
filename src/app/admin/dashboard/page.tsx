'use client'

import { useState, useEffect } from 'react'
import {
  LogOut, TrendingUp, TrendingDown, DollarSign, Users, FileText,
  CreditCard, AlertTriangle, CheckCircle, Clock, RefreshCw,
  ArrowUpRight, ArrowDownRight, Activity, Zap, Eye, Bell,
  ChevronDown, MoreHorizontal, Search, Settings
} from 'lucide-react'

interface Message {
  id: string
  nom: string
  email: string
  telephone: string
  question: string
  date: string
  lu: boolean
  status: string
  reference: string
}

// Desjardins Colors
const DESJARDINS = {
  primary: '#00874e',
  dark: '#006341',
  light: '#00a65a',
  glow: 'rgba(0, 135, 78, 0.5)'
}

export default function AdminDashboard() {
  const [loading, setLoading] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [stats, setStats] = useState({ total: 0, nonLus: 0 })
  const [currentTime, setCurrentTime] = useState(new Date())
  const [selectedView, setSelectedView] = useState<'dashboard' | 'messages' | 'vopay' | 'margill'>('dashboard')

  const [vopayData, setVopayData] = useState({
    balance: 45892.50,
    frozen: 1250.00,
    pendingInterac: 3,
    todayInterac: 12450.00,
    weeklyVolume: 89450.00,
    successRate: 98.7
  })

  const [margillData, setMargillData] = useState({
    newFiles: 8,
    paymentsSent: 23,
    nsf: 2,
    pendingPayments: 15600.00,
    activeLoans: 156,
    monthlyCollected: 234500.00
  })

  const [ticker, setTicker] = useState([
    { type: 'interac', amount: 500, name: 'Jean T.', time: '10:45' },
    { type: 'payment', amount: -1200, name: 'Marie L.', time: '10:42' },
    { type: 'interac', amount: 750, name: 'Pierre D.', time: '10:38' },
    { type: 'nsf', amount: 450, name: 'Sophie R.', time: '10:35' },
    { type: 'newfile', amount: 2500, name: 'Marc B.', time: '10:30' },
  ])

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  const fetchMessages = async () => {
    try {
      const res = await fetch('/api/admin/messages', { credentials: 'include' })
      if (res.ok) {
        const data = await res.json()
        setMessages(data.messages || [])
        setStats({ total: data.total || 0, nonLus: data.nonLus || 0 })
      }
    } catch (error) {
      console.error('Erreur:', error)
    }
  }

  useEffect(() => {
    fetchMessages()
    const interval = setInterval(fetchMessages, 30000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    const interval = setInterval(() => {
      setVopayData(prev => ({
        ...prev,
        balance: prev.balance + (Math.random() - 0.3) * 100,
        todayInterac: prev.todayInterac + Math.random() * 50
      }))
    }, 5000)
    return () => clearInterval(interval)
  }, [])

  const handleLogout = async () => {
    setLoading(true)
    await fetch('/api/admin/logout', { method: 'POST', credentials: 'include' })
    window.location.href = '/admin'
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-CA', { style: 'currency', currency: 'CAD' }).format(amount)
  }

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('fr-CA', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  }

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('fr-CA', { weekday: 'short', day: 'numeric', month: 'short' })
  }

  const getTickerIcon = (type: string) => {
    switch (type) {
      case 'interac': return <ArrowDownRight className="text-[#00874e]" size={14} />
      case 'payment': return <ArrowUpRight className="text-[#3b82f6]" size={14} />
      case 'nsf': return <AlertTriangle className="text-[#ef4444]" size={14} />
      case 'newfile': return <FileText className="text-[#8b5cf6]" size={14} />
      default: return <Activity size={14} />
    }
  }

  const getTickerColor = (type: string) => {
    switch (type) {
      case 'interac': return 'text-[#00874e]'
      case 'payment': return 'text-[#3b82f6]'
      case 'nsf': return 'text-[#ef4444]'
      case 'newfile': return 'text-[#8b5cf6]'
      default: return 'text-white/60'
    }
  }

  // Glass Card Component
  const GlassCard = ({ children, className = '', glow = false }: { children: React.ReactNode, className?: string, glow?: boolean }) => (
    <div className={`relative group ${className}`}>
      {glow && (
        <div className="absolute -inset-0.5 bg-gradient-to-r from-[#00874e]/30 to-[#00874e]/10 rounded-2xl blur-lg opacity-50 group-hover:opacity-75 transition-opacity"></div>
      )}
      <div className="relative bg-white/[0.03] backdrop-blur-xl border border-white/[0.08] rounded-2xl overflow-hidden">
        {/* Glass shine effect */}
        <div className="absolute inset-0 bg-gradient-to-br from-white/[0.08] via-transparent to-transparent pointer-events-none"></div>
        {/* Top reflection */}
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
        {children}
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-[#0a0d10] text-white overflow-hidden">
      {/* Abstract Timeline Background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        {/* Gradient base */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#0a0d10] via-[#0d1117] to-[#0a0d10]"></div>

        {/* Animated candlestick chart pattern */}
        <svg className="absolute inset-0 w-full h-full opacity-[0.06]" preserveAspectRatio="none">
          <defs>
            <linearGradient id="greenGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#00874e" stopOpacity="0.8"/>
              <stop offset="100%" stopColor="#00874e" stopOpacity="0.2"/>
            </linearGradient>
            <linearGradient id="redGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#ef4444" stopOpacity="0.8"/>
              <stop offset="100%" stopColor="#ef4444" stopOpacity="0.2"/>
            </linearGradient>
          </defs>

          {/* Candlesticks */}
          {[...Array(40)].map((_, i) => {
            const x = 50 + i * 50
            const height = 80 + Math.sin(i * 0.5) * 60 + Math.random() * 40
            const y = 200 + Math.cos(i * 0.3) * 100
            const isGreen = Math.sin(i * 0.7) > 0
            return (
              <g key={i} className="animate-pulse" style={{ animationDelay: `${i * 0.1}s` }}>
                {/* Wick */}
                <line x1={x} y1={y - 20} x2={x} y2={y + height + 20} stroke={isGreen ? '#00874e' : '#ef4444'} strokeWidth="1" opacity="0.5"/>
                {/* Body */}
                <rect x={x - 8} y={y} width="16" height={height} fill={isGreen ? 'url(#greenGrad)' : 'url(#redGrad)'} rx="2"/>
              </g>
            )
          })}

          {/* Flow line */}
          <path
            d="M0,400 Q200,350 400,380 T800,340 T1200,360 T1600,320 T2000,350"
            fill="none"
            stroke="url(#greenGrad)"
            strokeWidth="2"
            className="animate-flow"
          />
          <path
            d="M0,450 Q250,400 500,420 T1000,380 T1500,400 T2000,360"
            fill="none"
            stroke="#00874e"
            strokeWidth="1"
            opacity="0.3"
            className="animate-flow-slow"
          />
        </svg>

        {/* Glow orbs */}
        <div className="absolute top-[20%] left-[10%] w-[500px] h-[500px] bg-[#00874e]/8 rounded-full blur-[150px] animate-pulse"></div>
        <div className="absolute bottom-[10%] right-[5%] w-[400px] h-[400px] bg-[#3b82f6]/5 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '2s' }}></div>
        <div className="absolute top-[50%] right-[30%] w-[300px] h-[300px] bg-[#00874e]/5 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: '4s' }}></div>

        {/* Grid overlay */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(0,135,78,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(0,135,78,0.03)_1px,transparent_1px)] bg-[size:80px_80px]"></div>

        {/* Horizontal timeline lines */}
        <div className="absolute inset-0">
          {[...Array(8)].map((_, i) => (
            <div
              key={i}
              className="absolute w-full h-px bg-gradient-to-r from-transparent via-[#00874e]/10 to-transparent"
              style={{ top: `${15 + i * 12}%` }}
            ></div>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="relative z-10">
        {/* Top Navigation Bar */}
        <header className="backdrop-blur-2xl bg-black/30 border-b border-white/[0.06]">
          <div className="flex items-center justify-between px-6 h-16">
            {/* Logo & Brand */}
            <div className="flex items-center gap-8">
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center font-black text-lg text-white shadow-lg shadow-[#00874e]/30"
                  style={{ background: `linear-gradient(135deg, ${DESJARDINS.primary} 0%, ${DESJARDINS.dark} 100%)` }}
                >
                  $
                </div>
                <div>
                  <span className="font-bold text-white text-lg">SAR</span>
                  <span className="text-white/40 text-sm ml-2">Admin</span>
                </div>
              </div>

              {/* Main Navigation */}
              <nav className="flex items-center gap-1">
                {[
                  { id: 'dashboard', label: 'Dashboard' },
                  { id: 'vopay', label: 'VoPay' },
                  { id: 'margill', label: 'Margill' },
                  { id: 'messages', label: 'Messages', badge: stats.nonLus }
                ].map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setSelectedView(item.id as typeof selectedView)}
                    className={`px-4 py-2 rounded-xl font-medium text-sm transition-all flex items-center gap-2 ${
                      selectedView === item.id
                        ? 'text-white bg-white/[0.08] backdrop-blur-xl border border-white/[0.1]'
                        : 'text-white/50 hover:text-white hover:bg-white/[0.04]'
                    }`}
                  >
                    {item.label}
                    {item.badge && item.badge > 0 && (
                      <span className="bg-[#f6465d] text-white text-xs px-1.5 py-0.5 rounded font-bold min-w-[18px] text-center shadow-lg shadow-[#f6465d]/30">
                        {item.badge}
                      </span>
                    )}
                  </button>
                ))}
              </nav>
            </div>

            {/* Right Side */}
            <div className="flex items-center gap-4">
              {/* Live Indicator */}
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#00874e]/10 backdrop-blur-xl border border-[#00874e]/20">
                <div className="relative">
                  <div className="w-2 h-2 rounded-full bg-[#00874e]"></div>
                  <div className="absolute inset-0 w-2 h-2 rounded-full bg-[#00874e] animate-ping"></div>
                </div>
                <span className="text-xs font-semibold text-[#00874e]">LIVE</span>
              </div>

              {/* Time */}
              <div className="text-right px-4 border-l border-white/[0.06]">
                <p className="text-white font-mono text-lg font-semibold">{formatTime(currentTime)}</p>
                <p className="text-white/30 text-xs">{formatDate(currentTime)}</p>
              </div>

              {/* Logout */}
              <button
                onClick={handleLogout}
                className="p-2.5 rounded-xl text-white/40 hover:text-white bg-white/[0.03] hover:bg-white/[0.08] backdrop-blur-xl border border-white/[0.06] transition"
              >
                <LogOut size={18} />
              </button>
            </div>
          </div>

          {/* Ticker Bar */}
          <div className="px-6 py-2 bg-black/20 backdrop-blur-xl border-t border-white/[0.04] overflow-hidden">
            <div className="flex items-center gap-8 animate-marquee">
              {[...ticker, ...ticker, ...ticker].map((item, i) => (
                <div key={i} className="flex items-center gap-2 whitespace-nowrap">
                  {getTickerIcon(item.type)}
                  <span className="text-white/30 text-xs">{item.time}</span>
                  <span className="text-white/70 text-xs font-medium">{item.name}</span>
                  <span className={`text-xs font-bold ${getTickerColor(item.type)}`}>
                    {item.amount > 0 ? '+' : ''}{formatCurrency(item.amount)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="p-6">
          {selectedView === 'dashboard' && (
            <>
              {/* Top Stats Row */}
              <div className="grid grid-cols-4 gap-4 mb-6">
                {/* Total Balance */}
                <GlassCard glow>
                  <div className="p-5">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-white/50 text-sm">Solde VoPay</span>
                      <div className="flex items-center gap-1 text-[#00874e] text-xs font-medium">
                        <TrendingUp size={12} />
                        +2.5%
                      </div>
                    </div>
                    <p className="text-2xl font-bold text-white">{formatCurrency(vopayData.balance)}</p>
                    <div className="mt-3 flex items-center gap-2">
                      <span className="text-xs text-white/40">Disponible:</span>
                      <span className="text-xs font-medium text-[#00874e]">
                        {formatCurrency(vopayData.balance - vopayData.frozen)}
                      </span>
                    </div>
                  </div>
                </GlassCard>

                {/* Frozen Amount */}
                <GlassCard>
                  <div className="p-5">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-white/50 text-sm">Montant Gele</span>
                      <AlertTriangle size={16} className="text-[#f0b90b]" />
                    </div>
                    <p className="text-2xl font-bold text-white">{formatCurrency(vopayData.frozen)}</p>
                    <div className="mt-3">
                      <div className="h-1.5 bg-white/[0.06] rounded-full overflow-hidden backdrop-blur">
                        <div
                          className="h-full rounded-full transition-all bg-[#f0b90b]"
                          style={{ width: `${(vopayData.frozen / vopayData.balance) * 100}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                </GlassCard>

                {/* Today Interac */}
                <GlassCard>
                  <div className="p-5">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-white/50 text-sm">Interac Aujourd'hui</span>
                      <div className="flex items-center gap-1 text-[#00874e] text-xs font-medium">
                        <TrendingUp size={12} />
                        +15.3%
                      </div>
                    </div>
                    <p className="text-2xl font-bold text-white">{formatCurrency(vopayData.todayInterac)}</p>
                    <div className="mt-3 flex items-center gap-2">
                      <span className="text-xs text-white/40">En attente:</span>
                      <span className="text-xs font-bold text-[#3b82f6]">{vopayData.pendingInterac}</span>
                    </div>
                  </div>
                </GlassCard>

                {/* Messages */}
                <GlassCard>
                  <div className="p-5">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-white/50 text-sm">Messages</span>
                      <Bell size={16} className="text-white/40" />
                    </div>
                    <p className="text-2xl font-bold text-white">{stats.total}</p>
                    <div className="mt-3 flex items-center gap-2">
                      <span className="text-xs text-white/40">Non lus:</span>
                      <span className={`text-xs font-bold ${stats.nonLus > 0 ? 'text-[#f6465d]' : 'text-[#00874e]'}`}>
                        {stats.nonLus}
                      </span>
                    </div>
                  </div>
                </GlassCard>
              </div>

              {/* Secondary Stats */}
              <div className="grid grid-cols-6 gap-4 mb-6">
                {[
                  { label: 'Nouveaux Dossiers', value: margillData.newFiles, change: '+3', positive: true },
                  { label: 'Paiements', value: margillData.paymentsSent, change: '+12%', positive: true },
                  { label: 'NSF', value: margillData.nsf, change: '+1', positive: false },
                  { label: 'Prets Actifs', value: margillData.activeLoans, change: '-2', positive: false },
                  { label: 'Volume Semaine', value: formatCurrency(vopayData.weeklyVolume), change: '+8.2%', positive: true },
                  { label: 'Taux Succes', value: `${vopayData.successRate}%`, change: '+0.3%', positive: true },
                ].map((stat, i) => (
                  <GlassCard key={i}>
                    <div className="p-4">
                      <p className="text-white/40 text-xs mb-2">{stat.label}</p>
                      <p className="text-lg font-bold text-white">{stat.value}</p>
                      <p className={`text-xs mt-1 ${stat.positive ? 'text-[#00874e]' : 'text-[#f6465d]'}`}>
                        {stat.change}
                      </p>
                    </div>
                  </GlassCard>
                ))}
              </div>

              {/* Two Column Layout */}
              <div className="grid grid-cols-3 gap-6">
                {/* Activity Feed */}
                <GlassCard className="col-span-2">
                  <div className="px-5 py-4 border-b border-white/[0.06] flex items-center justify-between">
                    <h2 className="font-semibold text-white flex items-center gap-2">
                      <Activity size={16} className="text-[#00874e]" />
                      Activite Recente
                    </h2>
                    <button className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/[0.06] transition">
                      <RefreshCw size={14} />
                    </button>
                  </div>
                  <div className="divide-y divide-white/[0.04]">
                    {ticker.map((item, i) => (
                      <div key={i} className="px-5 py-3 flex items-center justify-between hover:bg-white/[0.02] transition">
                        <div className="flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-xl flex items-center justify-center backdrop-blur-xl border ${
                            item.type === 'interac' ? 'bg-[#00874e]/10 border-[#00874e]/20' :
                            item.type === 'payment' ? 'bg-[#3b82f6]/10 border-[#3b82f6]/20' :
                            item.type === 'nsf' ? 'bg-[#f6465d]/10 border-[#f6465d]/20' :
                            'bg-[#8b5cf6]/10 border-[#8b5cf6]/20'
                          }`}>
                            {getTickerIcon(item.type)}
                          </div>
                          <div>
                            <p className="font-medium text-white text-sm">{item.name}</p>
                            <p className="text-xs text-white/40">
                              {item.type === 'interac' ? 'Interac recu' :
                               item.type === 'payment' ? 'Paiement envoye' :
                               item.type === 'nsf' ? 'NSF detecte' : 'Nouveau dossier'}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className={`font-bold ${getTickerColor(item.type)}`}>
                            {item.amount > 0 ? '+' : ''}{formatCurrency(item.amount)}
                          </p>
                          <p className="text-xs text-white/30">{item.time}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </GlassCard>

                {/* Right Sidebar */}
                <div className="space-y-4">
                  {/* VoPay Status Card */}
                  <GlassCard glow>
                    <div className="p-5">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="font-semibold text-white text-sm flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-[#00874e] shadow-lg shadow-[#00874e]/50"></div>
                          VoPay
                        </h3>
                        <span className="text-xs px-2 py-1 rounded-lg text-[#00874e] bg-[#00874e]/10 border border-[#00874e]/20">Connecte</span>
                      </div>

                      <div className="space-y-3">
                        <div className="flex justify-between">
                          <span className="text-white/50 text-sm">Disponible</span>
                          <span className="font-semibold text-[#00874e]">
                            {formatCurrency(vopayData.balance - vopayData.frozen)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-white/50 text-sm">Gele</span>
                          <span className="font-semibold text-[#f0b90b]">{formatCurrency(vopayData.frozen)}</span>
                        </div>
                        <div className="h-2 bg-white/[0.06] rounded-full overflow-hidden backdrop-blur">
                          <div
                            className="h-full rounded-full transition-all duration-1000 bg-gradient-to-r from-[#00874e] to-[#00a65a] shadow-lg shadow-[#00874e]/30"
                            style={{ width: `${((vopayData.balance - vopayData.frozen) / vopayData.balance) * 100}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  </GlassCard>

                  {/* Margill Status Card */}
                  <GlassCard>
                    <div className="p-5">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="font-semibold text-white text-sm flex items-center gap-2">
                          <div className="w-2 h-2 bg-[#3b82f6] rounded-full"></div>
                          Margill
                        </h3>
                        <span className="text-xs px-2 py-1 rounded-lg text-[#00874e] bg-[#00874e]/10 border border-[#00874e]/20">Connecte</span>
                      </div>

                      <div className="space-y-3">
                        <div className="flex justify-between">
                          <span className="text-white/50 text-sm">Prets actifs</span>
                          <span className="font-semibold text-white">{margillData.activeLoans}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-white/50 text-sm">Collecte ce mois</span>
                          <span className="font-semibold text-[#3b82f6]">{formatCurrency(margillData.monthlyCollected)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-white/50 text-sm">NSF</span>
                          <span className="font-semibold text-[#f6465d]">{margillData.nsf}</span>
                        </div>
                      </div>
                    </div>
                  </GlassCard>

                  {/* Quick Messages */}
                  <GlassCard>
                    <div className="px-5 py-4 border-b border-white/[0.06] flex items-center justify-between">
                      <h3 className="font-semibold text-white text-sm">Messages Recents</h3>
                      {stats.nonLus > 0 && (
                        <span className="text-xs px-2 py-0.5 rounded-lg bg-[#f6465d]/10 text-[#f6465d] border border-[#f6465d]/20 font-medium">
                          {stats.nonLus} new
                        </span>
                      )}
                    </div>
                    <div className="divide-y divide-white/[0.04]">
                      {messages.slice(0, 3).map((msg) => (
                        <div key={msg.id} className="px-5 py-3 hover:bg-white/[0.02] transition cursor-pointer">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold bg-[#00874e]/10 text-[#00874e] border border-[#00874e]/20">
                              {msg.nom.split(' ').map(n => n[0]).join('').slice(0, 2)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <p className="text-sm font-medium text-white truncate">{msg.nom}</p>
                                {!msg.lu && <div className="w-1.5 h-1.5 bg-[#3b82f6] rounded-full shadow-lg shadow-[#3b82f6]/50"></div>}
                              </div>
                              <p className="text-xs text-white/40 truncate">{msg.question.slice(0, 35)}...</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                    <button
                      onClick={() => setSelectedView('messages')}
                      className="w-full py-3 text-xs font-medium text-white/40 hover:text-white transition border-t border-white/[0.04] hover:bg-white/[0.02]"
                    >
                      Voir tous les messages
                    </button>
                  </GlassCard>
                </div>
              </div>
            </>
          )}

          {/* VoPay View */}
          {selectedView === 'vopay' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold">VoPay Dashboard</h1>
                <button className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition bg-[#00874e] hover:bg-[#006341] shadow-lg shadow-[#00874e]/30">
                  <RefreshCw size={14} />
                  Rafraichir
                </button>
              </div>

              <div className="grid grid-cols-4 gap-4">
                <GlassCard glow>
                  <div className="p-6">
                    <p className="text-white/50 text-sm mb-2">Solde Total</p>
                    <p className="text-3xl font-bold text-white">{formatCurrency(vopayData.balance)}</p>
                  </div>
                </GlassCard>
                <GlassCard>
                  <div className="p-6">
                    <p className="text-white/50 text-sm mb-2">Disponible</p>
                    <p className="text-3xl font-bold text-[#00874e]">
                      {formatCurrency(vopayData.balance - vopayData.frozen)}
                    </p>
                  </div>
                </GlassCard>
                <GlassCard>
                  <div className="p-6">
                    <p className="text-white/50 text-sm mb-2">Gele</p>
                    <p className="text-3xl font-bold text-[#f0b90b]">{formatCurrency(vopayData.frozen)}</p>
                  </div>
                </GlassCard>
                <GlassCard>
                  <div className="p-6">
                    <p className="text-white/50 text-sm mb-2">En Attente</p>
                    <p className="text-3xl font-bold text-[#3b82f6]">{vopayData.pendingInterac}</p>
                  </div>
                </GlassCard>
              </div>

              <GlassCard>
                <div className="p-6">
                  <h2 className="font-semibold text-white mb-4">Connexion API requise</h2>
                  <p className="text-white/50 text-sm">Les donnees affichees sont des donnees de demonstration. Connectez l'API VoPay pour voir les vraies donnees.</p>
                </div>
              </GlassCard>
            </div>
          )}

          {/* Margill View */}
          {selectedView === 'margill' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold">Margill Dashboard</h1>
                <button className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition bg-[#00874e] hover:bg-[#006341] shadow-lg shadow-[#00874e]/30">
                  <RefreshCw size={14} />
                  Rafraichir
                </button>
              </div>

              <div className="grid grid-cols-4 gap-4">
                <GlassCard glow>
                  <div className="p-6">
                    <p className="text-white/50 text-sm mb-2">Prets Actifs</p>
                    <p className="text-3xl font-bold text-white">{margillData.activeLoans}</p>
                  </div>
                </GlassCard>
                <GlassCard>
                  <div className="p-6">
                    <p className="text-white/50 text-sm mb-2">Nouveaux Dossiers</p>
                    <p className="text-3xl font-bold text-[#00874e]">{margillData.newFiles}</p>
                  </div>
                </GlassCard>
                <GlassCard>
                  <div className="p-6">
                    <p className="text-white/50 text-sm mb-2">Collecte ce Mois</p>
                    <p className="text-3xl font-bold text-[#3b82f6]">{formatCurrency(margillData.monthlyCollected)}</p>
                  </div>
                </GlassCard>
                <GlassCard>
                  <div className="p-6">
                    <p className="text-white/50 text-sm mb-2">NSF</p>
                    <p className="text-3xl font-bold text-[#f6465d]">{margillData.nsf}</p>
                  </div>
                </GlassCard>
              </div>

              <GlassCard>
                <div className="p-6">
                  <h2 className="font-semibold text-white mb-4">Connexion API requise</h2>
                  <p className="text-white/50 text-sm">Les donnees affichees sont des donnees de demonstration. Connectez l'API Margill pour voir les vraies donnees.</p>
                </div>
              </GlassCard>
            </div>
          )}

          {/* Messages View */}
          {selectedView === 'messages' && (
            <GlassCard>
              <div className="px-6 py-4 border-b border-white/[0.06] flex items-center justify-between">
                <h2 className="font-semibold text-white text-lg">Messages ({stats.total})</h2>
                <button onClick={fetchMessages} className="p-2 rounded-xl text-white/40 hover:text-white hover:bg-white/[0.06] transition">
                  <RefreshCw size={16} />
                </button>
              </div>
              <div className="divide-y divide-white/[0.04]">
                {messages.map((msg) => (
                  <div key={msg.id} className={`px-6 py-4 hover:bg-white/[0.02] transition ${!msg.lu ? 'bg-[#3b82f6]/[0.03]' : ''}`}>
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-xl flex items-center justify-center font-bold text-sm bg-[#00874e]/10 text-[#00874e] border border-[#00874e]/20">
                        {msg.nom.split(' ').map(n => n[0]).join('').slice(0, 2)}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-1">
                          <p className="font-semibold text-white">{msg.nom}</p>
                          <span className="text-xs text-white/40 font-mono bg-white/[0.04] px-2 py-0.5 rounded-lg border border-white/[0.06]">#{msg.reference}</span>
                          {!msg.lu && (
                            <span className="text-xs px-2 py-0.5 rounded-lg bg-[#3b82f6]/10 text-[#3b82f6] border border-[#3b82f6]/20 font-medium">Nouveau</span>
                          )}
                        </div>
                        <p className="text-white/60 text-sm mb-2">{msg.question}</p>
                        <div className="flex items-center gap-4 text-xs text-white/30">
                          <span>{msg.email}</span>
                          {msg.telephone && <span>{msg.telephone}</span>}
                          <span>{new Date(msg.date).toLocaleString('fr-CA')}</span>
                        </div>
                      </div>
                      <a
                        href={`mailto:${msg.email}`}
                        className="p-2 rounded-xl text-white/40 hover:text-white bg-white/[0.03] hover:bg-white/[0.08] border border-white/[0.06] transition"
                      >
                        <ArrowUpRight size={16} />
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </GlassCard>
          )}
        </main>
      </div>

      <style jsx>{`
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-33.33%); }
        }
        .animate-marquee {
          animation: marquee 25s linear infinite;
        }
        @keyframes flow {
          0% { stroke-dashoffset: 1000; }
          100% { stroke-dashoffset: 0; }
        }
        .animate-flow {
          stroke-dasharray: 20 10;
          animation: flow 20s linear infinite;
        }
        .animate-flow-slow {
          stroke-dasharray: 30 15;
          animation: flow 30s linear infinite;
        }
      `}</style>
    </div>
  )
}
