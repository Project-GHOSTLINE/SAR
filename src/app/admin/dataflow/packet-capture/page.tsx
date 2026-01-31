'use client';

import { Wifi } from 'lucide-react';
import AdminNav from '@/components/admin/AdminNav';

export default function PacketCapturePage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <AdminNav currentPage="/admin/dataflow/packet-capture" />

      <div className="p-8">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-3 bg-gradient-to-br from-sky-500 to-cyan-600 rounded-xl">
              <Wifi className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Packet Capture</h1>
              <p className="text-gray-600">Capture et analyse de paquets réseau</p>
            </div>
          </div>
        </div>

        <div className="bg-sky-50 border border-sky-200 rounded-lg p-6 text-center">
          <Wifi className="w-12 h-12 text-sky-600 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-sky-900 mb-2">Page en construction</h3>
          <p className="text-sky-700">
            Cette page affichera la capture et analyse des paquets réseau.
          </p>
        </div>
      </div>
    </div>
  );
}
