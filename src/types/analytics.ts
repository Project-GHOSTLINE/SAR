/**
 * Types pour Google Analytics 4 Data API
 */

export interface AnalyticsDeviceData {
  category: string // 'mobile' | 'desktop' | 'tablet'
  os: string // 'iOS', 'Android', 'Windows', 'macOS', 'Linux'
  osVersion: string
  browser: string // 'Chrome', 'Safari', 'Firefox', 'Edge'
  browserVersion: string
  screenResolution: string
  mobileDeviceBranding?: string // 'Apple', 'Samsung', 'Google'
  mobileDeviceModel?: string // 'iPhone 13', 'Galaxy S21'
  platform: string // 'web', 'iOS app', 'Android app'
}

export interface AnalyticsLocationData {
  country: string
  region: string
  city: string
  latitude?: number
  longitude?: number
  continentId?: string
  subContinent?: string
}

export interface AnalyticsSourceData {
  source: string // 'google', 'direct', 'facebook'
  medium: string // 'organic', 'cpc', 'referral'
  campaign?: string
  firstUserSource?: string
  firstUserMedium?: string
}

export interface AnalyticsMetrics {
  activeUsers: number
  newUsers: number
  totalUsers: number
  sessions: number
  sessionsPerUser: number
  screenPageViews: number
  averageSessionDuration: number
  bounceRate: number
  engagementRate: number
  eventCount: number
  conversions: number
  totalRevenue: number
  engagedSessions: number
  userEngagementDuration: number
}

export interface AnalyticsPageData {
  pagePath: string
  pageTitle: string
  pageViews: number
  uniquePageViews: number
  averageTimeOnPage: number
  entrances: number
  exits: number
  exitRate: number
}

export interface AnalyticsEventData {
  eventName: string
  eventCount: number
  eventValue: number
  eventCategory?: string
  eventLabel?: string
}

export interface AnalyticsRow {
  device: AnalyticsDeviceData
  location: AnalyticsLocationData
  source: AnalyticsSourceData
  metrics: AnalyticsMetrics
  timestamp?: string
}

export interface AnalyticsResponse {
  success: boolean
  data: AnalyticsRow[]
  totalRows: number
  dateRange: {
    startDate: string
    endDate: string
  }
  summary?: {
    totalUsers: number
    totalSessions: number
    totalPageViews: number
    totalConversions: number
    totalRevenue: number
    averageSessionDuration: number
    bounceRate: number
  }
  error?: string
}

export interface AnalyticsDeviceSummary {
  category: string
  users: number
  sessions: number
  pageViews: number
  conversions: number
  revenue: number
  bounceRate: number
  avgSessionDuration: number
}

export interface AnalyticsTopPage {
  path: string
  title: string
  views: number
  uniqueViews: number
  avgTime: number
  bounceRate: number
}

export interface AnalyticsTrafficSource {
  source: string
  medium: string
  users: number
  sessions: number
  conversions: number
  revenue: number
}

export interface AnalyticsGeography {
  country: string
  city: string
  users: number
  sessions: number
  conversions: number
}

export interface AnalyticsDashboardData {
  overview: {
    totalUsers: number
    totalSessions: number
    totalPageViews: number
    totalConversions: number
    totalRevenue: number
    averageSessionDuration: number
    bounceRate: number
    newUsersRate: number
  }
  devices: AnalyticsDeviceSummary[]
  topPages: AnalyticsTopPage[]
  trafficSources: AnalyticsTrafficSource[]
  geography: AnalyticsGeography[]
  trends: {
    date: string
    users: number
    sessions: number
    pageViews: number
    conversions: number
  }[]
}

export type AnalyticsDateRange =
  | 'today'
  | 'yesterday'
  | '7daysAgo'
  | '14daysAgo'
  | '30daysAgo'
  | '90daysAgo'
  | 'custom'

export interface AnalyticsQueryParams {
  startDate: string
  endDate: string
  dimensions?: string[]
  metrics?: string[]
  filters?: Record<string, any>
  orderBy?: {
    metric: string
    desc?: boolean
  }
  limit?: number
  offset?: number
}
