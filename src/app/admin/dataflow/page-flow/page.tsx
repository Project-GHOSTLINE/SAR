'use client';

import { Route } from 'lucide-react';
import AdminNav from '@/components/admin/AdminNav';

export default function PageFlowPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <AdminNav currentPage="/admin/dataflow/page-flow" />

      <div className="p-8">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-3 bg-gradient-to-br from-lime-500 to-green-600 rounded-xl">
              <Route className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Page Flow</h1>
              <p className="text-gray-600">Visualisation des flux de navigation</p>
            </div>
          </div>
        </div>

        <div className="bg-lime-50 border border-lime-200 rounded-lg p-6 text-center">
          <Route className="w-12 h-12 text-lime-600 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-lime-900 mb-2">Page en construction</h3>
          <p className="text-lime-700">
            Cette page affichera les flux de navigation des utilisateurs.
          </p>
        </div>
      </div>
    </div>
  );
}
