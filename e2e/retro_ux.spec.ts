import { test, expect } from '@playwright/test';

test.describe('Retro UX and Board Features', () => {
  test('should allow commenting, custom timers, and action items workflow', async ({ page }) => {
    // 1. Join room
    await page.goto('/');
    await page.getByPlaceholder('Identify yourself...').fill('Retro Tester');
    await page.getByRole('button', { name: 'FE', exact: true }).click();
    await page.getByRole('button', { name: /Initialize SCRUM_SESSION/i }).click();

    await page.waitForURL('**/room/**');

    // 2. Switch to Retro tab
    const retroTab = page.getByRole('button', { name: 'Retro' });
    await expect(retroTab).toBeVisible();
    await retroTab.click();

    // Verify retro columns render
    await expect(page.getByText('What went well', { exact: true })).toBeVisible({ timeout: 10000 });

    // 3. Test Adding a Card
    const addCardButton = page.getByRole('button', { name: 'Add a card', exact: true }).first();
    await addCardButton.scrollIntoViewIfNeeded();
    await addCardButton.click();

    // Fill thought
    const textArea = page.getByPlaceholder('Type your thought...');
    await expect(textArea).toBeVisible();
    await textArea.fill('This is a test retro card!');

    // Post card
    const postButton = page.getByRole('button', { name: /Post Insight/i });
    await postButton.click();

    // Verify card is added
    const cardText = page.getByText('This is a test retro card!');
    await expect(cardText).toBeVisible();

    // Verify author name is "Retro Tester"
    const authorSpan = page.getByText('Retro Tester', { exact: true }).first();
    await expect(authorSpan).toBeVisible();

    // 4. Test Commenting System
    const commentsButton = page.getByRole('button', { name: /Comments \(0\)/i });
    await expect(commentsButton).toBeVisible();
    await commentsButton.click();

    // Form should appear
    const commentInput = page.getByPlaceholder('Add a comment...');
    await expect(commentInput).toBeVisible();
    await commentInput.fill('An automated test comment! 🤖');
    
    const postCommentButton = page.getByRole('button', { name: 'Post', exact: true });
    await expect(postCommentButton).toBeVisible();
    await postCommentButton.click();

    // Comment should display in thread
    await expect(page.getByText('An automated test comment! 🤖')).toBeVisible();
    
    const commentsBtnUpdated = page.getByRole('button', { name: /Comments \(1\)/i });
    await expect(commentsBtnUpdated).toBeVisible();

    // Close comments drawer/container
    await commentsBtnUpdated.click();

    // 5. Test Retro Timer
    // Initially clock shows "00:00"
    const timerDisplay = page.locator('span.font-mono.font-black').first();
    await expect(timerDisplay).toBeVisible();

    // Clicking "3m" preset
    const preset3m = page.getByRole('button', { name: '3m', exact: true });
    await expect(preset3m).toBeVisible();
    await preset3m.click();

    // Clock should now start and show timer duration running (e.g. "02:59" or "02:58" etc.)
    await expect(timerDisplay).toHaveText(/02:\d\d/);

    // Pause timer
    const pauseButton = page.getByTitle('Pause Timer', { exact: true });
    await expect(pauseButton).toBeVisible();
    await pauseButton.click();

    // Reset timer
    const resetTimerButton = page.getByTitle('Reset Timer', { exact: true });
    await expect(resetTimerButton).toBeVisible();
    await resetTimerButton.click();

    // Displays back "00:00" or similar
    await expect(timerDisplay).toHaveText('00:00');

    // 6. Test Action Items Assignee & Status Tracker
    // Locate the "Action Items" column's Add card button (usually the third column)
    const actionItemsAddCard = page.getByRole('button', { name: 'Add a card', exact: true }).nth(2);
    await actionItemsAddCard.scrollIntoViewIfNeeded();
    await actionItemsAddCard.click();

    const actionTextArea = page.getByPlaceholder('Type your thought...');
    await expect(actionTextArea).toBeVisible();
    await actionTextArea.fill('Resolve backend database latency');

    // Post to Action Items
    const postActionInsight = page.getByRole('button', { name: /Post Insight/i });
    await postActionInsight.click();

    // Check Action card elements are visible
    await expect(page.getByText('Resolve backend database latency')).toBeVisible();

    // Assignee dropdown should exist
    const assigneeSelect = page.locator('select').first();
    await expect(assigneeSelect).toBeVisible();
    // Choose "Retro Tester" in dropdown
    await assigneeSelect.selectOption({ label: 'Retro Tester' });
    await expect(assigneeSelect).toHaveValue(/^[a-zA-Z0-9_-]+$/); // it will have the current user's UID as value

    // Status cycle check (Todo -> In Progress -> Done -> Todo)
    const statusBtn = page.getByRole('button', { name: /Todo/i });
    await expect(statusBtn).toBeVisible();
    await statusBtn.click(); // Cycles to In Progress
    
    const inProgressBtn = page.getByRole('button', { name: /In Progress/i });
    await expect(inProgressBtn).toBeVisible();
    await inProgressBtn.click(); // Cycles to Done

    const doneBtn = page.getByRole('button', { name: /Done/i });
    await expect(doneBtn).toBeVisible();
  });
});
