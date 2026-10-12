import { test, expect, type Page } from '@playwright/test';
import type { Game } from '../src/game';

function waitForOnlineGameStart(page: Page) {
  return page.waitForFunction(() => {
    const game = (window as Window & { game?: Game | null }).game;
    return game?.gameSession.isOnlineMatch && game.gameStateManager.getGameState() === 'playing';
  });
}

test('can send a chat message', async ({ browser }) => {
  const page = await browser.newPage();
  await page.goto('', { waitUntil: 'domcontentloaded' });
  await page.fill('input[placeholder="Enter a name..."]', 'Player 1');
  await page.click('button:has-text("Save")');
  const msg = crypto.randomUUID();

  await page.press('canvas', 'Enter');
  await page.fill('input[placeholder="Type a message..."]', msg);
  await page.press('input[placeholder="Type a message..."]', 'Enter');

  await expect(page.locator('.messages-container')).toContainText(msg);
});

test('Lobby chat is cleared when new game starts', async ({ browser }) => {
  const pagePlayer1 = await browser.newPage();
  const pagePlayer2 = await browser.newPage();
  await pagePlayer1.goto('', { waitUntil: 'domcontentloaded' });
  await pagePlayer2.goto('', { waitUntil: 'domcontentloaded' });
  await pagePlayer1.fill('input[placeholder="Enter a name..."]', 'Player 1');
  await pagePlayer2.fill('input[placeholder="Enter a name..."]', 'Player 2');
  await pagePlayer1.click('button:has-text("Save")');
  await pagePlayer2.click('button:has-text("Save")');
  await pagePlayer1.click('button:has-text("Request matchmaking")');
  await pagePlayer2.click('button:has-text("Request matchmaking")');
  await Promise.all([waitForOnlineGameStart(pagePlayer1), waitForOnlineGameStart(pagePlayer2)]);
  await pagePlayer1.press('canvas', 'Enter');
  await pagePlayer2.press('canvas', 'Enter');
  await pagePlayer1.click('button:has-text("Lobby chat")');
  await pagePlayer2.click('button:has-text("Lobby chat")');
  const msg = crypto.randomUUID();

  await pagePlayer1.fill('input[placeholder="Type a message..."]', msg);
  await pagePlayer1.press('input[placeholder="Type a message..."]', 'Enter');

  await expect(pagePlayer1.locator('.messages-container')).toContainText(msg);
  await pagePlayer1.click('button:has-text("Leave game")');
  await pagePlayer1.click('button:has-text("Request matchmaking")');
  await expect(pagePlayer1.locator('.messages-container')).not.toContainText(msg);
});
