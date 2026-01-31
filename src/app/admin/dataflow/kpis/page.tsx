'use client';

import { TrendingUp } from 'lucide-react';
import AdminNav from '@/components/admin/AdminNav';

export default function DataflowKPIsPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <AdminNav currentPage="/admin/dataflow/kpis" />

      <div className="p-8">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-3 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl">
              <TrendingUp className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">KPIs</h1>
              <p className="text-gray-600">Indicateurs clés de performance en temps réel</p>
            </div>
          </div>
        </div>

        <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
          <TrendingUp className="w-12 h-12 text-green-600 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-green-900 mb-2">Page en construction</h3>
          <p className="text-green-700">
            Cette page affichera les KPIs en temps réel du système.
          </p>
        </div>
      </div>
    </div>
  );
}
