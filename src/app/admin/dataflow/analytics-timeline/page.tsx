'use client';

import { LineChart } from 'lucide-react';
import AdminNav from '@/components/admin/AdminNav';

export default function AnalyticsTimelinePage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <AdminNav currentPage="/admin/dataflow/analytics-timeline" />

      <div className="p-8">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-3 bg-gradient-to-br from-pink-500 to-rose-600 rounded-xl">
              <LineChart className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Analytics Timeline</h1>
              <p className="text-gray-600">Timeline des événements et interactions</p>
            </div>
          </div>
        </div>

        <div className="bg-pink-50 border border-pink-200 rounded-lg p-6 text-center">
          <LineChart className="w-12 h-12 text-pink-600 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-pink-900 mb-2">Page en construction</h3>
          <p className="text-pink-700">
            Cette page affichera la timeline complète des événements analytics.
          </p>
        </div>
      </div>
    </div>
  );
}
