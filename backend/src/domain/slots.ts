/**
 * Сетка слотов и окно записи — инварианты I1–I4 из контракта.
 *
 * Модуль чистый: он ничего не знает про базу и HTTP, только про профиль
 * владельца, длительность типа события и уже занятые интервалы. Всё, что
 * приходит и уходит наружу, — строки в формате контракта: моменты в UTC ISO,
 * даты в plainDate (YYYY-MM-DD) в таймзоне владельца.
 */
import { DateTime } from 'luxon';
import type { Owner, Slot } from '../api/types.js';

/** I2. Глубина окна записи в днях. Значение зафиксировано в main.tsp. */
export const BOOKING_WINDOW_DAYS = 14;

/** Интервал времени в UTC ISO. Именно так хранятся брони и строится сетка. */
export interface TimeRange {
  start: string;
  end: string;
}

/** Окно записи в датах таймзоны владельца, границы включительно. */
export interface BookingWindow {
  windowStart: string;
  windowEnd: string;
}

/** Канонический вид момента времени в ответах: UTC, без миллисекунд. */
export function toUtcIso(moment: DateTime): string {
  return moment.toUTC().toISO({ suppressMilliseconds: true }) ?? '';
}

/** Разбор момента, присланного клиентом. Смещение допускается любое, хранится UTC. */
export function parseInstant(value: string): DateTime {
  return DateTime.fromISO(value, { setZone: true }).toUTC();
}

/** Сегодняшняя дата в таймзоне владельца. */
export function todayIn(timeZone: string, now: Date): string {
  return DateTime.fromJSDate(now, { zone: timeZone }).toISODate() ?? '';
}

/** I2. Окно записи: сегодня в таймзоне владельца плюс 14 дней. */
export function bookingWindow(owner: Owner, now: Date): BookingWindow {
  const start = DateTime.fromJSDate(now, { zone: owner.timeZone }).startOf('day');

  return {
    windowStart: start.toISODate() ?? '',
    windowEnd: start.plus({ days: BOOKING_WINDOW_DAYS }).toISODate() ?? '',
  };
}

/** Все даты окна по возрастанию. */
export function windowDates(window: BookingWindow): string[] {
  const dates: string[] = [];

  for (let index = 0; index <= BOOKING_WINDOW_DAYS; index += 1) {
    const date = DateTime.fromISO(window.windowStart).plus({ days: index }).toISODate();

    if (date !== null) {
      dates.push(date);
    }
  }

  return dates;
}

/** Дата целиком за пределами окна — такой день недоступен для записи. */
export function isDateInWindow(date: string, window: BookingWindow): boolean {
  return date >= window.windowStart && date <= window.windowEnd;
}

function zonedMoment(date: string, time: string, timeZone: string): DateTime {
  return DateTime.fromISO(`${date}T${time}`, { zone: timeZone });
}

/**
 * I4. Полная сетка рабочего дня: от workdayStart с шагом durationMinutes.
 * Слот, не влезающий целиком до workdayEnd, в сетку не попадает.
 * Окно записи и занятость здесь не учитываются.
 */
export function buildDayGrid(owner: Owner, durationMinutes: number, date: string): TimeRange[] {
  const dayStart = zonedMoment(date, owner.workdayStart, owner.timeZone);
  const dayEnd = zonedMoment(date, owner.workdayEnd, owner.timeZone);

  if (!dayStart.isValid || !dayEnd.isValid || dayEnd <= dayStart) {
    return [];
  }

  const grid: TimeRange[] = [];

  for (let cursor = dayStart; ; ) {
    const slotEnd = cursor.plus({ minutes: durationMinutes });

    if (slotEnd > dayEnd) {
      break;
    }

    grid.push({ start: toUtcIso(cursor), end: toUtcIso(slotEnd) });
    cursor = slotEnd;
  }

  return grid;
}

/**
 * Сетка дня, обрезанная окном записи (I2): день вне окна даёт пустой массив,
 * у сегодняшнего дня отсекаются слоты, которые уже начались.
 *
 * Именно эта сетка отдаётся гостю и считается в сводке по дням: гостю никогда
 * не показывается свободным слот, забронировать который сервер откажется.
 */
export function bookableDayGrid(
  owner: Owner,
  durationMinutes: number,
  date: string,
  now: Date,
): TimeRange[] {
  if (!isDateInWindow(date, bookingWindow(owner, now))) {
    return [];
  }

  const nowMillis = now.getTime();

  return buildDayGrid(owner, durationMinutes, date).filter(
    (slot) => Date.parse(slot.start) >= nowMillis,
  );
}

/** I1. Пересечение интервалов: границы соприкасаться могут, накладываться — нет. */
export function overlaps(left: TimeRange, right: TimeRange): boolean {
  return (
    Date.parse(left.start) < Date.parse(right.end) && Date.parse(right.start) < Date.parse(left.end)
  );
}

/**
 * I1 + I5. Проставляет статусы: слот занят, если его перекрывает любая бронь —
 * независимо от типа события. Ни гостя, ни тип события статус не раскрывает.
 */
export function markSlots(grid: TimeRange[], bookings: TimeRange[]): Slot[] {
  return grid.map((slot) => ({
    start: slot.start,
    end: slot.end,
    status: bookings.some((booking) => overlaps(slot, booking)) ? 'busy' : 'free',
  }));
}

/** Дата (в таймзоне владельца), которой принадлежит момент времени. */
export function dateOf(moment: DateTime, timeZone: string): string {
  return moment.setZone(timeZone).toISODate() ?? '';
}
