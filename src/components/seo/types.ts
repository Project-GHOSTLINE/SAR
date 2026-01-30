// Types pour le module SEO Command Center + Explorer IP

export interface SeoKpis {
  ga4: {
    users: number;
    sessions: number;
    conversions: number;
    engagement_rate: number;
    bounce_rate: number;
    trend: {
      users: number;
      sessions: number;
      conversions: number;
    };
  };
  gsc: {
    clicks: number;
    impressions: number;
    ctr: number;
    position: number;
    trend: {
      clicks: number;
      impressions: number;
    };
  };
  semrush: {
    keywords: number;
    traffic: number;
    rank: number;
    authority: number;
    backlinks: number;
    trend: {
      keywords: number;
      traffic: number;
    };
  };
  speed: {
    lcp_p75: number | null;
    inp_p75: number | null;
    cls_p75: number | null;
    ttfb_p75: number | null;
    status: "GOOD" | "WARN" | "CRIT" | null;
    samples: number;
    mobile_lcp: number | null;
    desktop_lcp: number | null;
  };
}

export interface TimelinePoint {
  date: string;
  ga4_users: number;
  ga4_sessions: number;
  ga4_conversions: number;
  gsc_clicks: number;
  gsc_impressions: number;
  semrush_keywords: number;
  avg_lcp_p75: number | null;
  perf_status: "GOOD" | "WARN" | "CRIT" | null;
}

export interface TopPage {
  path: string;
  views?: number;
  count?: number;
}

export interface SeoOverview {
  kpis: SeoKpis;
  timeline: TimelinePoint[];
  topPages: TopPage[];
  meta: {
    range: string;
    days: number;
    dataPoints: number;
    lastUpdated: string;
  };
}

export interface IpIntelligence {
  ip: string;
  first_seen: string;
  last_seen: string;
  landing_page: string;
  most_visited_page: string;
  total_requests: number;
  active_days: number;
  unique_pages: number;
  avg_duration_ms: number;
  p50_duration_ms: number;
  p95_duration_ms: number;
  device: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  vercel_region: string | null;
  success_count: number;
  client_error_count: number;
  server_error_count: number;
}

export interface IpStats {
  total_requests: number;
  unique_paths: number;
  avg_duration: number;
  success_rate: number;
  regions: string[];
}

export interface PathCount {
  path: string;
  count: number;
}

export interface DailyActivity {
  date: string;
  count: number;
}

export interface RequestTimeline {
  timestamp: string;
  path: string;
  duration_ms: number;
  status: number;
  region: string | null;
}

export interface IpData {
  intelligence: IpIntelligence;
  stats: IpStats;
  topPaths: PathCount[];
  dailyActivity: DailyActivity[];
  timeline: RequestTimeline[];
  meta: {
    range: string;
    days: number;
    timeline_size: number;
  };
}

export interface SpeedSummary {
  avg_lcp_p75: number;
  avg_inp_p75: number;
  avg_cls_p75: number;
  avg_ttfb_p75: number;
  total_samples: number;
  perf_status_distribution: {
    GOOD: number;
    WARN: number;
    CRIT: number;
  };
}

export interface SpeedTimelinePoint {
  date: string;
  avg_lcp_p75: number;
  avg_inp_p75: number;
  avg_cls_p75: number;
  samples: number;
  worst_status: "GOOD" | "WARN" | "CRIT";
}

export interface SpeedByPage {
  path: string;
  avg_lcp_p75: number;
  avg_inp_p75: number;
  avg_cls_p75: number;
  samples: number;
  worst_status: "GOOD" | "WARN" | "CRIT";
}

export interface SpeedByDevice {
  device: string;
  avg_lcp_p75: number;
  avg_inp_p75: number;
  avg_cls_p75: number;
  samples: number;
}

export interface SpeedData {
  summary: SpeedSummary | null;
  timeline: SpeedTimelinePoint[];
  byPage: SpeedByPage[];
  byDevice: SpeedByDevice[];
  meta: {
    range: string;
    days: number;
    path: string;
    device: string;
    dataPoints: number;
  };
  message?: string;
}

export type RangeOption = "7d" | "30d" | "90d";
export type DeviceOption = "all" | "mobile" | "desktop";
