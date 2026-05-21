import { test, expect } from '@playwright/test';

test.describe('Ticket Management E2E', () => {
  test('should allow creating, updating, sorting, and deleting tickets in the sidebar', async ({ page }) => {
    // 1. Navigate to the landing page
    await page.goto('/');

    // 2. Fill in Creator Identity & select a Team Group
    await page.getByPlaceholder('Identify yourself...').fill('Creator SM');
    await page.getByRole('button', { name: 'FE', exact: true }).click();
    await page.getByRole('button', { name: /Initialize SCRUM_SESSION/i }).click();

    // 3. Wait for navigation into the room
    await page.waitForURL('**/room/**');
    await expect(page.getByText('SCRUM_COLLAB')).toBeVisible();

    // 4. Locate Sidebar elements
    const sidebar = page.locator('div.z-20'); // The TicketSidebar wrapper
    await expect(sidebar).toBeVisible();

    // 5. Click the "+" button to open the add ticket form
    const plusButton = sidebar.locator('button').filter({ has: page.locator('svg.lucide-plus') });
    await expect(plusButton).toBeVisible();
    await plusButton.click();

    // 6. Fill out the ticket add form
    const nameInput = page.getByPlaceholder('Ticket ID (max 20 chars)');
    const linkInput = page.getByPlaceholder('Link URL (optional)');
    const addButton = page.getByRole('button', { name: 'Add Ticket', exact: true });

    await expect(nameInput).toBeVisible();
    await nameInput.fill('TEST-101');
    await linkInput.fill('https://example.com/test-101');
    await addButton.click();

    // 7. Verify the new ticket card is added to the sidebar under TODO status
    const ticketCard = page.getByTestId('ticket-card').filter({ hasText: 'TEST-101' });
    await expect(ticketCard).toBeVisible();
    
    // Verify link icon is present and points to the link
    const ticketLink = ticketCard.locator('a');
    await expect(ticketLink).toHaveAttribute('href', 'https://example.com/test-101');

    // 8. Update Ticket Estimate (Admin option)
    const estimateInput = ticketCard.locator('input[type="text"]');
    await expect(estimateInput).toBeVisible();
    await estimateInput.clear();
    await estimateInput.fill('5');
    await estimateInput.press('Enter');

    // Verify estimate value saved/rendered
    await expect(estimateInput).toHaveValue('5');

    // 9. Change Ticket Status using the Select dropdown (Admin option)
    const statusSelect = ticketCard.locator('select');
    await expect(statusSelect).toBeVisible();
    await statusSelect.selectOption('planning');

    // Changing status to planning should show it in the main room's active selection
    await expect(page.getByText('Selecting: TEST-101')).toBeVisible({ timeout: 10000 });

    // 10. Add another ticket to test sorting
    await plusButton.click();
    await nameInput.fill('ABC-202');
    await addButton.click();

    const abcCard = page.getByTestId('ticket-card').filter({ hasText: 'ABC-202' });
    await expect(abcCard).toBeVisible();

    // Select the sort dropdown
    const sortSelect = page.locator('select[title="Sort Order"]');
    await expect(sortSelect).toBeVisible();

    // Sort by A-Z
    await sortSelect.selectOption('alpha-asc');
    
    // Validate order: ABC-202 should be listed before TEST-101 alphabetically
    const firstTicketText = await page.locator('div.custom-scrollbar.space-y-2 >> div.pointer-events-none >> span.truncate').first().textContent();
    expect(firstTicketText).toContain('ABC-202');

    // Sort by Z-A
    await sortSelect.selectOption('alpha-desc');
    const firstTicketTextDesc = await page.locator('div.custom-scrollbar.space-y-2 >> div.pointer-events-none >> span.truncate').first().textContent();
    expect(firstTicketTextDesc).toContain('TEST-101');

    // 11. Delete the ticket
    // Setup dialog handler
    page.once('dialog', async (dialog) => {
      expect(dialog.message()).toContain('Are you sure you want to delete');
      await dialog.accept();
    });

    // Delete TEST-101
    const test101Card = page.getByTestId('ticket-card').filter({ hasText: 'TEST-101' });
    const deleteButton = test101Card.locator('button[title="Delete ticket"]');
    await expect(deleteButton).toBeVisible();
    await deleteButton.click();

    // Verify it is removed from the sidebar
    await expect(test101Card).not.toBeVisible();
  });
});
