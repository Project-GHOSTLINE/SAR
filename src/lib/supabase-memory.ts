// Helper pour la connexion Supabase utilisée par le système de mémoire
import { createClient } from '@supabase/supabase-js';

export function getMemorySupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

  if (!url || !key) {
    console.error('Missing Supabase credentials for memory system');
    return null;
  }

  return createClient(url, key);
}
