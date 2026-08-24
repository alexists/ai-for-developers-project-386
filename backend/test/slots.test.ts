/** Юнит-тесты сетки слотов: инварианты I1, I2, I4 без HTTP и базы. */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { Owner } from '../src/api/types.js';
import {
  BOOKING_WINDOW_DAYS,
  bookableDayGrid,
  bookingWindow,
  buildDayGrid,
  markSlots,
  overlaps,
  windowDates,
} from '../src/domain/slots.js';
import { NOW, TODAY } from './helpers.js';

const owner: Owner = {
  name: 'Владелец',
  timeZone: 'Europe/Berlin',
  workdayStart: '09:00:00',
  workdayEnd: '18:00:00',
};

describe('сетка рабочего дня (I4)', () => {
  it('строится от начала рабочего дня с шагом длительности', () => {
    const grid = buildDayGrid(owner, 30, TODAY);

    // 09:00–18:00 в Берлине — это 07:00–16:00 UTC, девять часов.
    assert.equal(grid.length, 18);
    assert.deepEqual(grid[0], { start: `${TODAY}T07:00:00Z`, end: `${TODAY}T07:30:00Z` });
    assert.equal(grid[17]?.end, `${TODAY}T16:00:00Z`);
  });

  it('у разных длительностей сетки разные', () => {
    assert.equal(buildDayGrid(owner, 15, TODAY).length, 36);
    assert.equal(buildDayGrid(owner, 60, TODAY).length, 9);
  });

  it('слот, не влезающий целиком до конца дня, в сетку не попадает', () => {
    // 50 минут: 10 слотов занимают 500 минут из 540, остаток в 40 минут отбрасывается.
    const grid = buildDayGrid(owner, 50, TODAY);

    assert.equal(grid.length, 10);
    assert.equal(grid[9]?.end, `${TODAY}T15:20:00Z`);
  });

  it('учитывает переход на зимнее время', () => {
    // В ночь на 25.10.2026 Берлин переходит с UTC+2 на UTC+1:
    // рабочий день начинается на час позже по UTC.
    const grid = buildDayGrid(owner, 60, '2026-10-25');

    assert.equal(grid[0]?.start, '2026-10-25T08:00:00Z');
    assert.equal(grid.length, 9);
  });
});

describe('окно записи (I2)', () => {
  it('начинается сегодня и длится 14 дней', () => {
    const window = bookingWindow(owner, NOW);

    assert.deepEqual(window, { windowStart: '2026-09-07', windowEnd: '2026-09-21' });
    assert.equal(windowDates(window).length, BOOKING_WINDOW_DAYS + 1);
  });

  it('день за границей окна не даёт слотов', () => {
    assert.equal(bookableDayGrid(owner, 30, '2026-09-22', NOW).length, 0);
    assert.equal(bookableDayGrid(owner, 30, '2026-09-06', NOW).length, 0);
  });

  it('прошедшие слоты сегодняшнего дня отсекаются', () => {
    // 12:30 в Берлине: первые семь получасовых слотов уже позади.
    const midday = new Date('2026-09-07T10:30:00Z');
    const grid = bookableDayGrid(owner, 30, TODAY, midday);

    assert.equal(grid.length, 11);
    assert.equal(grid[0]?.start, `${TODAY}T10:30:00Z`);
  });
});

describe('занятость (I1)', () => {
  it('пересечением считается наложение, а не соприкосновение границ', () => {
    const slot = { start: `${TODAY}T07:00:00Z`, end: `${TODAY}T07:30:00Z` };

    assert.equal(overlaps(slot, { start: `${TODAY}T07:15:00Z`, end: `${TODAY}T07:45:00Z` }), true);
    assert.equal(overlaps(slot, { start: `${TODAY}T07:30:00Z`, end: `${TODAY}T08:00:00Z` }), false);
  });

  it('одна получасовая бронь гасит два пятнадцатиминутных слота', () => {
    const slots = markSlots(buildDayGrid(owner, 15, TODAY), [
      { start: `${TODAY}T07:00:00Z`, end: `${TODAY}T07:30:00Z` },
    ]);

    assert.deepEqual(
      slots.slice(0, 3).map((slot) => slot.status),
      ['busy', 'busy', 'free'],
    );
  });
});
