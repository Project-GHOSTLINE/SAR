'use client';

import { useState, useEffect } from 'react';

interface ConnectionStatus {
  connected: boolean;
  realmId: string | null;
  companyName: string | null;
  expiresAt: string | null;
  needsRefresh: boolean;
  autoRefreshEnabled: boolean;
  lastRefresh: string | null;
  error: string | null;
}

interface CompanyInfo {
  name: string;
  legalName: string;
  email: string;
  phone: string;
}

export default function QuickBooksPage() {
  const [status, setStatus] = useState<ConnectionStatus | null>(null);
  const [company, setCompany] = useState<CompanyInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  const loadStatus = async () => {
    try {
      const response = await fetch('/api/quickbooks/connection/status');
      const data = await response.json();
      if (data.success) {
        setStatus(data.connection);
        setCompany(data.company);
      }
    } catch (error) {
      console.error('Error loading status:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async () => {
    try {
      setActionLoading(true);
      const response = await fetch('/api/quickbooks/auth/connect');
      const data = await response.json();
      if (data.authUrl) {
        window.location.href = data.authUrl;
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to initiate connection' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleDisconnect = async () => {
    if (!confirm('Are you sure you want to disconnect from QuickBooks?')) {
      return;
    }

    try {
      setActionLoading(true);
      const response = await fetch('/api/quickbooks/connection/disconnect', {
        method: 'POST'
      });
      const data = await response.json();

      if (data.success) {
        setMessage({ type: 'success', text: 'Disconnected successfully' });
        await loadStatus();
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to disconnect' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to disconnect' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleRefresh = async () => {
    try {
      setActionLoading(true);
      const response = await fetch('/api/quickbooks/connection/refresh', {
        method: 'POST'
      });
      const data = await response.json();

      if (data.success) {
        setMessage({ type: 'success', text: 'Tokens refreshed successfully' });
        await loadStatus();
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to refresh' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to refresh tokens' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleTest = async () => {
    try {
      setActionLoading(true);
      const response = await fetch('/api/quickbooks/connection/test');
      const data = await response.json();

      if (data.success) {
        setMessage({ type: 'success', text: `Connection test passed! Company: ${data.company?.companyName || 'Unknown'}` });
      } else {
        setMessage({ type: 'error', text: data.error || 'Connection test failed' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Connection test failed' });
    } finally {
      setActionLoading(false);
    }
  };

  useEffect(() => {
    loadStatus();
    const interval = setInterval(loadStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (message) {
      const timeout = setTimeout(() => setMessage(null), 5000);
      return () => clearTimeout(timeout);
    }
  }, [message]);

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  return (
    <div className="p-6 max-w-4xl">
      <h1 className="text-3xl font-bold mb-6">QuickBooks Connection</h1>

      {message && (
        <div className={`mb-4 p-4 rounded ${message.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
          {message.text}
        </div>
      )}

      <div className="bg-white shadow rounded-lg p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Connection Status</h2>

        {status?.connected ? (
          <div className="space-y-3">
            <div className="flex items-center">
              <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
              <span className="font-medium">Connected</span>
            </div>

            {company && (
              <div className="bg-green-50 p-4 rounded">
                <p className="font-semibold">{company.name || 'Unknown Company'}</p>
                {company.legalName && <p className="text-sm text-gray-600">{company.legalName}</p>}
                {company.email && <p className="text-sm text-gray-600">{company.email}</p>}
              </div>
            )}

            <div className="grid grid-cols-2 gap-4 text-sm mt-4">
              <div>
                <span className="text-gray-600">Realm ID:</span>
                <p className="font-mono text-xs">{status.realmId}</p>
              </div>
              <div>
                <span className="text-gray-600">Auto-Refresh:</span>
                <p className="font-medium">{status.autoRefreshEnabled ? '✅ Enabled' : '❌ Disabled'}</p>
              </div>
              <div>
                <span className="text-gray-600">Token Expires:</span>
                <p className="text-xs">{status.expiresAt ? new Date(status.expiresAt).toLocaleString() : 'Unknown'}</p>
              </div>
              <div>
                <span className="text-gray-600">Last Refresh:</span>
                <p className="text-xs">{status.lastRefresh ? new Date(status.lastRefresh).toLocaleString() : 'Never'}</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center">
              <div className="w-3 h-3 bg-gray-400 rounded-full mr-2"></div>
              <span className="font-medium">Not Connected</span>
            </div>
            <p className="text-sm text-gray-600">Connect your QuickBooks account to sync data.</p>
          </div>
        )}
      </div>

      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4">Actions</h2>

        <div className="flex flex-wrap gap-3">
          {status?.connected ? (
            <>
              <button
                onClick={handleTest}
                disabled={actionLoading}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400"
              >
                Test Connection
              </button>

              <button
                onClick={handleRefresh}
                disabled={actionLoading}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-400"
              >
                Refresh Tokens
              </button>

              <button
                onClick={handleDisconnect}
                disabled={actionLoading}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:bg-gray-400"
              >
                Disconnect
              </button>
            </>
          ) : (
            <button
              onClick={handleConnect}
              disabled={actionLoading}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 font-semibold"
            >
              Connect to QuickBooks
            </button>
          )}
        </div>

        {actionLoading && (
          <div className="mt-4 text-sm text-gray-600">Processing...</div>
        )}
      </div>

      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-semibold text-blue-900 mb-2">⚠️ Need to reconnect?</h3>
        <p className="text-sm text-blue-800 mb-2">
          If you're seeing Error 3100, you need to disconnect and reconnect to get the latest OAuth scopes.
        </p>
        <ol className="text-sm text-blue-800 list-decimal list-inside space-y-1">
          <li>Click "Disconnect" above</li>
          <li>Click "Connect to QuickBooks"</li>
          <li>Authorize on the Intuit page (you'll see new scopes: openid, profile, email)</li>
          <li>You'll be redirected back and Error 3100 will be fixed!</li>
        </ol>
      </div>
    </div>
  );
}
