'use client';

import { Zap } from 'lucide-react';
import AdminNav from '@/components/admin/AdminNav';

export default function TelemetryHealthPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <AdminNav currentPage="/admin/dataflow/telemetry-health" />

      <div className="p-8">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-3 bg-gradient-to-br from-yellow-500 to-amber-600 rounded-xl">
              <Zap className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Telemetry Health</h1>
              <p className="text-gray-600">État de santé du système de télémétrie</p>
            </div>
          </div>
        </div>

        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
          <Zap className="w-12 h-12 text-yellow-600 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-yellow-900 mb-2">Page en construction</h3>
          <p className="text-yellow-700">
            Cette page affichera l'état de santé de la télémétrie.
          </p>
        </div>
      </div>
    </div>
  );
}
