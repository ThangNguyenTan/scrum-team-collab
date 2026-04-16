import { test, expect } from '@playwright/test';

test.describe('Landing Page E2E', () => {
  test('should display the core elements properly', async ({ page }) => {
    await page.goto('/');
    
    // Note: getByRole is best practice for selecting elements
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Agile speed');
    
    const identityInput = page.getByPlaceholder('Identify yourself...');
    await expect(identityInput).toBeVisible();

    const submitButton = page.getByRole('button', { name: /Initialize SCRUM_SESSION/i });
    await expect(submitButton).toBeVisible();
  });

  test('should allow entering an identity and navigating to a new room', async ({ page }) => {
    await page.goto('/');

    const identityInput = page.getByPlaceholder('Identify yourself...');
    await identityInput.fill('E2E Tester');

    const submitButton = page.getByRole('button', { name: /Initialize SCRUM_SESSION/i });
    await submitButton.click();

    // Verify successful creation by waiting for URL change to /room/
    await page.waitForURL('**/room/**');
    expect(page.url()).toContain('/room/');
  });
});
