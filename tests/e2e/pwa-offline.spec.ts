import { expect, test } from '@playwright/test';

test('serves the installed app after the network is unavailable', async ({ page, context }) => {
  await page.goto('./');
  await expect(page.getByText('Силовий блок')).toBeVisible();

  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page.reload();
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page.waitForFunction(() => Boolean(navigator.serviceWorker.controller));

  await context.setOffline(true);
  await page.reload();
  await expect(page.getByText('Силовий блок')).toBeVisible();
  await expect(page.locator('.progress-text')).toContainText('0/19');
});
