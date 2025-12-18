import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://dllyzfuqjzuhvshrlmuq.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRsbHl6ZnVxanp1aHZzaHJsbXVxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTk5NTk4MSwiZXhwIjoyMDgxNTcxOTgxfQ.Qg5eQwDxeAtTDXplNkQZa4hOp_dSMBIu_DKbuquryFo'

const supabase = createClient(supabaseUrl, supabaseKey)

// Test if table exists
const { data, error } = await supabase.from('contact_messages').select('*').limit(1)

if (error) {
  console.log('Error:', error.message)
  console.log('Code:', error.code)
} else {
  console.log('Table exists! Count:', data.length)
}
