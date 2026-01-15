'use client'

import { useEffect, useState } from 'react'

export default function SimpleMetricsPage() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/metrics/all')
      .then(r => r.json())
      .then(d => {
        setData(d)
        setLoading(false)
      })
      .catch(e => {
        console.error(e)
        setLoading(false)
      })
  }, [])

  if (loading) return <div style={{ padding: 40 }}>Chargement...</div>
  if (!data) return <div style={{ padding: 40 }}>Erreur</div>

  return (
    <div style={{ padding: 40, fontFamily: 'monospace' }}>
      <h1 style={{ fontSize: 32, marginBottom: 20 }}>📊 Métriques SAR</h1>

      <h2 style={{ fontSize: 24, marginTop: 30, marginBottom: 15 }}>Tables</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 15 }}>
        {Object.entries(data.tables).map(([name, count]: [string, any]) => (
          <div
            key={name}
            style={{
              padding: 20,
              border: '2px solid',
              borderColor: count > 0 ? '#10b981' : '#d1d5db',
              borderRadius: 8,
              backgroundColor: count > 0 ? '#d1fae5' : '#f3f4f6'
            }}
          >
            <div style={{ fontSize: 32, fontWeight: 'bold', color: count > 0 ? '#065f46' : '#9ca3af' }}>
              {count}
            </div>
            <div style={{ fontSize: 12, marginTop: 5 }}>{name}</div>
          </div>
        ))}
      </div>

      <h2 style={{ fontSize: 24, marginTop: 30, marginBottom: 15 }}>VoPay par Status</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 15 }}>
        {Object.entries(data.breakdowns.vopay_by_status).map(([name, count]: [string, any]) => (
          <div
            key={name}
            style={{
              padding: 15,
              border: '1px solid #ddd',
              borderRadius: 8,
              backgroundColor: count > 0 ? '#dbeafe' : '#f9fafb',
              textAlign: 'center'
            }}
          >
            <div style={{ fontSize: 24, fontWeight: 'bold' }}>{count}</div>
            <div style={{ fontSize: 11, marginTop: 5 }}>{name}</div>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 40 }}>
        <a
          href="/test-simple"
          style={{
            display: 'inline-block',
            padding: '10px 20px',
            background: '#6b7280',
            color: 'white',
            textDecoration: 'none',
            borderRadius: 5,
            marginRight: 10
          }}
        >
          ← Retour Test
        </a>
        <a
          href="/clients/c53ace24-3ceb-4e37-a041-209b7cb2c932"
          style={{
            display: 'inline-block',
            padding: '10px 20px',
            background: '#10b981',
            color: 'white',
            textDecoration: 'none',
            borderRadius: 5
          }}
        >
          Profil Client →
        </a>
      </div>
    </div>
  )
}
