'use client';

import { Radio } from 'lucide-react';
import AdminNav from '@/components/admin/AdminNav';

export default function ActiveReconPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <AdminNav currentPage="/admin/dataflow/active-recon" />

      <div className="p-8">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-3 bg-gradient-to-br from-teal-500 to-cyan-600 rounded-xl">
              <Radio className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Active Recon</h1>
              <p className="text-gray-600">Reconnaissance active et scan réseau</p>
            </div>
          </div>
        </div>

        <div className="bg-teal-50 border border-teal-200 rounded-lg p-6 text-center">
          <Radio className="w-12 h-12 text-teal-600 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-teal-900 mb-2">Page en construction</h3>
          <p className="text-teal-700">
            Cette page affichera la reconnaissance active et scans réseau.
          </p>
        </div>
      </div>
    </div>
  );
}
