/**
 * WebAuthn credential and challenge storage using Supabase
 */

import { getSupabase } from './supabase'

export interface StoredCredential {
  credentialId: string
  publicKey: string
  counter: number
  email: string
  createdAt: number
}

// Admin emails allowed
export const ADMIN_EMAILS = [
  'perception@solutionargentrapide.ca',
  'mrosa@solutionargentrapide.ca',
  'info@solutionargentrapide.ca',
  'anthony@solutionargentrapide.ca'
]

// Get RP ID based on environment
export function getRpId(): string {
  if (process.env.NODE_ENV === 'production') {
    return 'solutionargentrapide.ca'
  }
  return 'localhost'
}

// Get expected origin based on environment
export function getExpectedOrigin(): string {
  if (process.env.NODE_ENV === 'production') {
    return 'https://admin.solutionargentrapide.ca'
  }
  return 'http://localhost:3000'
}

// Challenge operations
export async function storeChallenge(key: string, challenge: string): Promise<void> {
  const supabase = getSupabase()
  if (!supabase) {
    throw new Error('Supabase not configured')
  }

  // Delete existing challenge for this key
  await supabase.from('webauthn_challenges').delete().eq('challenge_key', key)

  // Insert new challenge
  const { error } = await supabase.from('webauthn_challenges').insert({
    challenge_key: key,
    challenge
  })

  if (error) {
    console.error('Error storing challenge:', error)
    throw new Error('Failed to store challenge')
  }
}

export async function getChallenge(key: string): Promise<string | null> {
  const supabase = getSupabase()
  if (!supabase) return null

  const { data, error } = await supabase
    .from('webauthn_challenges')
    .select('challenge, created_at')
    .eq('challenge_key', key)
    .single()

  if (error || !data) return null

  // Check if challenge is expired (5 minutes)
  const createdAt = new Date(data.created_at).getTime()
  if (Date.now() - createdAt > 5 * 60 * 1000) {
    await deleteChallenge(key)
    return null
  }

  return data.challenge
}

export async function deleteChallenge(key: string): Promise<void> {
  const supabase = getSupabase()
  if (!supabase) return

  await supabase.from('webauthn_challenges').delete().eq('challenge_key', key)
}

// Credential operations
export async function storeCredential(credential: StoredCredential): Promise<void> {
  const supabase = getSupabase()
  if (!supabase) {
    throw new Error('Supabase not configured')
  }

  const { error } = await supabase.from('webauthn_credentials').insert({
    credential_id: credential.credentialId,
    public_key: credential.publicKey,
    counter: credential.counter,
    email: credential.email
  })

  if (error) {
    console.error('Error storing credential:', error)
    throw new Error('Failed to store credential')
  }
}

export async function getCredentialById(credentialId: string): Promise<StoredCredential | null> {
  const supabase = getSupabase()
  if (!supabase) return null

  const { data, error } = await supabase
    .from('webauthn_credentials')
    .select('*')
    .eq('credential_id', credentialId)
    .single()

  if (error || !data) return null

  return {
    credentialId: data.credential_id,
    publicKey: data.public_key,
    counter: data.counter,
    email: data.email,
    createdAt: new Date(data.created_at).getTime()
  }
}

export async function getCredentialsByEmail(email: string): Promise<StoredCredential[]> {
  const supabase = getSupabase()
  if (!supabase) return []

  const { data, error } = await supabase
    .from('webauthn_credentials')
    .select('*')
    .eq('email', email)

  if (error || !data) return []

  return data.map(d => ({
    credentialId: d.credential_id,
    publicKey: d.public_key,
    counter: d.counter,
    email: d.email,
    createdAt: new Date(d.created_at).getTime()
  }))
}

export async function getAllCredentials(): Promise<StoredCredential[]> {
  const supabase = getSupabase()
  if (!supabase) return []

  const { data, error } = await supabase
    .from('webauthn_credentials')
    .select('*')

  if (error || !data) return []

  return data.map(d => ({
    credentialId: d.credential_id,
    publicKey: d.public_key,
    counter: d.counter,
    email: d.email,
    createdAt: new Date(d.created_at).getTime()
  }))
}

export async function updateCredentialCounter(credentialId: string, counter: number): Promise<void> {
  const supabase = getSupabase()
  if (!supabase) return

  await supabase
    .from('webauthn_credentials')
    .update({ counter, last_used_at: new Date().toISOString() })
    .eq('credential_id', credentialId)
}
