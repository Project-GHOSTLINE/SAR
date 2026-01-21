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

  useEffect(() => {
    loadStatus();
    const interval = setInterval(loadStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-4">QuickBooks Connection</h1>
      {status?.connected ? (
        <div className="bg-green-100 p-4 rounded">Connected to {company?.name}</div>
      ) : (
        <div className="bg-gray-100 p-4 rounded">Not Connected</div>
      )}
    </div>
  );
}
