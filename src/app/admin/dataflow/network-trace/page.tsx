'use client';

import { Network } from 'lucide-react';
import AdminNav from '@/components/admin/AdminNav';

export default function NetworkTracePage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <AdminNav currentPage="/admin/dataflow/network-trace" />

      <div className="p-8">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-3 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-xl">
              <Network className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Network Trace</h1>
              <p className="text-gray-600">Traçage réseau et analyse de latence</p>
            </div>
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 text-center">
          <Network className="w-12 h-12 text-blue-600 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-blue-900 mb-2">Page en construction</h3>
          <p className="text-blue-700">
            Cette page affichera le traçage réseau détaillé et l'analyse de latence.
          </p>
        </div>
      </div>
    </div>
  );
}
