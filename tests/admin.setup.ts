import { test as setup, expect } from "@playwright/test";
import { STORAGE_STATE_ADMIN } from "../playwright.config";

setup("authenticate as admin", async ({ page }) => {
  const email = process.env.TEST_USER_EMAIL;
  const password = process.env.TEST_USER_PASSWORD;

  if (!email || !password) {
    throw new Error(
      "TEST_USER_EMAIL and TEST_USER_PASSWORD must be set in .env",
    );
  }

  await page.goto("/login");

  // Fill credentials
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', password);

  // Submit form
  await page.click('button[type="submit"]');

  // Wait for navigation and verify success
  // Assuming the user is redirected to "/" after login
  await expect(page).toHaveURL("/", { timeout: 10000 });

  // Check if we see the dashboard or something that confirms login
  // You might need to adjust this based on what an Admin sees
  // await expect(page.getByText('Dashboard')).toBeVisible();

  await page.context().storageState({ path: STORAGE_STATE_ADMIN });
});
