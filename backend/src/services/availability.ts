/**
 * Доступность: сводка по дням окна для календаря и детальная сетка одного дня
 * для панели «Статус слотов». Оба ответа строятся из одной сетки, поэтому
 * подпись «сколько свободно» всегда совпадает с тем, что видно в панели.
 */
import { DateTime } from 'luxon';
import type { AvailabilityCalendar, DaySlots, EventType, Owner } from '../api/types.js';
import type { Database } from '../db/database.js';
import { findOverlapping } from '../repositories/bookings.js';
import {
  bookableDayGrid,
  bookingWindow,
  markSlots,
  toUtcIso,
  windowDates,
  type BookingWindow,
  type TimeRange,
} from '../domain/slots.js';

/** Границы всего окна записи как момент времени — одним запросом за бронями. */
function windowRange(owner: Owner, window: BookingWindow): TimeRange {
  const start = DateTime.fromISO(window.windowStart, { zone: owner.timeZone }).startOf('day');
  const end = DateTime.fromISO(window.windowEnd, { zone: owner.timeZone }).endOf('day');

  return { start: toUtcIso(start), end: toUtcIso(end) };
}

export function buildAvailability(
  db: Database,
  owner: Owner,
  eventType: EventType,
  now: Date,
): AvailabilityCalendar {
  const window = bookingWindow(owner, now);
  // Одна выборка на всё окно: по дням её фильтрует уже markSlots.
  const bookings = findOverlapping(db, windowRange(owner, window));

  const days = windowDates(window).map((date) => {
    const grid = bookableDayGrid(owner, eventType.durationMinutes, date, now);
    const slots = markSlots(grid, bookings);
    const freeSlots = slots.filter((slot) => slot.status === 'free').length;

    return {
      date,
      freeSlots,
      totalSlots: slots.length,
      isBookable: freeSlots > 0,
    };
  });

  return {
    eventTypeId: eventType.id,
    timeZone: owner.timeZone,
    windowStart: window.windowStart,
    windowEnd: window.windowEnd,
    days,
  };
}

export function buildDaySlots(
  db: Database,
  owner: Owner,
  eventType: EventType,
  date: string,
  now: Date,
): DaySlots {
  const grid = bookableDayGrid(owner, eventType.durationMinutes, date, now);
  const bookings =
    grid.length === 0
      ? []
      : findOverlapping(db, { start: grid[0]!.start, end: grid[grid.length - 1]!.end });

  return {
    eventTypeId: eventType.id,
    date,
    timeZone: owner.timeZone,
    slots: markSlots(grid, bookings),
  };
}
