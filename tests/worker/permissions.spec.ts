import { test, expect } from '@playwright/test';

test.describe('Worker Permissions', () => {
  test('is LOCKED from the Admin panel', async ({ page }) => {
    // Navigate to the users admin page
    await page.goto('/admin/users');

    // Worker should see "Access denied" heading
    await expect(page.getByRole('heading', { name: 'Access denied' })).toBeVisible({ timeout: 15000 });
    
    // Check if the message is correct
    await expect(page.getByText('You do not have permission to view this page.')).toBeVisible();
    
    // Check if there's a link to return home
    await expect(page.getByRole('link', { name: 'Return to home' })).toBeVisible();
  });

  test('can see the Home page', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Home page' })).toBeVisible();
  });
});
