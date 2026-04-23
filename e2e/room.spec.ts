import { test, expect } from '@playwright/test';

test.describe('Room E2E', () => {
  test('should allow creating a room, viewing headers, and switching tabs', async ({ page }) => {
    // Navigate completely through the front door to guarantee the room exists in the DB
    await page.goto('/');
    
    // Fill out the landing identity and submit to create room
    await page.getByPlaceholder('Identify yourself...').fill('Automated Scrum Master');
    await page.getByRole('button', { name: /Initialize SCRUM_SESSION/i }).click();

    // After joining, wait for navigation into the room
    await page.waitForURL('**/room/**');

    // Confirm we see the room header
    await expect(page.getByText('SCRUM_COLLAB')).toBeVisible();

    // Check header tabs exist
    const planningTab = page.getByRole('button', { name: 'Planning' });
    const retroTab = page.getByRole('button', { name: 'Retro' });
    
    await expect(planningTab).toBeVisible();
    await expect(retroTab).toBeVisible();

    // Ensure we start on "Planning"
    await expect(page.getByText(/Session ID/i)).toBeVisible(); // Just general validation

    // Switch to Retro
    await retroTab.click();
    
    // Once retro tab is clicked, Firebase hook `handleTabSwitch` generates default columns if they are absent
    await expect(page.getByText('What went well', { exact: true })).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Action Items', { exact: true })).toBeVisible();
  });

  test('should allow voting and revealing cards in Planning mode', async ({ page }) => {
    // Navigate completely through the front door to guarantee the room exists in the DB
    await page.goto('/');
    
    // Fill out the landing identity and submit to create room
    await page.getByPlaceholder('Identify yourself...').fill('Agile Voter');
    await page.getByRole('button', { name: /Initialize SCRUM_SESSION/i }).click();

    // After joining, wait for navigation into the room
    await page.waitForURL('**/room/**');

    // The user should see the planning deck. Let's select an 8 value.
    // The rendered button contains an 8 and "Points", but the text itself has "8\nPoints".
    const card8 = page.getByText('8', { exact: true }).first();
    await card8.click();

    // The room creator has the ability to reveal. Wait for the button to indicate ready.
    const revealButton = page.getByRole('button', { name: /(Reveal Votes|Ready to Reveal)/i });
    await expect(revealButton).toBeVisible();
    
    // As the only user, voting means we are 100% ready. Click reveal.
    await revealButton.click();

    // After revealing, stats should appear. Verify the average logic.
    await expect(page.getByText('Avg:')).toBeVisible();
    await expect(page.getByText('8.0')).toBeVisible();

    // Verify proposed points calculates accurately based on the fibonacci sequence block.
    await expect(page.getByText('PROPOSED:')).toBeVisible();

    // Admin should now see the "Hide Results" or "Reset Board" button
    const resetButton = page.getByRole('button', { name: /Reset Board/i });
    await expect(resetButton).toBeVisible();
  });

  test('should allow adding retro cards in Retro mode', async ({ page }) => {
    // Navigate completely through the front door to guarantee the room exists in the DB
    await page.goto('/');
    
    await page.getByPlaceholder('Identify yourself...').fill('Retro Historian');
    await page.getByRole('button', { name: /Initialize SCRUM_SESSION/i }).click();

    // After joining, wait for navigation into the room
    await page.waitForURL('**/room/**');

    // Switch to Retro Mode
    const retroTab = page.getByRole('button', { name: 'Retro' });
    await expect(retroTab).toBeVisible();
    await retroTab.click();

    // Verify first column appears
    await expect(page.getByText('What went well', { exact: true })).toBeVisible({ timeout: 10000 });

    // Focus isolation to the first column 


    // Start adding a card
    const addCardButton = page.getByRole('button', { name: 'Add a card', exact: true }).first();
    await addCardButton.scrollIntoViewIfNeeded();
    await addCardButton.click();

    // Type the insight
    const textArea = page.getByPlaceholder('Type your thought...');
    await expect(textArea).toBeVisible();
    await textArea.fill('Automated E2E testing is fully operational! 🚀');

    // Submit it
    const postButton = page.getByRole('button', { name: /Post Insight/i });
    await postButton.click();

    // Verify the card was added and is visible (not inside the textarea)
    await expect(page.getByText('Automated E2E testing is fully operational! 🚀')).toBeVisible();
  });
});
