"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

type DeviceProfile = {
  visit_id: string;
  ip: string;
  client_id?: string;
  user_id?: string;
  device_label: string;
  browser_label: string;
  device_type: string;
  os: string;
  os_version?: string;
  viewport_width?: string;
  viewport_height?: string;
  screen_width?: string;
  screen_height?: string;
  total_requests: number;
  total_events: number;
  page_views: number;
  form_starts: number;
  form_submits: number;
  unique_paths: number;
  first_seen: string;
  last_seen: string;
  session_duration_seconds: number;
  correlation_score: number;
  classification: string;
  fraud_score: number;
};

type TimelineEvent = {
  timestamp: string;
  event_type: "http_request" | "client_event";
  path: string;
  method?: string;
  status?: number;
  duration_ms?: number;
  event_name?: string;
  properties?: any;
};

type ClientInfo = {
  id: string;
  name: string;
  email?: string;
  phone?: string;
};

export default function DeviceDetailPage() {
  const params = useParams();
  const router = useRouter();
  const visitId = params.visit_id as string;

  const [loading, setLoading] = useState(true);
  const [device, setDevice] = useState<DeviceProfile | null>(null);
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  const [client, setClient] = useState<ClientInfo | null>(null);

  useEffect(() => {
    fetchDeviceData();
  }, [visitId]);

  async function fetchDeviceData() {
    try {
      const res = await fetch(`/api/fraud/device/${visitId}`);
      const data = await res.json();

      if (data.error) {
        alert(data.error);
        return;
      }

      setDevice(data.device);
      setTimeline(data.timeline);
      setClient(data.client);
    } catch (err) {
      console.error("Failed to fetch device data:", err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold mb-4">Device Profile</h1>
        <p>Chargement...</p>
      </div>
    );
  }

  if (!device) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold mb-4">Device Profile</h1>
        <p>Device non trouvé</p>
      </div>
    );
  }

  const sessionDuration = Math.floor(device.session_duration_seconds / 60);

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <button
            onClick={() => router.back()}
            className="text-blue-600 hover:underline mb-2"
          >
            ← Retour
          </button>
          <h1 className="text-2xl font-bold">
            {device.device_label}
          </h1>
          <p className="text-gray-600">{device.browser_label}</p>
        </div>
        <div className="text-right">
          <div
            className={`inline-block px-4 py-2 rounded text-lg font-bold ${
              device.classification === "BOT"
                ? "bg-red-100 text-red-800"
                : device.classification === "SCRAPER"
                ? "bg-orange-100 text-orange-800"
                : device.classification === "SUSPICIOUS"
                ? "bg-yellow-100 text-yellow-800"
                : device.classification === "CONVERTER"
                ? "bg-green-100 text-green-800"
                : "bg-blue-100 text-blue-800"
            }`}
          >
            {device.classification}
          </div>
          <div className="text-sm text-gray-600 mt-1">
            Fraud Score: {device.fraud_score}
          </div>
        </div>
      </div>

      {/* Client Info (if linked) */}
      {client && (
        <div className="bg-blue-50 border border-blue-200 rounded p-4">
          <h2 className="font-bold text-blue-900 mb-2">👤 Client Identifié</h2>
          <div className="text-sm">
            <div className="font-semibold">{client.name}</div>
            {client.email && <div className="text-gray-700">{client.email}</div>}
            {client.phone && <div className="text-gray-700">{client.phone}</div>}
            <a
              href={`/admin/clients/${client.id}`}
              className="text-blue-600 hover:underline mt-2 inline-block"
            >
              Voir le dossier complet →
            </a>
          </div>
        </div>
      )}

      {/* Device Info */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white border rounded p-4">
          <h3 className="font-bold mb-3">📱 Device</h3>
          <div className="space-y-2 text-sm">
            <div>
              <div className="text-gray-600">Type</div>
              <div className="font-semibold">{device.device_type || "Unknown"}</div>
            </div>
            <div>
              <div className="text-gray-600">OS</div>
              <div className="font-semibold">
                {device.os} {device.os_version}
              </div>
            </div>
            <div>
              <div className="text-gray-600">Screen</div>
              <div className="font-semibold">
                {device.screen_width && device.screen_height
                  ? `${device.screen_width}×${device.screen_height}`
                  : "Unknown"}
              </div>
            </div>
            <div>
              <div className="text-gray-600">Viewport</div>
              <div className="font-semibold">
                {device.viewport_width && device.viewport_height
                  ? `${device.viewport_width}×${device.viewport_height}`
                  : "Unknown"}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white border rounded p-4">
          <h3 className="font-bold mb-3">📊 Activity</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">HTTP Requests</span>
              <span className="font-semibold">{device.total_requests}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Client Events</span>
              <span className="font-semibold">{device.total_events}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Page Views</span>
              <span className="font-semibold">{device.page_views}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Unique Pages</span>
              <span className="font-semibold">{device.unique_paths}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Forms Started</span>
              <span className="font-semibold">{device.form_starts}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Forms Submitted</span>
              <span className="font-semibold">{device.form_submits}</span>
            </div>
          </div>
        </div>

        <div className="bg-white border rounded p-4">
          <h3 className="font-bold mb-3">⏱️ Session</h3>
          <div className="space-y-2 text-sm">
            <div>
              <div className="text-gray-600">Duration</div>
              <div className="font-semibold">
                {sessionDuration > 0 ? `${sessionDuration} min` : "< 1 min"}
              </div>
            </div>
            <div>
              <div className="text-gray-600">First Seen</div>
              <div className="font-semibold text-xs">
                {new Date(device.first_seen).toLocaleString()}
              </div>
            </div>
            <div>
              <div className="text-gray-600">Last Seen</div>
              <div className="font-semibold text-xs">
                {new Date(device.last_seen).toLocaleString()}
              </div>
            </div>
            <div>
              <div className="text-gray-600">IP Address</div>
              <div className="font-mono text-xs">
                <a
                  href={`/admin/seo/ip/${device.ip}`}
                  className="text-blue-600 hover:underline"
                >
                  {device.ip}
                </a>
              </div>
            </div>
            <div>
              <div className="text-gray-600">Correlation Score</div>
              <div className="font-semibold">{device.correlation_score}%</div>
            </div>
          </div>
        </div>
      </div>

      {/* Timeline */}
      <div className="bg-white border rounded p-4">
        <h2 className="text-xl font-bold mb-4">📜 Historique Complet ({timeline.length} événements)</h2>
        <div className="space-y-1 max-h-[600px] overflow-y-auto">
          {timeline.map((event, idx) => (
            <div
              key={idx}
              className={`flex items-start gap-4 p-2 rounded text-sm ${
                event.event_type === "client_event"
                  ? "bg-blue-50 border-l-2 border-blue-500"
                  : "bg-gray-50 border-l-2 border-gray-300"
              }`}
            >
              <div className="text-xs text-gray-500 w-32 flex-shrink-0">
                {new Date(event.timestamp).toLocaleTimeString()}
              </div>
              <div className="flex-grow">
                {event.event_type === "http_request" ? (
                  <div>
                    <span className="font-mono text-xs font-semibold">
                      {event.method} {event.path}
                    </span>
                    <span
                      className={`ml-2 px-1 py-0.5 rounded text-xs ${
                        event.status && event.status >= 200 && event.status < 300
                          ? "bg-green-100 text-green-800"
                          : event.status && event.status >= 400
                          ? "bg-red-100 text-red-800"
                          : "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {event.status}
                    </span>
                    {event.duration_ms !== null && event.duration_ms !== undefined && (
                      <span className="ml-2 text-xs text-gray-500">
                        {event.duration_ms}ms
                      </span>
                    )}
                  </div>
                ) : (
                  <div>
                    <span className="font-semibold text-blue-700">
                      {event.event_name}
                    </span>
                    <span className="ml-2 text-gray-600">{event.path}</span>
                    {event.properties && (
                      <div className="text-xs text-gray-500 mt-1">
                        {JSON.stringify(event.properties)}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
