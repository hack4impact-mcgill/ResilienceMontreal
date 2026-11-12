import { test, expect } from "@playwright/test";

test.describe("Admin Permissions", () => {
  test("can access the Admin panel", async ({ page }) => {
    // Navigate to the users admin page
    await page.goto("/admin/users");

    // Wait for the page to load
    // Admin should see the People heading
    await expect(page.getByRole("heading", { name: "People" })).toBeVisible({
      timeout: 15000,
    });

    // Check if the table is present
    await expect(page.getByRole("table")).toBeVisible();
  });

  test("can see the Home page", async ({ page }) => {
    await page.goto("/");
    await expect(
      page.getByRole("heading", { name: "Home page" }),
    ).toBeVisible();
  });
});
