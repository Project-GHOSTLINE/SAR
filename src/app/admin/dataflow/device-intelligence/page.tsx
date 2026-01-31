'use client';

import { Smartphone } from 'lucide-react';
import AdminNav from '@/components/admin/AdminNav';

export default function DeviceIntelligencePage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <AdminNav currentPage="/admin/dataflow/device-intelligence" />

      <div className="p-8">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-3 bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl">
              <Smartphone className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Device Intelligence</h1>
              <p className="text-gray-600">Analyse des appareils et empreintes digitales</p>
            </div>
          </div>
        </div>

        <div className="bg-violet-50 border border-violet-200 rounded-lg p-6 text-center">
          <Smartphone className="w-12 h-12 text-violet-600 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-violet-900 mb-2">Page en construction</h3>
          <p className="text-violet-700">
            Cette page affichera l'intelligence des appareils et empreintes.
          </p>
        </div>
      </div>
    </div>
  );
}
