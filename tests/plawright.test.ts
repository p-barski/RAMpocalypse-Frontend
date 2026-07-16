import { test, expect } from '@playwright/test';

test('can send a chat message', async ({ browser }) => {
  const page = await browser.newPage();
  await page.goto('', { waitUntil: 'networkidle' });
  const msg = crypto.randomUUID();

  await page.press('canvas', 'Enter');
  await page.fill('input[placeholder="Type a message..."]', msg);
  await page.press('input[placeholder="Type a message..."]', 'Enter');

  await expect(page.locator('.messages-container')).toContainText(msg);
});
