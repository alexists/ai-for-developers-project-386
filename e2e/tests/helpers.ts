/**
 * Шаги, повторяющиеся в сценариях. Селекторы держатся за роли, метки и
 * data-testid, а не за вёрстку Mantine: перекраска интерфейса не должна
 * ломать проверки.
 */
import { expect, type Page } from '@playwright/test';

export interface ChosenSlot {
  /** Подпись дня в календаре, например «25 августа 2026». */
  day: string;
  /** Время слота в таймзоне владельца, например «09:30». */
  time: string;
}

/**
 * Свободные дни окна записи: некликабельные сервер помечает через isBookable,
 * а дни соседнего месяца календарь оставляет в разметке скрытыми
 * (data-hidden) — их из выборки надо исключить.
 */
function bookableDays(page: Page) {
  return page.locator('table button:not([disabled]):not([data-hidden])');
}

/**
 * Выбирает день окна записи с конца видимого месяца. Сценарии берут разные
 * дни, чтобы брони одного не влияли на проверки другого.
 */
export async function selectDay(page: Page, fromEnd = 1): Promise<string> {
  const days = bookableDays(page);
  await expect(days.first()).toBeVisible();

  const total = await days.count();
  const day = days.nth(Math.max(0, total - fromEnd));
  const label = (await day.getAttribute('aria-label')) ?? '';

  await day.click();
  await expect(page.getByText(/свободно \d+ из \d+/)).toBeVisible();

  return label;
}

/** Возвращается к тому же дню на странице другого типа события. */
export async function selectDayByLabel(page: Page, label: string): Promise<void> {
  await page.locator(`table button[aria-label="${label}"]:not([data-hidden])`).click();
  await expect(page.getByText(/свободно \d+ из \d+/)).toBeVisible();
}

export const freeSlots = (page: Page) => page.locator('[data-testid="slot"][data-status="free"]');
export const busySlots = (page: Page) => page.locator('[data-testid="slot"][data-status="busy"]');

/** Кликает первый свободный слот дня и возвращает его время. */
export async function pickFirstFreeSlot(page: Page): Promise<string> {
  const slot = freeSlots(page).first();
  await expect(slot).toBeVisible();

  const time = ((await slot.textContent()) ?? '').trim();
  await slot.click();

  return time;
}

/** Заполняет форму гостя и подтверждает запись. */
export async function submitGuestForm(
  page: Page,
  guest: { name: string; email: string; notes?: string },
): Promise<void> {
  await page.getByLabel('Имя').fill(guest.name);
  await page.getByLabel('Email').fill(guest.email);

  if (guest.notes !== undefined) {
    await page.getByLabel('Заметки').fill(guest.notes);
  }

  await page.getByRole('button', { name: 'Подтвердить запись' }).click();
}

/** Полный путь гостя: тип события -> день -> слот -> форма -> подтверждение. */
export async function bookSlot(
  page: Page,
  eventTypeId: string,
  guest: { name: string; email: string; notes?: string },
  fromEnd = 1,
): Promise<ChosenSlot> {
  await page.goto(`/book/${eventTypeId}`);

  const day = await selectDay(page, fromEnd);
  const time = await pickFirstFreeSlot(page);

  await submitGuestForm(page, guest);
  await expect(page.getByRole('heading', { name: 'Встреча забронирована' })).toBeVisible();

  return { day, time };
}
