'use client'

import { useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import {
  LayoutDashboard, MessageSquare, DollarSign, FileText,
  Wrench, Webhook, BarChart3, LogOut, Menu, X,
  User, Clock, Bell, Shield, Database, Download, Zap,
  TrendingUp, Activity, Code, Rocket, ChevronLeft, ChevronRight
} from 'lucide-react'

interface AdminSidebarProps {
  currentPage?: string
}

export default function AdminSidebar({ currentPage }: AdminSidebarProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [isMobileOpen, setIsMobileOpen] = useState(false)
  const [messagesCount, setMessagesCount] = useState(0)
  const [supportCount, setSupportCount] = useState(0)
  const [currentTime, setCurrentTime] = useState(new Date())
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 30000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    const fetchCounts = async () => {
      try {
        const messagesRes = await fetch('/api/admin/messages?status=nouveau&limit=1', {
          credentials: 'include'
        })
        if (messagesRes.ok) {
          const data = await messagesRes.json()
          setMessagesCount(data.stats?.nonLus || 0)
        }

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
    const interval = setInterval(fetchCounts, 60000)
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
      name: 'Télémétrie',
      href: '/admin/analytics',
      icon: Activity,
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
      name: 'Contrats Clients',
      href: '/admin/contrats-clients',
      icon: FileText,
      badge: null
    },
    {
      name: 'Templates',
      href: '/admin/contrats-signature',
      icon: FileText,
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
      name: 'SEO Hub',
      href: '/admin/seo-hub',
      icon: TrendingUp,
      badge: null
    },
    {
      name: 'Dataflow',
      href: '/admin/dataflow',
      icon: Activity,
      badge: null
    },
    {
      name: 'API Explorer',
      href: '/admin/api-explorer',
      icon: Code,
      badge: null
    },
    {
      name: 'DevOps',
      href: '/admin/dashboard?tab=devops',
      icon: Rocket,
      badge: null
    }
  ]

  const isActive = (href: string) => {
    if (currentPage) {
      return currentPage === href
    }
    return pathname === href || pathname === href.split('?')[0]
  }

  const formatTime = () => {
    return currentTime.toLocaleTimeString('fr-CA', {
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <>
      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-white border-b border-gray-200 shadow-sm z-50 flex items-center justify-between px-4">
        <button
          onClick={() => router.push('/admin/dashboard')}
          className="flex items-center gap-2"
        >
          <div className="w-10 h-10 bg-gradient-to-br from-[#10B981] to-emerald-600 rounded-lg flex items-center justify-center shadow-sm">
            <span className="text-white font-bold text-lg">$</span>
          </div>
          <div>
            <h1 className="text-base font-bold text-gray-900">SAR Admin</h1>
          </div>
        </button>

        <div className="flex items-center gap-2">
          {/* Notifications */}
          <button className="relative p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
            <Bell size={20} />
            {(messagesCount + supportCount) > 0 && (
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
            )}
          </button>

          {/* Mobile Menu Toggle */}
          <button
            onClick={() => setIsMobileOpen(!isMobileOpen)}
            className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            {isMobileOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Desktop Sidebar */}
      <aside
        className={`
          hidden lg:flex flex-col fixed left-0 top-0 h-screen bg-[#23282d] text-white shadow-xl z-40
          transition-all duration-300 ease-in-out
          ${isCollapsed ? 'w-16' : 'w-64'}
        `}
      >
        {/* Logo Section */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-gray-700">
          {!isCollapsed && (
            <button
              onClick={() => router.push('/admin/dashboard')}
              className="flex items-center gap-2 hover:opacity-80 transition-opacity"
            >
              <div className="w-10 h-10 bg-gradient-to-br from-[#10B981] to-emerald-600 rounded-lg flex items-center justify-center shadow-lg">
                <span className="text-white font-bold text-lg">$</span>
              </div>
              <div>
                <h1 className="text-sm font-bold">SAR Admin</h1>
                <p className="text-[10px] text-gray-400">Solution Argent Rapide</p>
              </div>
            </button>
          )}

          {isCollapsed && (
            <button
              onClick={() => router.push('/admin/dashboard')}
              className="w-10 h-10 bg-gradient-to-br from-[#10B981] to-emerald-600 rounded-lg flex items-center justify-center shadow-lg mx-auto"
            >
              <span className="text-white font-bold text-lg">$</span>
            </button>
          )}
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 overflow-y-auto py-4 scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent">
          <div className="space-y-1 px-2">
            {navItems.map((item) => {
              const Icon = item.icon
              const active = isActive(item.href)

              return (
                <button
                  key={item.name}
                  onClick={() => router.push(item.href)}
                  className={`
                    w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all
                    ${active
                      ? 'bg-[#10B981] text-white shadow-md'
                      : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                    }
                    ${isCollapsed ? 'justify-center' : ''}
                  `}
                  title={isCollapsed ? item.name : ''}
                >
                  <Icon size={20} className="flex-shrink-0" />
                  {!isCollapsed && (
                    <>
                      <span className="flex-1 text-left">{item.name}</span>
                      {item.badge !== null && item.badge > 0 && (
                        <span className={`
                          min-w-[20px] h-5 px-1.5 flex items-center justify-center
                          rounded-full text-xs font-bold
                          ${active ? 'bg-white text-[#10B981]' : 'bg-red-500 text-white'}
                        `}>
                          {item.badge}
                        </span>
                      )}
                    </>
                  )}
                  {isCollapsed && item.badge !== null && item.badge > 0 && (
                    <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
                  )}
                </button>
              )
            })}
          </div>
        </nav>

        {/* Bottom Section - User & Collapse */}
        <div className="border-t border-gray-700 p-3">
          {/* Time */}
          {mounted && !isCollapsed && (
            <div className="flex items-center gap-2 px-3 py-2 text-xs text-gray-400 mb-2">
              <Clock size={14} />
              <span>{formatTime()}</span>
            </div>
          )}

          {/* Logout */}
          <button
            onClick={handleLogout}
            className={`
              w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium
              text-gray-300 hover:bg-red-600 hover:text-white transition-all
              ${isCollapsed ? 'justify-center' : ''}
            `}
            title={isCollapsed ? 'Déconnexion' : ''}
          >
            <LogOut size={20} />
            {!isCollapsed && <span>Déconnexion</span>}
          </button>

          {/* Collapse Toggle */}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 mt-2 rounded-lg text-xs font-medium text-gray-400 hover:bg-gray-700 hover:text-white transition-all"
          >
            {isCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
            {!isCollapsed && <span>Réduire</span>}
          </button>
        </div>
      </aside>

      {/* Mobile Sidebar Overlay */}
      {isMobileOpen && (
        <>
          {/* Backdrop */}
          <div
            className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-40"
            onClick={() => setIsMobileOpen(false)}
          />

          {/* Mobile Sidebar */}
          <aside className="lg:hidden fixed left-0 top-16 bottom-0 w-64 bg-[#23282d] text-white shadow-xl z-50 overflow-y-auto">
            <nav className="py-4">
              <div className="space-y-1 px-2">
                {navItems.map((item) => {
                  const Icon = item.icon
                  const active = isActive(item.href)

                  return (
                    <button
                      key={item.name}
                      onClick={() => {
                        router.push(item.href)
                        setIsMobileOpen(false)
                      }}
                      className={`
                        w-full flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium transition-all
                        ${active
                          ? 'bg-[#10B981] text-white'
                          : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                        }
                      `}
                    >
                      <Icon size={20} />
                      <span className="flex-1 text-left">{item.name}</span>
                      {item.badge !== null && item.badge > 0 && (
                        <span className={`
                          min-w-[20px] h-5 px-1.5 flex items-center justify-center
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
            </nav>

            {/* Mobile Bottom */}
            <div className="border-t border-gray-700 p-3 mt-4">
              <button
                onClick={() => {
                  handleLogout()
                  setIsMobileOpen(false)
                }}
                className="w-full flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium text-gray-300 hover:bg-red-600 hover:text-white transition-all"
              >
                <LogOut size={20} />
                <span>Déconnexion</span>
              </button>
            </div>
          </aside>
        </>
      )}
    </>
  )
}
