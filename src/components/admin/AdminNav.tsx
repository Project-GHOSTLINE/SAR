'use client'

import { useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import {
  LayoutDashboard, MessageSquare, DollarSign, FileText,
  Wrench, Webhook, BarChart3, LogOut, Menu, X,
  ChevronDown, User, Clock, Bell, Shield, Database, Download
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
      name: 'VoPay',
      href: '/admin/dashboard?tab=vopay',
      icon: DollarSign,
      badge: null
    },
    {
      name: 'Margill',
      href: '/admin/dashboard?tab=margill',
      icon: FileText,
      badge: null,
      disabled: true
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
      name: 'Analyses Client',
      href: '/admin/dashboard?tab=analyses',
      icon: BarChart3,
      badge: null
    },
    {
      name: 'Black Liste',
      href: '/admin/blacklist',
      icon: Shield,
      badge: null
    },
    {
      name: 'Data Explorer',
      href: '/admin/data-explorer',
      icon: Database,
      badge: null
    },
    {
      name: 'Téléchargements',
      href: '/admin/downloads',
      icon: Download,
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
      <div className="w-full px-4 lg:px-6">
        <div className="flex items-center gap-3 h-20">
          {/* Logo & Brand */}
          <div className="flex items-center flex-shrink-0">
            <button
              onClick={() => router.push('/admin/dashboard')}
              className="flex items-center gap-2 hover:opacity-80 transition-opacity"
            >
              <div className="w-10 h-10 bg-gradient-to-br from-[#10B981] to-emerald-600 rounded-lg flex items-center justify-center shadow-sm">
                <span className="text-white font-bold text-lg">$</span>
              </div>
              <div className="hidden xl:block">
                <h1 className="text-base font-bold text-gray-900 leading-tight">SAR Admin</h1>
                <p className="text-[10px] text-gray-500">Solution Argent Rapide</p>
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
          <div className="hidden lg:flex items-center gap-1.5 overflow-x-auto scrollbar-hide flex-1 max-w-fit mx-auto">
            {navItems.map((item) => {
              const Icon = item.icon
              const active = isActive(item.href)

              return (
                <button
                  key={item.name}
                  onClick={() => !item.disabled && router.push(item.href)}
                  disabled={item.disabled}
                  className={`
                    relative flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all
                    whitespace-nowrap flex-shrink-0
                    ${active
                      ? 'bg-[#10B981] text-white shadow-md'
                      : item.disabled
                        ? 'text-gray-400 cursor-not-allowed'
                        : 'text-gray-700 hover:bg-gray-100'
                    }
                  `}
                >
                  <Icon size={16} className="flex-shrink-0" />
                  <span className="text-xs">{item.name}</span>
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
          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Time Display */}
            <div className="hidden xl:flex items-center gap-1.5 text-xs text-gray-700">
              <Clock size={14} />
              <span className="font-medium">{formatTime()}</span>
            </div>

            {/* Notifications */}
            <button className="relative p-1.5 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
              <Bell size={18} />
              {(messagesCount + supportCount) > 0 && (
                <span className="absolute top-0.5 right-0.5 w-2 h-2 bg-red-500 rounded-full"></span>
              )}
            </button>

            {/* Logout */}
            <button
              onClick={handleLogout}
              className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors text-xs font-medium"
            >
              <LogOut size={16} />
              <span className="hidden xl:inline">Déconnexion</span>
            </button>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-gray-200 bg-white">
          <div className="px-4 py-4 space-y-2">
            {navItems.map((item) => {
              const Icon = item.icon
              const active = isActive(item.href)

              return (
                <button
                  key={item.name}
                  onClick={() => {
                    if (!item.disabled) {
                      router.push(item.href)
                      setMobileMenuOpen(false)
                    }
                  }}
                  disabled={item.disabled}
                  className={`
                    w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all
                    ${active
                      ? 'bg-[#10B981] text-white'
                      : item.disabled
                        ? 'text-gray-400 cursor-not-allowed'
                        : 'text-gray-700 hover:bg-gray-100'
                    }
                  `}
                >
                  <Icon size={20} />
                  <span className="flex-1 text-left">{item.name}</span>
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
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100 transition-all border-t border-gray-200 mt-2 pt-4"
            >
              <LogOut size={20} />
              <span>Déconnexion</span>
            </button>
          </div>
        </div>
      )}
    </nav>
  )
}
