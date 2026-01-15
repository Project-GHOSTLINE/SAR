export default function TestSimplePage() {
  return (
    <div style={{ padding: '40px', fontFamily: 'monospace' }}>
      <h1 style={{ fontSize: '32px', marginBottom: '20px' }}>✅ Page Test Simple</h1>
      <p style={{ fontSize: '18px', marginBottom: '10px' }}>Si vous voyez ce texte, Next.js fonctionne.</p>
      <div style={{ marginTop: '30px' }}>
        <a
          href="/api/metrics/all"
          style={{
            display: 'inline-block',
            padding: '10px 20px',
            background: '#0070f3',
            color: 'white',
            textDecoration: 'none',
            borderRadius: '5px'
          }}
        >
          Voir API Metrics (JSON)
        </a>
      </div>
      <div style={{ marginTop: '10px' }}>
        <a
          href="/clients/c53ace24-3ceb-4e37-a041-209b7cb2c932"
          style={{
            display: 'inline-block',
            padding: '10px 20px',
            background: '#10b981',
            color: 'white',
            textDecoration: 'none',
            borderRadius: '5px'
          }}
        >
          Profil Client
        </a>
      </div>
    </div>
  )
}
