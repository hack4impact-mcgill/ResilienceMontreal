import { defineConfig, devices } from '@playwright/test';
import path from 'path';
import dotenv from 'dotenv';

// Read from .env and .env.local
dotenv.config({ path: path.resolve(__dirname, '.env') });
dotenv.config({ path: path.resolve(__dirname, '.env.local') });

export const STORAGE_STATE_ADMIN = path.join(__dirname, 'playwright/.auth/admin.json');
export const STORAGE_STATE_WORKER = path.join(__dirname, 'playwright/.auth/worker.json');

export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1, // Sequential execution to avoid database race conditions
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [
    // Setup projects
    {
      name: 'setup-admin',
      testMatch: /admin\.setup\.ts/,
    },
    {
      name: 'setup-worker',
      testMatch: /worker\.setup\.ts/,
    },
    // Main projects
    {
      name: 'admin-tests',
      testMatch: /admin\/.*\.spec\.ts/,
      use: { 
        ...devices['Desktop Chrome'],
        storageState: STORAGE_STATE_ADMIN,
      },
      dependencies: ['setup-admin'],
    },
    {
      name: 'worker-tests',
      testMatch: /worker\/.*\.spec\.ts/,
      use: { 
        ...devices['Desktop Chrome'],
        storageState: STORAGE_STATE_WORKER,
      },
      dependencies: ['setup-worker'],
    },
  ],

  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    stdout: 'pipe',
    stderr: 'pipe',
  },
});
