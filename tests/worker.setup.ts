import { test as setup, expect } from "@playwright/test";
import { STORAGE_STATE_WORKER } from "../playwright.config";

setup("authenticate as worker", async ({ page }) => {
  const email = process.env.TEST_WORKER_EMAIL;
  const password = process.env.TEST_WORKER_PASSWORD;

  if (!email || !password) {
    throw new Error(
      "TEST_WORKER_EMAIL and TEST_WORKER_PASSWORD must be set in .env.local",
    );
  }

  await page.goto("/login");

  // Fill credentials
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', password);

  // Submit form
  await page.click('button[type="submit"]');

  // Wait for navigation and verify success
  await expect(page).toHaveURL("/", { timeout: 10000 });

  await page.context().storageState({ path: STORAGE_STATE_WORKER });
});
