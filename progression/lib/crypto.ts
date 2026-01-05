import { createHash, randomBytes, timingSafeEqual } from 'crypto'

/**
 * Generate a cryptographically secure random token
 * @param bytes Number of random bytes (default: 32)
 * @returns Hex string token
 */
export function generateToken(bytes: number = 32): string {
  return randomBytes(bytes).toString('hex')
}

/**
 * Hash a token using SHA-256
 * @param token The token to hash
 * @returns Hex string hash
 */
export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

/**
 * Verify a token against a hash in constant time
 * @param token The token to verify
 * @param hash The hash to compare against
 * @returns true if token matches hash
 */
export function verifyToken(token: string, hash: string): boolean {
  const tokenHash = hashToken(token)

  // Convert to buffers for constant-time comparison
  const tokenBuffer = Buffer.from(tokenHash, 'hex')
  const hashBuffer = Buffer.from(hash, 'hex')

  // Ensure same length to prevent timing attacks
  if (tokenBuffer.length !== hashBuffer.length) {
    return false
  }

  return timingSafeEqual(tokenBuffer, hashBuffer)
}

/**
 * Generate expiration timestamp (default: 48 hours from now)
 * @param hours Number of hours until expiration
 * @returns ISO timestamp string
 */
export function generateExpiration(hours: number = 48): string {
  const expiresAt = new Date()
  expiresAt.setHours(expiresAt.getHours() + hours)
  return expiresAt.toISOString()
}
