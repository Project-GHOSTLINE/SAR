'use client'

import { useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import {
  LayoutDashboard, MessageSquare, DollarSign, FileText,
  Wrench, Webhook, BarChart3, LogOut, Menu, X,
  ChevronDown, User, Clock, Bell, Shield, Database, Download, Zap, TrendingUp
} from 'lucide-react'

interface AdminNavProps {
  currentPage?: string
}

export default function AdminNav({ currentPage }: AdminNavProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [messagesCount, setMessagesCount] = useState(0)
  const [supportCount, setSupportCount] = useState(0)
  const [currentTime, setCurrentTime] = useState(new Date())
  const [mounted, setMounted] = useState(false)

  // Marquer comme monté côté client pour éviter les erreurs d'hydration
  useEffect(() => {
    setMounted(true)
  }, [])

  // Mettre à jour l'heure toutes les 30 secondes
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 30000)
    return () => clearInterval(timer)
  }, [])

  // Fetch notifications counts
  useEffect(() => {
    const fetchCounts = async () => {
      try {
        // Messages non lus
        const messagesRes = await fetch('/api/admin/messages?status=nouveau&limit=1', {
          credentials: 'include'
        })
        if (messagesRes.ok) {
          const data = await messagesRes.json()
          setMessagesCount(data.stats?.nonLus || 0)
        }

        // Support tickets non résolus
        const supportRes = await fetch('/api/admin/support/tickets?status=nouveau&limit=1', {
          credentials: 'include'
        })
        if (supportRes.ok) {
          const data = await supportRes.json()
          setSupportCount(data.stats?.nouveau || 0)
        }
      } catch (error) {
        console.error('Erreur fetch counts:', error)
      }
    }

    fetchCounts()
    const interval = setInterval(fetchCounts, 60000) // Refresh every minute
    return () => clearInterval(interval)
  }, [])

  const handleLogout = async () => {
    try {
      await fetch('/api/admin/logout', {
        method: 'POST',
        credentials: 'include'
      })
      router.push('/admin')
    } catch (error) {
      console.error('Erreur logout:', error)
    }
  }

  // Show breadcrumb for analyse page
  const showAnalyseBreadcrumb = currentPage?.includes('analyse')

  const navItems = [
    {
      name: 'Dashboard',
      href: '/admin/dashboard',
      icon: LayoutDashboard,
      badge: null
    },
    {
      name: 'Messages',
      href: '/admin/dashboard?tab=messages',
      icon: MessageSquare,
      badge: messagesCount > 0 ? messagesCount : null
    },
    {
      name: 'Analyses',
      href: '/admin/dashboard?tab=analyses',
      icon: BarChart3,
      badge: null
    },
    {
      name: 'Downloads',
      href: '/admin/downloads',
      icon: Download,
      badge: null
    },
    {
      name: 'VoPay',
      href: '/admin/dashboard?tab=vopay',
      icon: DollarSign,
      badge: null
    },
    {
      name: 'Support',
      href: '/admin/dashboard?tab=support',
      icon: Wrench,
      badge: supportCount > 0 ? supportCount : null
    },
    {
      name: 'Webhooks',
      href: '/admin/webhooks',
      icon: Webhook,
      badge: null
    },
    {
      name: 'Blacklist',
      href: '/admin/blacklist',
      icon: Shield,
      badge: null
    },
    {
      name: 'Explorer',
      href: '/admin/data-explorer',
      icon: Database,
      badge: null
    },
    {
      name: 'Performance',
      href: '/admin/performance',
      icon: Zap,
      badge: null
    },
    {
      name: 'SEO',
      href: '/admin/seo',
      icon: TrendingUp,
      badge: null
    }
  ]

  const isActive = (href: string) => {
    // Comparer exactement avec currentPage si fourni
    if (currentPage) {
      return currentPage === href
    }
    // Sinon comparer avec pathname
    return pathname === href || pathname === href.split('?')[0]
  }

  const formatTime = () => {
    return currentTime.toLocaleTimeString('fr-CA', {
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatDate = () => {
    return currentTime.toLocaleDateString('fr-CA', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  return (
    <nav className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-50">
      <div className="w-full px-2 sm:px-4 lg:px-6 max-w-[100vw]">
        <div className="flex items-center justify-between gap-2 sm:gap-3 h-16 sm:h-20">
          {/* Logo & Brand */}
          <div className="flex items-center flex-shrink-0 min-w-0">
            <button
              onClick={() => router.push('/admin/dashboard')}
              className="flex items-center gap-1.5 sm:gap-2 hover:opacity-80 transition-opacity"
            >
              <div className="w-9 h-9 sm:w-10 sm:h-10 bg-gradient-to-br from-[#10B981] to-emerald-600 rounded-lg flex items-center justify-center shadow-sm flex-shrink-0">
                <span className="text-white font-bold text-base sm:text-lg">$</span>
              </div>
              <div className="hidden sm:block">
                <h1 className="text-sm sm:text-base font-bold text-gray-900 leading-tight">SAR Admin</h1>
                <p className="text-[9px] sm:text-[10px] text-gray-500 hidden xl:block">Solution Argent Rapide</p>
              </div>
            </button>

            {/* Breadcrumb for analyse page */}
            {showAnalyseBreadcrumb && (
              <div className="hidden md:flex items-center gap-2 ml-4 text-sm text-gray-500">
                <span>/</span>
                <span className="text-[#10B981] font-medium">Analyse Client</span>
              </div>
            )}
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-0.5 lg:gap-1 overflow-x-auto scrollbar-hide flex-1 mx-auto justify-center max-w-fit">
            {navItems.map((item) => {
              const Icon = item.icon
              const active = isActive(item.href)

              return (
                <button
                  key={item.name}
                  onClick={() => router.push(item.href)}
                  className={`
                    relative flex items-center gap-1 md:gap-1.5 px-1.5 md:px-2 lg:px-2.5 py-1.5 md:py-2 rounded-lg text-sm font-medium transition-all
                    whitespace-nowrap flex-shrink-0
                    ${active
                      ? 'bg-[#10B981] text-white shadow-md'
                      : 'text-gray-700 hover:bg-gray-100'
                    }
                  `}
                >
                  <Icon size={14} className="flex-shrink-0 md:w-4 md:h-4" />
                  <span className="text-[10px] md:text-xs">{item.name}</span>
                  {item.badge !== null && item.badge > 0 && (
                    <span className={`
                      absolute -top-1 -right-1 min-w-[18px] h-5 px-1.5 flex items-center justify-center
                      rounded-full text-xs font-bold
                      ${active ? 'bg-white text-[#10B981]' : 'bg-red-500 text-white'}
                    `}>
                      {item.badge}
                    </span>
                  )}
                </button>
              )
            })}
          </div>

          {/* Right Section - Time & Logout */}
          <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
            {/* Time Display */}
            {mounted && (
              <div className="hidden 2xl:flex items-center gap-1.5 text-xs text-gray-700">
                <Clock size={14} />
                <span className="font-medium">{formatTime()}</span>
              </div>
            )}

            {/* Notifications */}
            <button className="relative p-1 sm:p-1.5 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
              <Bell size={16} className="sm:w-[18px] sm:h-[18px]" />
              {(messagesCount + supportCount) > 0 && (
                <span className="absolute top-0.5 right-0.5 w-2 h-2 bg-red-500 rounded-full"></span>
              )}
            </button>

            {/* Logout */}
            <button
              onClick={handleLogout}
              className="hidden lg:flex items-center gap-1.5 px-2 lg:px-3 py-1.5 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors text-xs font-medium"
            >
              <LogOut size={14} className="lg:w-4 lg:h-4" />
              <span className="hidden xl:inline">Déconnexion</span>
            </button>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-1.5 sm:p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              {mobileMenuOpen ? <X size={20} className="sm:w-6 sm:h-6" /> : <Menu size={20} className="sm:w-6 sm:h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-gray-200 bg-white max-h-[calc(100vh-4rem)] overflow-y-auto">
          <div className="px-3 sm:px-4 py-3 sm:py-4 space-y-2">
            {navItems.map((item) => {
              const Icon = item.icon
              const active = isActive(item.href)

              return (
                <button
                  key={item.name}
                  onClick={() => {
                    router.push(item.href)
                    setMobileMenuOpen(false)
                  }}
                  className={`
                    w-full flex items-center gap-2.5 sm:gap-3 px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg text-sm font-medium transition-all
                    ${active
                      ? 'bg-[#10B981] text-white'
                      : 'text-gray-700 hover:bg-gray-100 active:bg-gray-200'
                    }
                  `}
                >
                  <Icon size={18} className="sm:w-5 sm:h-5 flex-shrink-0" />
                  <span className="flex-1 text-left text-sm">{item.name}</span>
                  {item.badge !== null && item.badge > 0 && (
                    <span className={`
                      min-w-[24px] h-6 px-2 flex items-center justify-center
                      rounded-full text-xs font-bold
                      ${active ? 'bg-white text-[#10B981]' : 'bg-red-500 text-white'}
                    `}>
                      {item.badge}
                    </span>
                  )}
                </button>
              )
            })}

            {/* Mobile Logout */}
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-2.5 sm:gap-3 px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100 active:bg-gray-200 transition-all border-t border-gray-200 mt-2 pt-4"
            >
              <LogOut size={18} className="sm:w-5 sm:h-5 flex-shrink-0" />
              <span>Déconnexion</span>
            </button>
          </div>
        </div>
      )}
    </nav>
  )
}
