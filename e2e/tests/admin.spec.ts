/**
 * Админская часть: владелец управляет типами встреч и списком записей.
 * Авторизации в приложении нет — страницы открыты напрямую.
 */
import { expect, test } from '@playwright/test';
import {
  bookSlot,
  createEventType,
  editEventType,
  freeSlots,
  selectDay,
  selectDayByLabel,
} from './helpers.js';

/** Шаг между подписями слотов «ЧЧ:ММ» в минутах. */
function stepMinutes(from: string, to: string): number {
  const minutes = (label: string) => {
    const [hours, mins] = label.trim().split(':').map(Number);
    return hours * 60 + mins;
  };

  return minutes(to) - minutes(from);
}

test('новый тип встречи появляется в публичном каталоге', async ({ page }) => {
  await createEventType(page, {
    id: 'demo-call',
    title: 'Демо продукта',
    description: 'Показываю, как работает сервис.',
    durationMinutes: 45,
  });

  // Гость видит тот же тип события в каталоге и может открыть его страницу.
  await page.goto('/book');
  const card = page.locator('[data-testid="event-type-card"]', { hasText: 'Демо продукта' });
  await expect(card).toBeVisible();

  await card.click();
  await expect(page).toHaveURL(/\/book\/demo-call$/);
  await expect(page.getByText('45 мин')).toBeVisible();
});

test('правка типа встречи видна гостю', async ({ page }) => {
  // Свой тип события, чтобы правка не влияла на остальные сценарии.
  await createEventType(page, {
    id: 'strategy-session',
    title: 'Стратегия',
    description: 'Разбираем план на квартал.',
    durationMinutes: 60,
  });

  await editEventType(page, 'Стратегия', {
    title: 'Стратегическая сессия',
    description: 'Разбираем план на год.',
    durationMinutes: 30,
  });

  // Новые название и описание гость видит в каталоге.
  await page.goto('/book');
  const card = page.locator('[data-testid="event-type-card"]', {
    hasText: 'Стратегическая сессия',
  });
  await expect(card).toContainText('Разбираем план на год.');

  // Идентификатор при редактировании неизменяем: адрес страницы прежний.
  await card.click();
  await expect(page).toHaveURL(/\/book\/strategy-session$/);
  await expect(page.getByRole('heading', { name: 'Стратегическая сессия' })).toBeVisible();

  // Новая длительность задаёт и новый шаг сетки: полчаса вместо часа (I4).
  await selectDay(page, 1);
  const times = await page.locator('[data-testid="slot"]').allTextContents();
  expect(times.length).toBeGreaterThan(1);
  expect(stepMinutes(times[0], times[1])).toBe(30);
});

test('фильтр списка записей сужает выдачу по типу встречи', async ({ page }) => {
  await bookSlot(page, 'consultation', { name: 'Ирина Соколова', email: 'irina@example.com' }, 6);
  await bookSlot(page, 'intro-call', { name: 'Павел Ершов', email: 'pavel@example.com' }, 7);

  await page.goto('/admin/bookings');
  const consultation = page.getByRole('row').filter({ hasText: 'irina@example.com' });
  const introCall = page.getByRole('row').filter({ hasText: 'pavel@example.com' });

  // Встречи всех типов лежат в одном списке.
  await expect(consultation).toBeVisible();
  await expect(introCall).toBeVisible();

  // У Mantine Select метку носят и поле, и выпадающий список — берём именно поле.
  await page.getByRole('combobox', { name: 'Тип события' }).click();
  await page.getByRole('option', { name: 'Консультация' }).click();

  await expect(consultation).toBeVisible();
  await expect(introCall).toHaveCount(0);

  await page.getByRole('button', { name: 'Сбросить' }).click();
  await expect(introCall).toBeVisible();
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
