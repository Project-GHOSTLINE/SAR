import { Shield, AlertTriangle, CheckCircle } from 'lucide-react';

export default function FraudDetectionPage() {
  return (
    <div className="p-8">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Shield className="w-8 h-8 text-orange-500" />
          <h1 className="text-3xl font-bold">Fraud Detection</h1>
        </div>
        <p className="text-gray-600">
          Détection de fraude en temps réel avec correlation scoring et bot detection
        </p>
      </div>

      <div className="grid grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-lg border p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-700">Fraud Score</h3>
            <AlertTriangle className="w-5 h-5 text-orange-500" />
          </div>
          <div className="text-3xl font-bold text-orange-600">94%</div>
          <p className="text-sm text-gray-500 mt-2">Accuracy</p>
        </div>

        <div className="bg-white rounded-lg border p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-700">Bots Detected</h3>
            <Shield className="w-5 h-5 text-red-500" />
          </div>
          <div className="text-3xl font-bold text-red-600">18</div>
          <p className="text-sm text-gray-500 mt-2">Last 7 days</p>
        </div>

        <div className="bg-white rounded-lg border p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-700">Clean Sessions</h3>
            <CheckCircle className="w-5 h-5 text-green-500" />
          </div>
          <div className="text-3xl font-bold text-green-600">2,847</div>
          <p className="text-sm text-gray-500 mt-2">Verified legitimate</p>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="font-semibold text-blue-900 mb-2">🚧 En développement</h3>
        <p className="text-blue-700">
          Cette page utilisera la view <code className="bg-blue-100 px-2 py-1 rounded">fraud_detection_live</code>
          {' '}pour afficher les patterns suspects, device profiles, et correlation scoring en temps réel.
        </p>
      </div>
    </div>
  );
}
