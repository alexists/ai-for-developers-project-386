/**
 * Админская часть: владелец управляет типами встреч и списком записей.
 * Авторизации в приложении нет — страницы открыты напрямую.
 */
import { expect, test } from '@playwright/test';
import { bookSlot, freeSlots, selectDayByLabel } from './helpers.js';

test('новый тип встречи появляется в публичном каталоге', async ({ page }) => {
  await page.goto('/admin/event-types');
  await page.getByRole('button', { name: 'Создать тип' }).click();

  await page.getByLabel('Идентификатор').fill('demo-call');
  await page.getByLabel('Название').fill('Демо продукта');
  await page.getByLabel('Описание').fill('Показываю, как работает сервис.');
  await page.getByLabel('Длительность, минут').fill('45');
  await page.getByRole('button', { name: 'Сохранить' }).click();

  await expect(page.getByText('Демо продукта')).toBeVisible();

  // Гость видит тот же тип события в каталоге и может открыть его страницу.
  await page.goto('/book');
  const card = page.locator('[data-testid="event-type-card"]', { hasText: 'Демо продукта' });
  await expect(card).toBeVisible();

  await card.click();
  await expect(page).toHaveURL(/\/book\/demo-call$/);
  await expect(page.getByText('45 мин')).toBeVisible();
});

test('отмена встречи владельцем возвращает слот в сетку', async ({ page }) => {
  const booked = await bookSlot(
    page,
    'deep-dive',
    { name: 'Сергей Волков', email: 'sergey@example.com' },
    5,
  );

  // Слот занят: тот же час недоступен для записи.
  await page.goto('/book/deep-dive');
  await selectDayByLabel(page, booked.day);
  await expect(page.locator('[data-testid="slot"]', { hasText: booked.time })).toHaveAttribute(
    'data-status',
    'busy',
  );

  await page.goto('/admin/bookings');
  const row = page.getByRole('row').filter({ hasText: 'sergey@example.com' });
  await expect(row).toBeVisible();

  page.once('dialog', (dialog) => void dialog.accept());
  await row.getByRole('button').last().click();
  await expect(row).toHaveCount(0);

  // Освободившийся слот снова доступен гостю.
  await page.goto('/book/deep-dive');
  await selectDayByLabel(page, booked.day);

  const slot = page.locator('[data-testid="slot"]', { hasText: booked.time });
  await expect(slot).toHaveAttribute('data-status', 'free');
  await expect(freeSlots(page).first()).toBeEnabled();
});
