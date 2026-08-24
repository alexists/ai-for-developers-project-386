/**
 * Создание брони — единственная операция, меняющая календарь.
 * Здесь по очереди проверяются инварианты контракта; каждая проверка
 * соответствует своему коду ошибки.
 */
import type { Booking, BookingCreate, Owner } from '../api/types.js';
import type { Database } from '../db/database.js';
import { insertBooking } from '../repositories/bookings.js';
import { findEventType } from '../repositories/eventTypes.js';
import {
  bookingWindow,
  buildDayGrid,
  dateOf,
  isDateInWindow,
  parseInstant,
  toUtcIso,
} from '../domain/slots.js';
import {
  eventTypeNotFound,
  invalidPayload,
  slotNotOnGrid,
  slotOutsideWindow,
  slotTaken,
} from '../domain/errors.js';

export function createBooking(
  db: Database,
  owner: Owner,
  input: BookingCreate,
  now: Date,
): Booking {
  const eventType = findEventType(db, input.eventTypeId);

  if (eventType === undefined) {
    throw eventTypeNotFound(input.eventTypeId);
  }

  const start = parseInstant(input.start);

  if (!start.isValid) {
    throw invalidPayload('Поле start не является моментом времени в формате ISO 8601');
  }

  // I4: start обязан быть узлом сетки своего типа события — сетки у разных
  // длительностей разные, поэтому проверяем по дню в таймзоне владельца.
  const date = dateOf(start, owner.timeZone);
  const slot = buildDayGrid(owner, eventType.durationMinutes, date).find(
    (candidate) => Date.parse(candidate.start) === start.toMillis(),
  );

  if (slot === undefined) {
    throw slotNotOnGrid(
      `Время ${toUtcIso(start)} не совпадает с сеткой слотов типа события "${eventType.id}"`,
    );
  }

  // I2: слот в прошлом или за границей окна записи недоступен.
  if (start.toMillis() < now.getTime() || !isDateInWindow(date, bookingWindow(owner, now))) {
    throw slotOutsideWindow('Слот вне окна записи: доступны 14 дней начиная с текущего момента');
  }

  // I3: end считает сервер, гость его не передаёт. I1: пересечения ловит вставка.
  const booking = insertBooking(db, {
    eventTypeId: eventType.id,
    eventTypeTitle: eventType.title,
    start: slot.start,
    end: slot.end,
    guest: input.guest,
  });

  if (booking === undefined) {
    throw slotTaken();
  }

  return booking;
}
