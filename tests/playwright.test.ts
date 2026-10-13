import { test, expect, type Page } from '@playwright/test';
import type { Game } from '../src/game';

function waitForServerConnection(page: Page) {
  return page.waitForFunction(() => {
    const game = (window as Window & { game?: Game | null }).game;
    return game?.communicationService.isConnected() ?? false;
  });
}

function waitForOnlineGameStart(page: Page) {
  return page.waitForFunction(() => {
    const game = (window as Window & { game?: Game | null }).game;
    return game?.gameSession.isOnlineMatch && game.gameStateManager.getGameState() === 'playing';
  });
}

async function openGame(page: Page, playerName: string) {
  await page.goto('', { waitUntil: 'domcontentloaded' });
  await waitForServerConnection(page);
  await page.getByPlaceholder('Enter a name...').fill(playerName);
  await page.getByRole('button', { name: 'Save' }).click();
}

async function sendChatMessage(page: Page, message: string) {
  const input = page.getByPlaceholder('Type a message...');
  await input.fill(message);
  await input.press('Enter');
}

test('can send a chat message', async ({ page }) => {
  await openGame(page, 'Player 1');
  const msg = crypto.randomUUID();

  await page.locator('canvas').press('Enter');
  await sendChatMessage(page, msg);

  await expect(page.locator('.messages-container')).toContainText(msg);
});

test('Lobby chat is cleared when new game starts', async ({ page: pagePlayer1, browser }) => {
  const contextPlayer2 = await browser.newContext();
  const pagePlayer2 = await contextPlayer2.newPage();

  await Promise.all([openGame(pagePlayer1, 'Player 1'), openGame(pagePlayer2, 'Player 2')]);
  await pagePlayer1.getByRole('button', { name: 'Request matchmaking' }).click();
  await pagePlayer2.getByRole('button', { name: 'Request matchmaking' }).click();
  await Promise.all([waitForOnlineGameStart(pagePlayer1), waitForOnlineGameStart(pagePlayer2)]);
  await pagePlayer1.locator('canvas').press('Enter');
  await pagePlayer2.locator('canvas').press('Enter');
  await pagePlayer1.getByRole('button', { name: 'Lobby chat' }).click();
  await pagePlayer2.getByRole('button', { name: 'Lobby chat' }).click();
  const msg = crypto.randomUUID();

  await sendChatMessage(pagePlayer1, msg);

  await expect(pagePlayer1.locator('.messages-container')).toContainText(msg);
  await pagePlayer1.getByRole('button', { name: 'Leave game' }).click();
  await pagePlayer1.getByRole('button', { name: 'Request matchmaking' }).click();
  await expect(pagePlayer1.locator('.messages-container')).not.toContainText(msg);

  await contextPlayer2.close();
});
