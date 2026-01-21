import { defineConfig, devices } from '@playwright/test';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load test environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env.test') });

/**
 * SAR E2E Testing Configuration
 *
 * Features:
 * - Traces on first retry
 * - Screenshots on failure
 * - Video on failure
 * - HTML + JUnit reports
 * - Storage state for auth persistence
 */
export default defineConfig({
  testDir: './specs',

  // Timeout settings
  timeout: 60_000, // 60s per test
  expect: {
    timeout: 10_000 // 10s for assertions
  },

  // Test execution
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 1,
  workers: process.env.CI ? 1 : undefined,

  // Reporters
  reporter: [
    ['html', {
      outputFolder: '../test-artifacts/playwright-report',
      open: 'never'
    }],
    ['junit', {
      outputFile: '../test-artifacts/junit.xml'
    }],
    ['list'],
    ['json', {
      outputFile: '../test-artifacts/results.json'
    }]
  ],

  // Global test settings
  use: {
    // Base URL from environment
    baseURL: process.env.BASE_URL || 'http://localhost:4000',

    // Traces and debugging
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',

    // Browser settings
    viewport: { width: 1280, height: 720 },
    ignoreHTTPSErrors: true,

    // Timeout for actions
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
  },

  // Output directory for traces
  outputDir: '../test-artifacts/traces',

  // Projects (browsers)
  projects: [
    // Setup: Authentication
    {
      name: 'setup',
      testMatch: /.*\.setup\.ts/,
      use: { ...devices['Desktop Chrome'] },
    },

    // GA4 Validation: No setup dependency (handles its own auth)
    {
      name: 'ga4-validation',
      testMatch: /.*ga4.*validation\.spec\.ts/,
      use: { ...devices['Desktop Chrome'] },
    },

    // Main tests: Chrome
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        // Use auth state from setup
        storageState: './storage/state.json',
      },
      dependencies: ['setup'],
    },

    // Optional: Firefox (uncomment if needed)
    // {
    //   name: 'firefox',
    //   use: { ...devices['Desktop Firefox'] },
    //   dependencies: ['setup'],
    // },

    // Optional: Safari (uncomment if needed on Mac)
    // {
    //   name: 'webkit',
    //   use: { ...devices['Desktop Safari'] },
    //   dependencies: ['setup'],
    // },
  ],

  // Dev server (optional - if tests need to start the app)
  // webServer: {
  //   command: 'npm run dev',
  //   url: 'http://localhost:3000',
  //   reuseExistingServer: !process.env.CI,
  //   timeout: 120_000,
  // },
});
