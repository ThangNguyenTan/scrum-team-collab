import { test, expect } from '@playwright/test';

test.describe('Squad Filtering and Vote Cards E2E', () => {
  test('should display squad badge and allow filtering by squad', async ({ page }) => {
    // 1. Navigate to landing page
    await page.goto('/');

    // 2. Identify and join as Creator with FE group
    await page.getByPlaceholder('Identify yourself...').fill('Developer FE');
    await page.getByRole('button', { name: 'FE', exact: true }).click();
    await page.getByRole('button', { name: /Initialize SCRUM_SESSION/i }).click();

    // 3. Wait for navigation into the room
    await page.waitForURL('**/room/**');
    await expect(page.getByText('SCRUM_COLLAB')).toBeVisible();

    // 4. Verify that the user's vote card displays their name and group badge "FE"
    const userVoteCard = page.getByTestId('user-vote-card').filter({ hasText: 'Developer FE' });
    await expect(userVoteCard).toBeVisible();
    await expect(userVoteCard.getByText('FE', { exact: true })).toBeVisible();

    // 5. Verify that the Squad Filter buttons are visible
    // "All Squads" and the active user's squad ("FE") button should appear
    const allSquadsBtn = page.getByRole('button', { name: 'All Squads', exact: true });
    await expect(allSquadsBtn).toBeVisible();

    const feSquadBtn = page.getByRole('button', { name: 'FE', exact: true });
    await expect(feSquadBtn).toBeVisible();

    // 6. Test squad filtering:
    // When clicking the "FE" filter, the user vote card should still be visible because our user belongs to FE
    await feSquadBtn.click();
    await expect(userVoteCard).toBeVisible();

    // 7. Click "All Squads" to clear the filter
    await allSquadsBtn.click();
    await expect(userVoteCard).toBeVisible();
  });
});
