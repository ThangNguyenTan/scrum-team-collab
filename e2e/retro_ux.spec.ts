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

    // Select a template since the board starts empty
    await expect(page.getByText('Select Retrospective Template')).toBeVisible();
    const presetBtn = page.getByRole('button', { name: 'Good, Bad, Ideas, Actions' });
    await expect(presetBtn).toBeVisible();
    await presetBtn.click();

    // Verify retro columns render
    await expect(page.getByText('What Went Well', { exact: true })).toBeVisible({ timeout: 10000 });

    // 3. Test Adding a Card
    const addCardButton = page.getByRole('button', { name: 'Add a card', exact: true }).first();
    await addCardButton.scrollIntoViewIfNeeded();
    await addCardButton.click();

    // Fill thought
    const textArea = page.getByPlaceholder('Type your thought...');
    await expect(textArea).toBeVisible();
    await textArea.fill('This is a test retro card!');

    // Post card
    const postButton = page.getByRole('button', { name: 'Post Insight', exact: true });
    await postButton.click();

    // Verify card is added
    const cardText = page.getByText('This is a test retro card!');
    await expect(cardText).toBeVisible();

    // Verify author name is "Retro Tester"
    const authorSpan = page.getByText('Retro Tester', { exact: true }).first();
    await expect(authorSpan).toBeVisible();

    // 4. Test Commenting System
    const commentsButton = page.getByRole('button', { name: 'Comments (0)', exact: true });
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
    
    const commentsBtnUpdated = page.getByRole('button', { name: 'Comments (1)', exact: true });
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
    const actionItemsAddCard = page.getByRole('button', { name: 'Add a card', exact: true }).nth(3);
    await actionItemsAddCard.scrollIntoViewIfNeeded();
    await actionItemsAddCard.click();

    const actionTextArea = page.getByPlaceholder('Type your thought...');
    await expect(actionTextArea).toBeVisible();
    await actionTextArea.fill('Resolve backend database latency');

    // Post to Action Items
    const postActionInsight = page.getByRole('button', { name: 'Post Insight', exact: true });
    await postActionInsight.click();

    // Check Action card elements are visible
    await expect(page.getByText('Resolve backend database latency')).toBeVisible();
  });

  test('should allow switching between different presets and resetting the board', async ({ page }) => {
    // 1. Join room
    await page.goto('/');
    await page.getByPlaceholder('Identify yourself...').fill('Preset Master');
    await page.getByRole('button', { name: 'FE', exact: true }).click();
    await page.getByRole('button', { name: /Initialize SCRUM_SESSION/i }).click();

    await page.waitForURL('**/room/**');

    // 2. Switch to Retro tab
    const retroTab = page.getByRole('button', { name: 'Retro' });
    await expect(retroTab).toBeVisible();
    await retroTab.click();

    // 3. Verify modal opens and select "Glad, Sad, Mad" preset
    await expect(page.getByText('Select Retrospective Template')).toBeVisible();
    await page.getByRole('button', { name: 'Glad, Sad, Mad' }).click();

    // Verify columns from preset render
    await expect(page.getByText('Glad', { exact: true })).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Sad', { exact: true })).toBeVisible();
    await expect(page.getByText('Mad', { exact: true })).toBeVisible();

    // 4. Click Templates button in header to change template
    const templatesBtn = page.getByRole('button', { name: /Templates/i });
    await expect(templatesBtn).toBeVisible();
    await templatesBtn.click();

    // Confirm reset in dialog
    const confirmBtn = page.getByRole('button', { name: 'Reset & Change' });
    await expect(confirmBtn).toBeVisible();
    await confirmBtn.click();

    // Select "Sailboat Retrospective" template
    await expect(page.getByText('Select Retrospective Template')).toBeVisible();
    await page.getByRole('button', { name: 'Sailboat Retrospective' }).click();

    // Verify Sailboat columns render
    await expect(page.getByText('Wind (What helps us?)', { exact: true })).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Anchor (What slows us down?)', { exact: true })).toBeVisible();
    await expect(page.getByText('Rocks (What risks do we face?)', { exact: true })).toBeVisible();
    await expect(page.getByText('Sun (What are we aiming for?)', { exact: true })).toBeVisible();
  });
});
