# Testing with Playwright

This project uses [Playwright](https://playwright.dev/) for end-to-end testing. This guide explains how to set up and run tests, and how to add new ones.

## 🚀 Setup

### 1. Install Playwright

If you haven't already, install the Playwright browsers:

```bash
npx playwright install
```

### 2. Environment Variables

You'll need specific environment variables to run the tests. These should be added to your `.env.local` file.

**Note: You can find these values in the Notion file for this project.**

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://vixxjsesqvihbugkqhlk.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_3hzM05Yj2SYBd-atzFMQIg_YiCDiDpW

# Test User Accounts (Obtain from Notion)
TEST_USER_EMAIL="oualid.malak05@gmail.com"
TEST_USER_PASSWORD="malaktest"

TEST_WORKER_EMAIL="zhangkev20@gmail.com"
TEST_WORKER_PASSWORD="ResilienceMTL"

# Local App URL
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## 🧪 Running Tests

### Run all tests

```bash
npx playwright test
```

### Run tests in UI mode (Best for development)

```bash
npx playwright test --ui
```

### Run a specific test file

```bash
npx playwright test tests/admin/permissions.spec.ts
```

## ➕ Adding New Tests

1. Create a new test file in the `tests/` directory (e.g., `tests/features/new-feature.spec.ts`).
2. Use the established patterns for authentication. Many tests use `@playwright/.auth/admin.json` or `worker.json` to skip login steps.
3. If your test requires a specific role, ensure you are using the correct setup or storage state.

### Example Test Structure

```typescript
import { test, expect } from "@playwright/test";

test.describe("Feature Name", () => {
  test("should perform a specific action", async ({ page }) => {
    await page.goto("/dashboard");
    // Your test logic here
    await expect(page.getByText("Welcome")).toBeVisible();
  });
});
```

## 🔒 Authentication Storage

Authentication states (cookies/sessions) are stored in `playwright/.auth/`. These files are **ignored by git** for security. When you run tests locally, Playwright will generate these files to speed up subsequent test runs.
