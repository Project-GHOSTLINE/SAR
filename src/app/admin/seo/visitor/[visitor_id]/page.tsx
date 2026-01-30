'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import {
  User,
  MapPin,
  Clock,
  Activity,
  Target,
  Zap,
  ExternalLink,
  CheckCircle,
  XCircle,
  AlertCircle
} from 'lucide-react';

interface VisitorData {
  visitor_id: string;
  identity: {
    ips: string[];
    unique_ips: number;
    sessions: string[];
    unique_sessions: number;
    user_id: string | null;
  };
  metrics: {
    total_requests: number;
    unique_pages: number;
    active_days: number;
    first_seen: string;
    last_seen: string;
    session_duration_seconds: number;
    landing_page: string;
    most_visited_page: string;
  };
  performance: {
    p50_duration_ms: number;
    p95_duration_ms: number;
    avg_duration_ms: number;
    status_2xx_count: number;
    status_4xx_count: number;
    status_5xx_count: number;
  };
  conversion: {
    has_application: boolean;
    application_id: string | null;
    application_reference: string | null;
    application_status: string | null;
    client_email: string | null;
    client_phone: string | null;
    client_name: string | null;
  };
  timeline: Array<{
    trace_id: string;
    created_at: string;
    ip: string;
    method: string;
    path: string;
    status: number;
    duration_ms: number;
  }>;
  ips_detailed: Array<{
    ip: string;
    request_count: number;
    first_seen: string;
    last_seen: string;
    unique_pages: number;
    avg_duration_ms: number;
  }>;
}

export default function VisitorDossierPage() {
  const params = useParams();
  const visitorId = params.visitor_id as string;
  const [data, setData] = useState<VisitorData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch(`/api/seo/visitor/${visitorId}`);
        if (!res.ok) {
          throw new Error(`Failed to fetch: ${res.statusText}`);
        }
        const json = await res.json();
        setData(json);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [visitorId]);

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <h3 className="font-semibold text-red-900 mb-2">Erreur</h3>
          <p className="text-red-700">{error || 'Visitor not found'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-2">
          <User className="w-8 h-8 text-blue-500" />
          <h1 className="text-3xl font-bold">Visitor Dossier</h1>
        </div>
        <p className="text-gray-600 font-mono text-sm">{visitorId}</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600">Total Requests</span>
            <Activity className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-2xl font-bold">{data.metrics.total_requests}</div>
        </div>

        <div className="bg-white rounded-lg border p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600">Unique IPs</span>
            <MapPin className="w-4 h-4 text-green-500" />
          </div>
          <div className="text-2xl font-bold">{data.identity.unique_ips}</div>
        </div>

        <div className="bg-white rounded-lg border p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600">Pages Visited</span>
            <Target className="w-4 h-4 text-purple-500" />
          </div>
          <div className="text-2xl font-bold">{data.metrics.unique_pages}</div>
        </div>

        <div className="bg-white rounded-lg border p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600">Active Days</span>
            <Clock className="w-4 h-4 text-orange-500" />
          </div>
          <div className="text-2xl font-bold">{data.metrics.active_days}</div>
        </div>
      </div>

      {/* Conversion Status */}
      {data.conversion.has_application && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-6">
          <div className="flex items-start gap-4">
            <CheckCircle className="w-6 h-6 text-green-600 mt-1" />
            <div className="flex-1">
              <h3 className="font-semibold text-green-900 mb-2">✅ Conversion Réussie</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-green-700 font-medium">Application:</span>
                  <span className="ml-2 text-green-900">{data.conversion.application_reference}</span>
                </div>
                <div>
                  <span className="text-green-700 font-medium">Status:</span>
                  <span className="ml-2 text-green-900">{data.conversion.application_status}</span>
                </div>
                {data.conversion.client_name && (
                  <div>
                    <span className="text-green-700 font-medium">Client:</span>
                    <span className="ml-2 text-green-900">{data.conversion.client_name}</span>
                  </div>
                )}
                {data.conversion.client_email && (
                  <div>
                    <span className="text-green-700 font-medium">Email:</span>
                    <span className="ml-2 text-green-900">{data.conversion.client_email}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Multi-IP Tracking */}
      {data.identity.unique_ips > 1 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <div className="flex items-center gap-2 mb-4">
            <MapPin className="w-5 h-5 text-blue-600" />
            <h3 className="font-semibold text-blue-900">
              Multi-IP Tracking ({data.identity.unique_ips} IPs)
            </h3>
          </div>
          <div className="space-y-3">
            {data.ips_detailed.map((ip) => (
              <div key={ip.ip} className="bg-white rounded p-4 flex items-center justify-between">
                <div>
                  <a
                    href={`/admin/seo/ip/${ip.ip}`}
                    className="font-mono text-blue-600 hover:underline flex items-center gap-2"
                  >
                    {ip.ip}
                    <ExternalLink className="w-3 h-3" />
                  </a>
                  <div className="text-sm text-gray-600 mt-1">
                    {ip.request_count} requests • {ip.unique_pages} pages
                  </div>
                </div>
                <div className="text-right text-sm text-gray-500">
                  <div>{new Date(ip.first_seen).toLocaleString()}</div>
                  <div>→ {new Date(ip.last_seen).toLocaleString()}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Timeline */}
      <div className="bg-white rounded-lg border">
        <div className="p-4 border-b">
          <h3 className="font-semibold flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Request Timeline
          </h3>
        </div>
        <div className="divide-y max-h-96 overflow-y-auto">
          {data.timeline.slice(0, 50).map((req) => (
            <div key={req.trace_id} className="p-4 hover:bg-gray-50 font-mono text-sm">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <span className={`
                    px-2 py-1 rounded text-xs font-bold
                    ${req.status >= 200 && req.status < 300 ? 'bg-green-100 text-green-700' : ''}
                    ${req.status >= 400 && req.status < 500 ? 'bg-yellow-100 text-yellow-700' : ''}
                    ${req.status >= 500 ? 'bg-red-100 text-red-700' : ''}
                  `}>
                    {req.status}
                  </span>
                  <span className="text-gray-600">{req.method}</span>
                  <span className="text-gray-900">{req.path}</span>
                </div>
                <div className="flex items-center gap-4 text-gray-500">
                  <span>{req.ip}</span>
                  <span>{req.duration_ms}ms</span>
                  <span>{new Date(req.created_at).toLocaleTimeString()}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Performance */}
      <div className="bg-white rounded-lg border p-6">
        <h3 className="font-semibold mb-4 flex items-center gap-2">
          <Zap className="w-5 h-5" />
          Performance Metrics
        </h3>
        <div className="grid grid-cols-3 gap-6">
          <div>
            <div className="text-sm text-gray-600 mb-1">P50 Duration</div>
            <div className="text-2xl font-bold">{data.performance.p50_duration_ms}ms</div>
          </div>
          <div>
            <div className="text-sm text-gray-600 mb-1">P95 Duration</div>
            <div className="text-2xl font-bold">{data.performance.p95_duration_ms}ms</div>
          </div>
          <div>
            <div className="text-sm text-gray-600 mb-1">Avg Duration</div>
            <div className="text-2xl font-bold">{data.performance.avg_duration_ms}ms</div>
          </div>
        </div>
      </div>
    </div>
  );
}
