'use client';

import { FileText } from 'lucide-react';
import AdminNav from '@/components/admin/AdminNav';

export default function JourneysPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <AdminNav currentPage="/admin/dataflow/journeys" />

      <div className="p-8">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-3 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl">
              <FileText className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">User Journeys</h1>
              <p className="text-gray-600">Parcours utilisateurs bout-en-bout</p>
            </div>
          </div>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-lg p-6 text-center">
          <FileText className="w-12 h-12 text-amber-600 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-amber-900 mb-2">Page en construction</h3>
          <p className="text-amber-700">
            Cette page affichera les parcours utilisateurs complets.
          </p>
        </div>
      </div>
    </div>
  );
}
