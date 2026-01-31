'use client';

import { GitBranch } from 'lucide-react';
import AdminNav from '@/components/admin/AdminNav';

export default function DataflowTracesPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <AdminNav currentPage="/admin/dataflow/traces" />

      <div className="p-8">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-3 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl">
              <GitBranch className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Traces</h1>
              <p className="text-gray-600">Traçage distribué des requêtes et transactions</p>
            </div>
          </div>
        </div>

        <div className="bg-purple-50 border border-purple-200 rounded-lg p-6 text-center">
          <GitBranch className="w-12 h-12 text-purple-600 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-purple-900 mb-2">Page en construction</h3>
          <p className="text-purple-700">
            Cette page affichera les traces distribuées complètes des requêtes.
          </p>
        </div>
      </div>
    </div>
  );
}
