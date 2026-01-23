// jest.setup.js
import '@testing-library/jest-dom'

// Mock environment variables
process.env.JWT_SECRET = 'test-secret'
process.env.TELEMETRY_ENABLED = 'true'
process.env.TELEMETRY_HASH_SALT = 'test-salt'
process.env.SUPABASE_URL = 'https://test.supabase.co'
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key'
process.env.NODE_ENV = 'test'
