// Test rapide du flow template

console.log('🧪 Test du flow de templates\n')

// 1. Lister les templates disponibles
fetch('http://localhost:3000/api/admin/signature-templates')
  .then(res => res.json())
  .then(data => {
    console.log('✅ Templates disponibles:')
    data.templates.forEach(t => {
      console.log(`   - ${t.name}: ${t.signature_fields.length} champs`)
      t.signature_fields.forEach(f => {
        console.log(`     • ${f.type} à (${f.x}, ${f.y}) - ${f.width}x${f.height} - Page ${f.page}`)
      })
    })

    // Tester avec le premier template
    if (data.templates.length > 0) {
      const template = data.templates[0]
      console.log(`\n📋 Test avec template: "${template.name}"`)
      console.log(`   Champs:`, JSON.stringify(template.signature_fields, null, 2))
    }
  })
  .catch(err => {
    console.error('❌ Erreur:', err.message)
  })
