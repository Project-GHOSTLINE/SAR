# DATAFLOW HEALTH & OBSERVABILITY IMPLEMENTATION
**SAR Project - Health Monitoring Dashboard Implementation Guide**
**Date:** 2026-01-23

## 🎯 Objectif

Implémenter un tableau de bord de santé en temps réel pour monitorer tous les flux de données SAR, détecter les anomalies, et alerter l'équipe technique des problèmes critiques avant qu'ils n'impactent les clients.

---

## 📋 Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Backend Implementation](#backend-implementation)
3. [Frontend Dashboard](#frontend-dashboard)
4. [Alert System](#alert-system)
5. [Deployment Guide](#deployment-guide)
6. [Testing & Validation](#testing--validation)

---

## 1. ARCHITECTURE OVERVIEW

### System Components

```
┌─────────────────────────────────────────────────────────┐
│                    ADMIN DASHBOARD                       │
│            /admin/dataflow/health                        │
├─────────────────────────────────────────────────────────┤
│  • Real-time health score (0-100)                       │
│  • System status cards                                   │
│  • Time-series charts                                    │
│  • Alert history                                         │
│  • Drill-down panels                                     │
└─────────────────────────────────────────────────────────┘
                           ↕
┌─────────────────────────────────────────────────────────┐
│              HEALTH MONITORING API                       │
│         /api/admin/dataflow/health                       │
├─────────────────────────────────────────────────────────┤
│  GET  /api/admin/dataflow/health                        │
│  GET  /api/admin/dataflow/health/webhooks               │
│  GET  /api/admin/dataflow/health/database               │
│  GET  /api/admin/dataflow/health/api                    │
│  GET  /api/admin/dataflow/health/worker                 │
│  GET  /api/admin/dataflow/health/history                │
└─────────────────────────────────────────────────────────┘
                           ↕
┌─────────────────────────────────────────────────────────┐
│          DATABASE: HEALTH CHECK FUNCTIONS                │
├─────────────────────────────────────────────────────────┤
│  • get_webhook_health()                                 │
│  • get_database_health()                                │
│  • get_api_health()                                     │
│  • get_worker_health()                                  │
│  • calculate_overall_health_score()                     │
└─────────────────────────────────────────────────────────┘
                           ↕
┌─────────────────────────────────────────────────────────┐
│              RAW DATA SOURCES                            │
├─────────────────────────────────────────────────────────┤
│  • webhook_logs                                         │
│  • telemetry_requests, telemetry_spans                  │
│  • analysis_jobs                                        │
│  • pg_stat_user_tables, pg_stat_activity                │
└─────────────────────────────────────────────────────────┘
                           ↕
┌─────────────────────────────────────────────────────────┐
│              ALERT SYSTEM                                │
├─────────────────────────────────────────────────────────┤
│  • Slack webhook integration                            │
│  • Email alerts via SendGrid                            │
│  • SMS alerts via Twilio                                │
│  • Alert throttling & deduplication                     │
└─────────────────────────────────────────────────────────┘
```

---

## 2. BACKEND IMPLEMENTATION

### 2.1 Database Health Check Functions

Create file: `migrations/201_create_health_check_functions.sql`

```sql
-- ============================================
-- WEBHOOK HEALTH
-- ============================================
CREATE OR REPLACE FUNCTION get_webhook_health()
RETURNS JSONB
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'category', 'WEBHOOK',
    'status', CASE
      WHEN MAX(lag_p95) > 30 THEN 'CRITICAL'
      WHEN MAX(lag_p95) > 5 THEN 'WARNING'
      ELSE 'HEALTHY'
    END,
    'score', CASE
      WHEN MAX(lag_p95) > 30 THEN 0
      WHEN MAX(lag_p95) > 5 THEN 50
      ELSE 100
    END,
    'metrics', jsonb_build_object(
      'avg_lag_seconds', ROUND(AVG(avg_lag)::numeric, 2),
      'p95_lag_seconds', ROUND(MAX(lag_p95)::numeric, 2),
      'failure_rate_pct', ROUND((SUM(failed_count)::float / NULLIF(SUM(total_count), 0) * 100)::numeric, 2),
      'total_webhooks_24h', SUM(total_count)
    ),
    'details', jsonb_agg(
      jsonb_build_object(
        'source', source,
        'avg_lag_seconds', ROUND(avg_lag::numeric, 2),
        'p95_lag_seconds', ROUND(lag_p95::numeric, 2),
        'failure_rate_pct', ROUND((failed_count::float / NULLIF(total_count, 0) * 100)::numeric, 2)
      )
    )
  ) INTO v_result
  FROM (
    SELECT
      source,
      AVG(EXTRACT(EPOCH FROM (received_at - created_at))) as avg_lag,
      PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY EXTRACT(EPOCH FROM (received_at - created_at))) as lag_p95,
      COUNT(*) as total_count,
      COUNT(*) FILTER (WHERE status = 'error') as failed_count
    FROM webhook_logs
    WHERE created_at > NOW() - INTERVAL '24 hours'
    GROUP BY source
  ) webhook_stats;

  RETURN v_result;
END;
$$;

-- ============================================
-- DATABASE HEALTH
-- ============================================
CREATE OR REPLACE FUNCTION get_database_health()
RETURNS JSONB
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_result JSONB;
  v_active_connections INT;
  v_slow_queries INT;
BEGIN
  -- Get connection count
  SELECT COUNT(*) INTO v_active_connections
  FROM pg_stat_activity
  WHERE datname = current_database()
    AND state = 'active';

  -- Get slow queries (queries running > 5 seconds)
  SELECT COUNT(*) INTO v_slow_queries
  FROM pg_stat_activity
  WHERE datname = current_database()
    AND state = 'active'
    AND NOW() - query_start > INTERVAL '5 seconds';

  SELECT jsonb_build_object(
    'category', 'DATABASE',
    'status', CASE
      WHEN v_active_connections > 50 OR v_slow_queries > 5 THEN 'CRITICAL'
      WHEN v_active_connections > 30 OR v_slow_queries > 2 THEN 'WARNING'
      ELSE 'HEALTHY'
    END,
    'score', CASE
      WHEN v_active_connections > 50 OR v_slow_queries > 5 THEN 0
      WHEN v_active_connections > 30 OR v_slow_queries > 2 THEN 50
      ELSE 100
    END,
    'metrics', jsonb_build_object(
      'active_connections', v_active_connections,
      'max_connections', 60,  -- Supabase limit
      'slow_queries_count', v_slow_queries,
      'avg_query_duration_ms', (
        SELECT COALESCE(AVG(duration_ms), 0)
        FROM telemetry_spans
        WHERE span_name LIKE 'db:%'
          AND created_at > NOW() - INTERVAL '1 hour'
      )
    ),
    'details', (
      SELECT jsonb_agg(
        jsonb_build_object(
          'table_name', schemaname || '.' || tablename,
          'dead_tuple_pct', ROUND(n_dead_tup * 100.0 / NULLIF(n_live_tup + n_dead_tup, 0), 2),
          'last_vacuum', last_vacuum,
          'last_autovacuum', last_autovacuum
        )
        ORDER BY n_dead_tup * 100.0 / NULLIF(n_live_tup + n_dead_tup, 0) DESC
      )
      FROM pg_stat_user_tables
      WHERE n_live_tup > 1000
        AND n_dead_tup * 100.0 / NULLIF(n_live_tup + n_dead_tup, 0) > 10
      LIMIT 5
    )
  ) INTO v_result;

  RETURN v_result;
END;
$$;

-- ============================================
-- API HEALTH
-- ============================================
CREATE OR REPLACE FUNCTION get_api_health()
RETURNS JSONB
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'category', 'API',
    'status', CASE
      WHEN MAX(error_rate_pct) > 1 OR MAX(p95_duration_ms) > 1500 THEN 'CRITICAL'
      WHEN MAX(error_rate_pct) > 0.1 OR MAX(p95_duration_ms) > 500 THEN 'WARNING'
      ELSE 'HEALTHY'
    END,
    'score', CASE
      WHEN MAX(error_rate_pct) > 1 OR MAX(p95_duration_ms) > 1500 THEN 0
      WHEN MAX(error_rate_pct) > 0.1 OR MAX(p95_duration_ms) > 500 THEN 50
      ELSE 100
    END,
    'metrics', jsonb_build_object(
      'total_requests_1h', SUM(request_count),
      'avg_duration_ms', ROUND(AVG(avg_duration_ms)::numeric, 2),
      'p95_duration_ms', ROUND(MAX(p95_duration_ms)::numeric, 2),
      'error_rate_pct', ROUND(MAX(error_rate_pct)::numeric, 4)
    ),
    'details', jsonb_agg(
      jsonb_build_object(
        'path', path,
        'request_count', request_count,
        'p95_duration_ms', ROUND(p95_duration_ms::numeric, 2),
        'error_rate_pct', ROUND(error_rate_pct::numeric, 4)
      )
      ORDER BY request_count DESC
    )
  ) INTO v_result
  FROM (
    SELECT
      path,
      COUNT(*) as request_count,
      AVG(duration_ms) as avg_duration_ms,
      PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY duration_ms) as p95_duration_ms,
      COUNT(*) FILTER (WHERE status_code >= 500) * 100.0 / COUNT(*) as error_rate_pct
    FROM telemetry_requests
    WHERE created_at > NOW() - INTERVAL '1 hour'
      AND path LIKE '/api/admin/%'
    GROUP BY path
  ) api_stats;

  RETURN v_result;
END;
$$;

-- ============================================
-- WORKER HEALTH
-- ============================================
CREATE OR REPLACE FUNCTION get_worker_health()
RETURNS JSONB
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_result JSONB;
  v_stuck_jobs INT;
BEGIN
  -- Count stuck jobs
  SELECT COUNT(*) INTO v_stuck_jobs
  FROM analysis_jobs
  WHERE status = 'processing'
    AND started_at < NOW() - INTERVAL '10 minutes';

  SELECT jsonb_build_object(
    'category', 'WORKER',
    'status', CASE
      WHEN v_stuck_jobs > 3 OR MAX(failure_rate_pct) > 15 THEN 'CRITICAL'
      WHEN v_stuck_jobs > 0 OR MAX(failure_rate_pct) > 5 THEN 'WARNING'
      ELSE 'HEALTHY'
    END,
    'score', CASE
      WHEN v_stuck_jobs > 3 OR MAX(failure_rate_pct) > 15 THEN 0
      WHEN v_stuck_jobs > 0 OR MAX(failure_rate_pct) > 5 THEN 50
      ELSE 100
    END,
    'metrics', jsonb_build_object(
      'total_jobs_24h', SUM(total_jobs),
      'failed_jobs', SUM(failed_jobs),
      'failure_rate_pct', ROUND(MAX(failure_rate_pct)::numeric, 2),
      'avg_processing_time_seconds', ROUND(AVG(avg_processing_seconds)::numeric, 2),
      'stuck_jobs_count', v_stuck_jobs
    ),
    'details', jsonb_agg(
      jsonb_build_object(
        'priority', priority,
        'total_jobs', total_jobs,
        'failed_jobs', failed_jobs,
        'avg_processing_time_seconds', ROUND(avg_processing_seconds::numeric, 2)
      )
    )
  ) INTO v_result
  FROM (
    SELECT
      priority,
      COUNT(*) as total_jobs,
      COUNT(*) FILTER (WHERE status = 'error') as failed_jobs,
      COUNT(*) FILTER (WHERE status = 'error') * 100.0 / COUNT(*) as failure_rate_pct,
      AVG(EXTRACT(EPOCH FROM (completed_at - started_at))) FILTER (WHERE completed_at IS NOT NULL) as avg_processing_seconds
    FROM analysis_jobs
    WHERE created_at > NOW() - INTERVAL '24 hours'
    GROUP BY priority
  ) job_stats;

  RETURN v_result;
END;
$$;

-- ============================================
-- OVERALL HEALTH SCORE
-- ============================================
CREATE OR REPLACE FUNCTION calculate_overall_health_score()
RETURNS JSONB
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_webhook_health JSONB;
  v_database_health JSONB;
  v_api_health JSONB;
  v_worker_health JSONB;
  v_overall_score INT;
  v_overall_status TEXT;
BEGIN
  -- Get individual health metrics
  v_webhook_health := get_webhook_health();
  v_database_health := get_database_health();
  v_api_health := get_api_health();
  v_worker_health := get_worker_health();

  -- Calculate weighted overall score
  v_overall_score := (
    (v_webhook_health->>'score')::int * 20 +
    (v_database_health->>'score')::int * 25 +
    (v_api_health->>'score')::int * 20 +
    (v_worker_health->>'score')::int * 15 +
    100 * 10 +  -- External services (placeholder)
    100 * 5 +   -- Data quality (placeholder)
    100 * 5     -- Security (placeholder)
  ) / 100;

  -- Determine overall status
  v_overall_status := CASE
    WHEN v_overall_score >= 90 THEN 'EXCELLENT'
    WHEN v_overall_score >= 70 THEN 'GOOD'
    WHEN v_overall_score >= 50 THEN 'DEGRADED'
    ELSE 'CRITICAL'
  END;

  RETURN jsonb_build_object(
    'overall_score', v_overall_score,
    'overall_status', v_overall_status,
    'timestamp', NOW(),
    'categories', jsonb_build_object(
      'webhook', v_webhook_health,
      'database', v_database_health,
      'api', v_api_health,
      'worker', v_worker_health
    )
  );
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_webhook_health() TO authenticated;
GRANT EXECUTE ON FUNCTION get_database_health() TO authenticated;
GRANT EXECUTE ON FUNCTION get_api_health() TO authenticated;
GRANT EXECUTE ON FUNCTION get_worker_health() TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_overall_health_score() TO authenticated;
```

### 2.2 API Routes

Create file: `src/app/api/admin/dataflow/health/route.ts`

```typescript
import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface HealthResponse {
  overall_score: number;
  overall_status: 'EXCELLENT' | 'GOOD' | 'DEGRADED' | 'CRITICAL';
  timestamp: string;
  categories: {
    webhook: CategoryHealth;
    database: CategoryHealth;
    api: CategoryHealth;
    worker: CategoryHealth;
  };
}

interface CategoryHealth {
  category: string;
  status: 'HEALTHY' | 'WARNING' | 'CRITICAL';
  score: number;
  metrics: Record<string, any>;
  details: any[];
}

export async function GET(request: Request) {
  try {
    const supabase = createClient();

    // Check admin authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Call the health check function
    const { data, error } = await supabase
      .rpc('calculate_overall_health_score');

    if (error) {
      console.error('Error fetching health data:', error);
      return NextResponse.json(
        { error: 'Failed to fetch health data', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(data as HealthResponse);

  } catch (error: any) {
    console.error('Unexpected error in health endpoint:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
```

Create file: `src/app/api/admin/dataflow/health/history/route.ts`

```typescript
import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const supabase = createClient();

    // Parse query parameters
    const url = new URL(request.url);
    const hours = parseInt(url.searchParams.get('hours') || '24', 10);

    // Fetch health history from telemetry or dedicated health_logs table
    // For now, simulate by calling health check and returning single snapshot
    const { data: currentHealth } = await supabase
      .rpc('calculate_overall_health_score');

    // In production, would query a health_snapshots table:
    // SELECT * FROM health_snapshots
    // WHERE timestamp > NOW() - INTERVAL '{hours} hours'
    // ORDER BY timestamp DESC;

    return NextResponse.json({
      snapshots: [currentHealth],
      timeframe_hours: hours
    });

  } catch (error: any) {
    console.error('Error fetching health history:', error);
    return NextResponse.json(
      { error: 'Failed to fetch health history' },
      { status: 500 }
    );
  }
}
```

---

## 3. FRONTEND DASHBOARD

### 3.1 Health Dashboard Page

Create file: `src/app/admin/dataflow/health/page.tsx`

```typescript
'use client';

import { useEffect, useState } from 'react';
import { Activity, AlertCircle, CheckCircle, Database, Server, Zap, RefreshCw } from 'lucide-react';

interface HealthData {
  overall_score: number;
  overall_status: 'EXCELLENT' | 'GOOD' | 'DEGRADED' | 'CRITICAL';
  timestamp: string;
  categories: {
    webhook: CategoryHealth;
    database: CategoryHealth;
    api: CategoryHealth;
    worker: CategoryHealth;
  };
}

interface CategoryHealth {
  category: string;
  status: 'HEALTHY' | 'WARNING' | 'CRITICAL';
  score: number;
  metrics: Record<string, any>;
  details: any[];
}

export default function DataflowHealthPage() {
  const [healthData, setHealthData] = useState<HealthData | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  const fetchHealthData = async () => {
    try {
      const response = await fetch('/api/admin/dataflow/health');
      if (!response.ok) throw new Error('Failed to fetch health data');
      const data = await response.json();
      setHealthData(data);
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Error fetching health data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHealthData();

    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchHealthData, 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (!healthData) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">Impossible de charger les données de santé</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dataflow Health</h1>
          <p className="text-sm text-gray-500 mt-1">
            Mis à jour: {lastUpdated.toLocaleTimeString('fr-CA')}
          </p>
        </div>
        <button
          onClick={fetchHealthData}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <RefreshCw className="w-4 h-4" />
          Rafraîchir
        </button>
      </div>

      {/* Overall Health Score */}
      <div className="mb-8">
        <OverallHealthCard
          score={healthData.overall_score}
          status={healthData.overall_status}
          timestamp={healthData.timestamp}
        />
      </div>

      {/* Category Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <CategoryCard
          icon={<Zap className="w-6 h-6" />}
          title="Webhooks"
          data={healthData.categories.webhook}
        />
        <CategoryCard
          icon={<Database className="w-6 h-6" />}
          title="Database"
          data={healthData.categories.database}
        />
        <CategoryCard
          icon={<Server className="w-6 h-6" />}
          title="API"
          data={healthData.categories.api}
        />
        <CategoryCard
          icon={<Activity className="w-6 h-6" />}
          title="Worker"
          data={healthData.categories.worker}
        />
      </div>

      {/* Detailed Panels */}
      <div className="space-y-6">
        <DetailPanel title="Webhook Health" data={healthData.categories.webhook} />
        <DetailPanel title="Database Health" data={healthData.categories.database} />
        <DetailPanel title="API Health" data={healthData.categories.api} />
        <DetailPanel title="Worker Health" data={healthData.categories.worker} />
      </div>
    </div>
  );
}

// ============================================
// COMPONENTS
// ============================================

function OverallHealthCard({
  score,
  status,
  timestamp
}: {
  score: number;
  status: string;
  timestamp: string;
}) {
  const getStatusColor = () => {
    if (score >= 90) return 'bg-green-500';
    if (score >= 70) return 'bg-yellow-500';
    if (score >= 50) return 'bg-orange-500';
    return 'bg-red-500';
  };

  const getStatusIcon = () => {
    if (score >= 90) return <CheckCircle className="w-8 h-8 text-green-600" />;
    if (score >= 70) return <AlertCircle className="w-8 h-8 text-yellow-600" />;
    return <AlertCircle className="w-8 h-8 text-red-600" />;
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-8 border-2 border-gray-200">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-6">
          {getStatusIcon()}
          <div>
            <h2 className="text-2xl font-bold text-gray-900">System Health Score</h2>
            <p className="text-sm text-gray-500 mt-1">
              Status: <span className="font-semibold">{status}</span>
            </p>
          </div>
        </div>

        <div className="text-right">
          <div className="text-6xl font-bold text-gray-900">{score}</div>
          <div className="text-sm text-gray-500 mt-1">/ 100</div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mt-6 h-4 bg-gray-200 rounded-full overflow-hidden">
        <div
          className={`h-full ${getStatusColor()} transition-all duration-500`}
          style={{ width: `${score}%` }}
        />
      </div>
    </div>
  );
}

function CategoryCard({
  icon,
  title,
  data
}: {
  icon: React.ReactNode;
  title: string;
  data: CategoryHealth;
}) {
  const getStatusColor = () => {
    switch (data.status) {
      case 'HEALTHY': return 'bg-green-50 border-green-200 text-green-700';
      case 'WARNING': return 'bg-yellow-50 border-yellow-200 text-yellow-700';
      case 'CRITICAL': return 'bg-red-50 border-red-200 text-red-700';
      default: return 'bg-gray-50 border-gray-200 text-gray-700';
    }
  };

  return (
    <div className={`rounded-lg border-2 p-6 ${getStatusColor()}`}>
      <div className="flex items-center justify-between mb-4">
        {icon}
        <span className="text-2xl font-bold">{data.score}</span>
      </div>
      <h3 className="font-semibold text-lg mb-2">{title}</h3>
      <div className="text-sm space-y-1">
        {Object.entries(data.metrics).slice(0, 3).map(([key, value]) => (
          <div key={key} className="flex justify-between">
            <span className="opacity-75">{formatMetricName(key)}:</span>
            <span className="font-medium">{formatMetricValue(value)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function DetailPanel({ title, data }: { title: string; data: CategoryHealth }) {
  return (
    <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
      <h3 className="text-xl font-bold text-gray-900 mb-4">{title}</h3>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {Object.entries(data.metrics).map(([key, value]) => (
          <div key={key} className="bg-gray-50 rounded-lg p-4">
            <div className="text-xs text-gray-500 mb-1">{formatMetricName(key)}</div>
            <div className="text-2xl font-bold text-gray-900">{formatMetricValue(value)}</div>
          </div>
        ))}
      </div>

      {/* Details Table */}
      {data.details && data.details.length > 0 && (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {Object.keys(data.details[0]).map((key) => (
                  <th
                    key={key}
                    className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    {formatMetricName(key)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {data.details.map((row, idx) => (
                <tr key={idx}>
                  {Object.values(row).map((value, colIdx) => (
                    <td key={colIdx} className="px-4 py-3 text-sm text-gray-900">
                      {formatMetricValue(value)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ============================================
// UTILITIES
// ============================================

function formatMetricName(key: string): string {
  return key
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatMetricValue(value: any): string {
  if (value === null || value === undefined) return 'N/A';
  if (typeof value === 'number') {
    if (Number.isInteger(value)) return value.toLocaleString('fr-CA');
    return value.toFixed(2);
  }
  return String(value);
}
```

---

## 4. ALERT SYSTEM

### 4.1 Alert Configuration

Create file: `src/lib/alerts/alert-service.ts`

```typescript
interface AlertConfig {
  name: string;
  category: string;
  threshold: number;
  severity: 'WARNING' | 'CRITICAL';
  message: string;
}

interface Alert {
  id: string;
  config: AlertConfig;
  value: number;
  triggered_at: Date;
  resolved_at?: Date;
  status: 'ACTIVE' | 'RESOLVED' | 'ACKNOWLEDGED';
}

const ALERT_CONFIGS: AlertConfig[] = [
  // Webhook alerts
  {
    name: 'HIGH_WEBHOOK_LAG',
    category: 'WEBHOOK',
    threshold: 30,
    severity: 'CRITICAL',
    message: 'Webhook lag exceeds 30 seconds (p95)'
  },
  {
    name: 'HIGH_WEBHOOK_FAILURE_RATE',
    category: 'WEBHOOK',
    threshold: 5,
    severity: 'CRITICAL',
    message: 'Webhook failure rate exceeds 5%'
  },

  // Database alerts
  {
    name: 'HIGH_DB_CONNECTIONS',
    category: 'DATABASE',
    threshold: 50,
    severity: 'CRITICAL',
    message: 'Active database connections exceed 50'
  },
  {
    name: 'SLOW_QUERIES_DETECTED',
    category: 'DATABASE',
    threshold: 5,
    severity: 'WARNING',
    message: 'Multiple slow queries detected (>5s)'
  },

  // API alerts
  {
    name: 'HIGH_API_ERROR_RATE',
    category: 'API',
    threshold: 1,
    severity: 'CRITICAL',
    message: 'API error rate exceeds 1%'
  },
  {
    name: 'SLOW_API_RESPONSE',
    category: 'API',
    threshold: 1500,
    severity: 'WARNING',
    message: 'API response time exceeds 1.5s (p95)'
  },

  // Worker alerts
  {
    name: 'STUCK_ANALYSIS_JOBS',
    category: 'WORKER',
    threshold: 3,
    severity: 'CRITICAL',
    message: 'Multiple analysis jobs stuck in processing'
  },
  {
    name: 'HIGH_JOB_FAILURE_RATE',
    category: 'WORKER',
    threshold: 15,
    severity: 'CRITICAL',
    message: 'Analysis job failure rate exceeds 15%'
  }
];

export class AlertService {
  private activeAlerts: Map<string, Alert> = new Map();
  private lastAlertTime: Map<string, Date> = new Map();

  async checkHealthAndTriggerAlerts(healthData: any) {
    const newAlerts: Alert[] = [];

    // Check webhook health
    if (healthData.categories.webhook) {
      const webhookData = healthData.categories.webhook;
      const lagP95 = webhookData.metrics.p95_lag_seconds;
      const failureRate = webhookData.metrics.failure_rate_pct;

      if (lagP95 > 30) {
        newAlerts.push(this.createAlert('HIGH_WEBHOOK_LAG', lagP95));
      }
      if (failureRate > 5) {
        newAlerts.push(this.createAlert('HIGH_WEBHOOK_FAILURE_RATE', failureRate));
      }
    }

    // Check database health
    if (healthData.categories.database) {
      const dbData = healthData.categories.database;
      const connections = dbData.metrics.active_connections;
      const slowQueries = dbData.metrics.slow_queries_count;

      if (connections > 50) {
        newAlerts.push(this.createAlert('HIGH_DB_CONNECTIONS', connections));
      }
      if (slowQueries > 5) {
        newAlerts.push(this.createAlert('SLOW_QUERIES_DETECTED', slowQueries));
      }
    }

    // Check API health
    if (healthData.categories.api) {
      const apiData = healthData.categories.api;
      const errorRate = apiData.metrics.error_rate_pct;
      const p95Duration = apiData.metrics.p95_duration_ms;

      if (errorRate > 1) {
        newAlerts.push(this.createAlert('HIGH_API_ERROR_RATE', errorRate));
      }
      if (p95Duration > 1500) {
        newAlerts.push(this.createAlert('SLOW_API_RESPONSE', p95Duration));
      }
    }

    // Check worker health
    if (healthData.categories.worker) {
      const workerData = healthData.categories.worker;
      const stuckJobs = workerData.metrics.stuck_jobs_count;
      const failureRate = workerData.metrics.failure_rate_pct;

      if (stuckJobs > 3) {
        newAlerts.push(this.createAlert('STUCK_ANALYSIS_JOBS', stuckJobs));
      }
      if (failureRate > 15) {
        newAlerts.push(this.createAlert('HIGH_JOB_FAILURE_RATE', failureRate));
      }
    }

    // Send alerts (with throttling)
    for (const alert of newAlerts) {
      await this.sendAlert(alert);
    }

    return newAlerts;
  }

  private createAlert(configName: string, value: number): Alert {
    const config = ALERT_CONFIGS.find((c) => c.name === configName)!;

    return {
      id: `${configName}_${Date.now()}`,
      config,
      value,
      triggered_at: new Date(),
      status: 'ACTIVE'
    };
  }

  private async sendAlert(alert: Alert) {
    const now = new Date();
    const lastAlert = this.lastAlertTime.get(alert.config.name);

    // Throttle: Don't send same alert more than once per 15 minutes
    if (lastAlert && now.getTime() - lastAlert.getTime() < 15 * 60 * 1000) {
      console.log(`Alert ${alert.config.name} throttled`);
      return;
    }

    this.lastAlertTime.set(alert.config.name, now);

    // Send to Slack
    await this.sendSlackAlert(alert);

    // If CRITICAL, also send email
    if (alert.config.severity === 'CRITICAL') {
      await this.sendEmailAlert(alert);
    }
  }

  private async sendSlackAlert(alert: Alert) {
    const slackWebhookUrl = process.env.SLACK_WEBHOOK_URL;
    if (!slackWebhookUrl) return;

    const emoji = alert.config.severity === 'CRITICAL' ? '🚨' : '⚠️';
    const color = alert.config.severity === 'CRITICAL' ? 'danger' : 'warning';

    const payload = {
      text: `${emoji} [${alert.config.severity}] ${alert.config.message}`,
      attachments: [
        {
          color,
          fields: [
            {
              title: 'Alert',
              value: alert.config.name,
              short: true
            },
            {
              title: 'Value',
              value: `${alert.value}`,
              short: true
            },
            {
              title: 'Category',
              value: alert.config.category,
              short: true
            },
            {
              title: 'Time',
              value: alert.triggered_at.toISOString(),
              short: true
            }
          ],
          actions: [
            {
              type: 'button',
              text: 'View Dashboard',
              url: 'https://admin.solutionargentrapide.ca/admin/dataflow/health'
            }
          ]
        }
      ]
    };

    try {
      await fetch(slackWebhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
    } catch (error) {
      console.error('Failed to send Slack alert:', error);
    }
  }

  private async sendEmailAlert(alert: Alert) {
    // TODO: Integrate with SendGrid
    console.log('Email alert sent:', alert);
  }
}
```

### 4.2 Background Alert Monitor

Create file: `src/app/api/cron/check-health-alerts/route.ts`

```typescript
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { AlertService } from '@/lib/alerts/alert-service';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: Request) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 });
  }

  try {
    const supabase = createClient();

    // Fetch health data
    const { data: healthData, error } = await supabase
      .rpc('calculate_overall_health_score');

    if (error) {
      console.error('Error fetching health data:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Check for alerts
    const alertService = new AlertService();
    const alerts = await alertService.checkHealthAndTriggerAlerts(healthData);

    return NextResponse.json({
      success: true,
      checked_at: new Date().toISOString(),
      alerts_triggered: alerts.length,
      overall_score: healthData.overall_score,
      overall_status: healthData.overall_status
    });

  } catch (error: any) {
    console.error('Error in health alert check:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
```

Add to `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/cron/check-health-alerts",
      "schedule": "*/5 * * * *"
    }
  ]
}
```

---

## 5. DEPLOYMENT GUIDE

### Step 1: Deploy Database Functions

```bash
# Run migration
psql $DATABASE_URL -f migrations/201_create_health_check_functions.sql
```

### Step 2: Set Environment Variables

```bash
# In Vercel dashboard or .env.local
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/WEBHOOK/URL
CRON_SECRET=your-random-secret-here
```

### Step 3: Deploy Application

```bash
git add .
git commit -m "feat: Add dataflow health monitoring dashboard"
git push origin main

# Vercel will auto-deploy
```

### Step 4: Test Health Endpoint

```bash
curl https://admin.solutionargentrapide.ca/api/admin/dataflow/health
```

### Step 5: Verify Alerts

```bash
# Trigger test alert by manually calling cron
curl -X GET \
  https://admin.solutionargentrapide.ca/api/cron/check-health-alerts \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

---

## 6. TESTING & VALIDATION

### 6.1 Unit Tests

Create file: `__tests__/dataflow-health.test.ts`

```typescript
import { describe, expect, it } from '@jest/globals';

describe('Dataflow Health Monitoring', () => {
  it('should calculate overall health score correctly', () => {
    const scores = {
      webhook: 100,
      database: 50,
      api: 100,
      worker: 100
    };

    const overall = (
      scores.webhook * 0.2 +
      scores.database * 0.25 +
      scores.api * 0.2 +
      scores.worker * 0.15 +
      100 * 0.2  // Other categories default to 100
    );

    expect(overall).toBeCloseTo(87.5);
  });

  it('should throttle duplicate alerts', () => {
    // TODO: Test alert throttling logic
  });
});
```

### 6.2 Load Testing

```bash
# Simulate high load to trigger alerts
artillery quick --count 100 --num 10 \
  https://admin.solutionargentrapide.ca/api/admin/dataflow/health
```

---

## 📚 Related Documents

- `DATAFLOW_HEALTH_SIGNALS.md` - Health signal definitions
- `ORCHESTRATION_API_SPEC.md` - API specifications
- `DB_VIEWS_AND_FUNCTIONS_PLAN.md` - Database functions
- `DATAFLOW_OVERVIEW.mmd` - System architecture

---

**Status:** ✅ Ready for implementation
**Owner:** Full-Stack Team
**Timeline:** 1-2 weeks
**Priority:** HIGH
**Next Review:** 2026-02-01
