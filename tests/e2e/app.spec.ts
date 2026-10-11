import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('./');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
});

test('loads the workout app with all blocks', async ({ page }) => {
  await expect(page.getByText('Силовий блок')).toBeVisible();
  await expect(page.getByText('Блок для кору')).toBeVisible();
  await expect(page.locator('.progress-text')).toContainText('0/19');
  await expect(page.locator('#cb-leg-press')).toBeAttached();
});

test('persists a completed exercise across reloads', async ({ page }) => {
  await page.locator('label[for="cb-leg-press"]').click();
  await expect(page.locator('.progress-text')).toContainText('1/19');
  await page.reload();
  await expect(page.locator('.progress-text')).toContainText('1/19');
  await expect(page.locator('#cb-leg-press')).toBeChecked();
});

test('marks partial sets via dots', async ({ page }) => {
  const card = page.locator('.exercise').first();
  const dots = card.locator('.set-dot');
  await expect(dots).toHaveCount(3);
  await dots.nth(0).click();
  await expect(card).toHaveClass(/partial/);
  await expect(page.locator('.progress-text')).toContainText('0/19');
  await dots.nth(1).click();
  await dots.nth(2).click();
  await expect(page.locator('.progress-text')).toContainText('1/19');
});

test('runs a rest timer and stops it', async ({ page }) => {
  await page.locator('.ew-timer').first().click();
  const timer = page.getByRole('timer');
  await expect(timer).toBeVisible();
  await expect(timer).toContainText('Жим ногами');
  await timer.locator('.rt-stop').click();
  await expect(page.getByRole('timer')).toHaveCount(0);
});

test('records an exercise weight through the dialog', async ({ page }) => {
  const card = page.locator('.exercise').first();
  await card.getByText('+ Вага').click();
  const dialog = page.locator('#weight-dialog');
  await expect(dialog).toBeVisible();
  await dialog.locator('#dlg-input').fill('62.5');
  await dialog.locator('#dlg-ok').click();
  await expect(card).toContainText('62.5 кг');
  // Після перезавантаження вага лишається (історія v2).
  await page.reload();
  await expect(page.locator('.exercise').first()).toContainText('62.5 кг');
});

test('exports a backup file', async ({ page }) => {
  const downloadPromise = page.waitForEvent('download');
  await page.locator('#btn-export').click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/^gym-tracker-\d{4}-\d{2}-\d{2}\.json$/);
});

test('undoes a weight deletion', async ({ page }) => {
  await page.locator('#w-input').fill('80');
  await page.locator('#w-add').click();
  await expect(page.locator('.weight-entry')).toHaveCount(1);
  await page.locator('.w-btn-del').first().click();
  await expect(page.locator('.weight-entry')).toHaveCount(0);
  await page.locator('#toast-undo').click();
  await expect(page.locator('.weight-entry')).toHaveCount(1);
});
