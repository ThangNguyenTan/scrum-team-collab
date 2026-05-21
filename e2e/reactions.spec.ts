import { test, expect } from '@playwright/test';

test.describe('Live Reactions & Soundboard E2E', () => {
  test('should allow toggling reactions panel and sending floaters/sounds', async ({ page }) => {
    // 1. Join room from landing page to initialize a valid session
    await page.goto('/');

    await page.getByPlaceholder('Identify yourself...').fill('Reaction Tester');
    await page.getByRole('button', { name: 'FE', exact: true }).click();
    await page.getByRole('button', { name: /Initialize SCRUM_SESSION/i }).click();

    // 2. Wait for redirect into active room
    await page.waitForURL('**/room/**');

    // 3. Confirm main trigger button is present
    const toggleButton = page.locator('button[title="Express yourself"], button[title="Close reactions"]');
    await expect(toggleButton).toBeVisible({ timeout: 15000 });
    
    // 4. Click to expand panel
    await toggleButton.click();

    // 5. Confirm panel options are rendered
    await expect(page.getByText('Send Reaction')).toBeVisible();
    await expect(page.getByText('Team Soundboard')).toBeVisible();

    // 6. Click 🎉 reaction
    const partyButton = page.getByRole('button', { name: '🎉' });
    await expect(partyButton).toBeVisible();
    await partyButton.click();

    // 7. Click 🔥 reaction
    const fireButton = page.getByRole('button', { name: '🔥' });
    await expect(fireButton).toBeVisible();
    await fireButton.click();

    // 8. Trigger Tada Soundboard event
    const tadaButton = page.getByRole('button', { name: /Tada/i });
    await expect(tadaButton).toBeVisible();
    await tadaButton.click();

    // 9. Verify visual reaction is spawning on screen (emoji and sender tag)
    // The name tag displays the first word of the sender's display name ("Reaction")
    const senderBadge = page.getByText('Reaction', { exact: true }).first();
    await expect(senderBadge).toBeVisible({ timeout: 5000 });

    // 10. Verify cooldown is visual/active (Tada button becomes disabled due to 3-second cooldown)
    await expect(tadaButton).toBeDisabled();

    // 11. Click to close panel
    await toggleButton.click();
    await expect(page.getByText('Send Reaction')).not.toBeVisible();
  });
});
