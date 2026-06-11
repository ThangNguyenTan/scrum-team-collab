import { test, expect } from '@playwright/test';

test.describe('Export Meeting Summary E2E', () => {
  test('should generate markdown containing tickets and retro cards', async ({ page }) => {
    // 1. Create a room
    await page.goto('/');
    const identityInput = page.getByPlaceholder('Identify yourself...');
    await expect(identityInput).toBeVisible({ timeout: 20000 });
    await identityInput.fill('Host User');

    await page.getByRole('button', { name: 'FE', exact: true }).click();

    const createRoomBtn = page.getByRole('button', { name: /Initialize SCRUM_SESSION/i });
    await createRoomBtn.click();

    await page.waitForURL('**/room/**');
    await expect(page.getByText('SCRUM_COLLAB')).toBeVisible();

    // 2. Add a Ticket
    const sidebar = page.locator('div.z-20');
    await expect(sidebar).toBeVisible();
    
    const plusButton = sidebar.locator('button').filter({ has: page.locator('svg.lucide-plus') });
    await expect(plusButton).toBeVisible();
    await plusButton.click();

    const ticketNameInput = page.getByPlaceholder('Ticket ID (max 20 chars)');
    await expect(ticketNameInput).toBeVisible();
    await ticketNameInput.fill('PROJ-123');

    const submitTicketBtn = page.getByRole('button', { name: 'Add Ticket' });
    await submitTicketBtn.click();
    await expect(page.getByText('PROJ-123')).toBeVisible();

    // 3. Switch to Retro tab
    const retroTab = page.getByRole('button', { name: 'Retro' });
    await retroTab.click();

    // Select template preset
    await expect(page.getByText('Select Retrospective Template')).toBeVisible();
    await page.getByRole('button', { name: 'Good, Bad, Ideas, Actions' }).click();
    
    // Add a retro card to the first column
    const addCardButton = page.getByRole('button', { name: 'Add a card', exact: true }).first();
    await addCardButton.scrollIntoViewIfNeeded();
    await addCardButton.click();

    const textArea = page.getByPlaceholder('Type your thought...');
    await expect(textArea).toBeVisible();
    await textArea.fill('Great teamwork on PROJ-123');

    const postButton = page.getByRole('button', { name: 'Post Insight', exact: true });
    await postButton.click();

    await expect(page.getByText('Great teamwork on PROJ-123')).toBeVisible();

    // 4. Click Export
    const exportBtn = page.getByTitle('Export Meeting Summary');
    await expect(exportBtn).toBeVisible();
    await exportBtn.click();

    // 5. Verify Modal and Markdown content
    const exportModal = page.getByText('Export Meeting Summary');
    await expect(exportModal).toBeVisible();

    const markdownPreArea = page.locator('pre');
    await expect(markdownPreArea).toBeVisible();
    
    const markdownValue = await markdownPreArea.textContent();
    
    // Assert markdown contains expected strings
    expect(markdownValue).toContain('PROJ-123');
    expect(markdownValue).toContain('Great teamwork on PROJ-123');
    expect(markdownValue).toContain('What Went Well');
  });
});
