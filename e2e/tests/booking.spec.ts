/**
 * Путь гостя: от лендинга до подтверждения записи.
 * Проверяется связка фронтенда и бэкенда целиком — запросы уходят в настоящее
 * API, а не в мок по контракту.
 */
import { expect, test } from '@playwright/test';
import {
  bookSlot,
  busySlots,
  freeSlots,
  pickFirstFreeSlot,
  selectDay,
  selectDayByLabel,
  submitGuestForm,
} from './helpers.js';

test('гость проходит бронирование от лендинга до подтверждения', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('link', { name: 'Записаться на встречу' }).click();

  // Каталог: профиль владельца в шапке и карточки типов событий.
  // Проверяем стартовые типы поимённо: каталог мог пополниться в других сценариях.
  await expect(page.getByRole('heading', { name: 'Алексей Смирнов' })).toBeVisible();

  for (const title of ['Знакомство', 'Консультация', 'Глубокий разбор']) {
    await expect(page.locator('[data-testid="event-type-card"]', { hasText: title })).toBeVisible();
  }

  await page.locator('[data-testid="event-type-card"]', { hasText: 'Консультация' }).click();
  await expect(page).toHaveURL(/\/book\/consultation$/);
  await expect(page.getByRole('heading', { name: 'Консультация' })).toBeVisible();

  // Календарь окна записи: у дней подписано число свободных слотов.
  const day = await selectDay(page, 1);
  expect(day).not.toEqual('');

  const time = await pickFirstFreeSlot(page);
  expect(time).toMatch(/^\d{2}:\d{2}$/);

  await submitGuestForm(page, {
    name: 'Мария Иванова',
    email: 'maria@example.com',
    notes: 'Хочу обсудить интеграцию',
  });

  // Подтверждение доступно по собственному адресу — ссылку можно сохранить.
  await expect(page).toHaveURL(/\/bookings\/[0-9a-f-]{36}$/);
  await expect(page.getByRole('heading', { name: 'Встреча забронирована' })).toBeVisible();
  await expect(page.getByText('Консультация')).toBeVisible();
  await expect(page.getByText('maria@example.com')).toBeVisible();
  await expect(page.getByText('Хочу обсудить интеграцию')).toBeVisible();
  // Длительность типа события считает сервер: получасовая встреча.
  await expect(page.getByText(new RegExp(`${time}\\s*–`))).toBeVisible();

  // Встреча попадает в список владельца.
  await page.goto('/admin/bookings');
  const row = page.getByRole('row').filter({ hasText: 'maria@example.com' });
  await expect(row).toBeVisible();
  await expect(row).toContainText('Консультация');
});

test('подтверждение открывается повторно по прямой ссылке', async ({ page }) => {
  await bookSlot(page, 'consultation', { name: 'Олег Петров', email: 'oleg@example.com' }, 2);

  const url = page.url();
  await page.goto(url);

  await expect(page.getByRole('heading', { name: 'Встреча забронирована' })).toBeVisible();
  await expect(page.getByText('oleg@example.com')).toBeVisible();
});

test('занятое время закрывается и для другого типа встречи', async ({ page }) => {
  // Календарь у владельца один: получасовая консультация гасит
  // перекрытые пятнадцатиминутные слоты «Знакомства».
  const booked = await bookSlot(
    page,
    'consultation',
    { name: 'Анна Кузнецова', email: 'anna@example.com' },
    3,
  );

  await page.goto('/book/intro-call');
  await selectDayByLabel(page, booked.day);

  const sameTime = page.locator('[data-testid="slot"]', { hasText: booked.time });
  await expect(sameTime).toHaveAttribute('data-status', 'busy');
  await expect(sameTime).toBeDisabled();

  // Занятый слот не раскрывает, кто и на какой тип события его занял.
  await expect(page.getByText('anna@example.com')).toHaveCount(0);
  await expect(page.getByText('Анна Кузнецова')).toHaveCount(0);

  // Свободные слоты того же дня остаются доступными.
  await expect(freeSlots(page).first()).toBeEnabled();
  await expect(busySlots(page).first()).toBeVisible();
});

test('форма не отправляет некорректные данные гостя', async ({ page }) => {
  await page.goto('/book/intro-call');
  await selectDay(page, 4);
  await pickFirstFreeSlot(page);

  // Адрес без домена верхнего уровня: браузер такой пропускает, а правила
  // модели Guest из контракта — нет.
  await submitGuestForm(page, { name: '  ', email: 'maria@example' });

  // Остались в форме: запрос не ушёл, ошибки показаны у полей.
  await expect(page.getByText('Укажите имя')).toBeVisible();
  await expect(page.getByText('Укажите корректный email')).toBeVisible();
  await expect(page).not.toHaveURL(/\/bookings\//);
});

test('слот, занятый во время заполнения формы, не бронируется', async ({ page, request }) => {
  await page.goto('/book/consultation');
  await selectDay(page, 8);

  const slot = freeSlots(page).first();
  const start = await slot.getAttribute('data-start');
  const time = ((await slot.textContent()) ?? '').trim();
  await slot.click();

  // Пока гость заполняет форму, это же время занимает кто-то другой.
  // Из браузера гонку не воспроизвести, поэтому вторую бронь создаём запросом.
  const rival = await request.post('/api/public/bookings', {
    data: {
      eventTypeId: 'consultation',
      start,
      guest: { name: 'Ольга Никитина', email: 'olga@example.com' },
    },
  });
  expect(rival.status()).toBe(201);

  await submitGuestForm(page, { name: 'Игорь Лебедев', email: 'igor@example.com' });

  // Бронь не создана, и гостю объяснено, что произошло.
  await expect(page.getByText('Это время уже заняли')).toBeVisible();
  await expect(page.getByText('Выберите другое время.')).toBeVisible();
  await expect(page).not.toHaveURL(/\/bookings\//);

  // Сетка перезапрошена: то же время показано занятым.
  await expect(page.locator('[data-testid="slot"]', { hasText: time })).toHaveAttribute(
    'data-status',
    'busy',
  );
});
