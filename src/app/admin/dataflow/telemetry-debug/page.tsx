'use client';

import { Database } from 'lucide-react';
import AdminNav from '@/components/admin/AdminNav';

export default function TelemetryDebugPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <AdminNav currentPage="/admin/dataflow/telemetry-debug" />

      <div className="p-8">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-3 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl">
              <Database className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Telemetry Debug</h1>
              <p className="text-gray-600">Outils de débogage pour la télémétrie</p>
            </div>
          </div>
        </div>

        <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-6 text-center">
          <Database className="w-12 h-12 text-indigo-600 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-indigo-900 mb-2">Page en construction</h3>
          <p className="text-indigo-700">
            Cette page affichera les outils de debug de la télémétrie.
          </p>
        </div>
      </div>
    </div>
  );
}
