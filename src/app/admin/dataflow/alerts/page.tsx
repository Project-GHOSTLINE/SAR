'use client';

import { Activity, AlertTriangle } from 'lucide-react';
import AdminNav from '@/components/admin/AdminNav';

export default function DataflowAlertsPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <AdminNav currentPage="/admin/dataflow/alerts" />

      <div className="p-8">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-3 bg-gradient-to-br from-red-500 to-orange-600 rounded-xl">
              <AlertTriangle className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Dataflow Alerts</h1>
              <p className="text-gray-600">Alertes système et notifications critiques</p>
            </div>
          </div>
        </div>

        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
          <AlertTriangle className="w-12 h-12 text-yellow-600 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-yellow-900 mb-2">Page en construction</h3>
          <p className="text-yellow-700">
            Cette page affichera les alertes système et notifications critiques depuis la télémétrie.
          </p>
        </div>
      </div>
    </div>
  );
}
