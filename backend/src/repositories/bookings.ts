/** Бронирования — единственная сущность, меняющая состояние календаря. */
import { randomUUID } from 'node:crypto';
import type { Booking, Guest } from '../api/types.js';
import type { Database } from '../db/database.js';
import type { TimeRange } from '../domain/slots.js';

interface BookingRow {
  id: string;
  event_type_id: string;
  event_type_title: string;
  start_utc: string;
  end_utc: string;
  guest_name: string;
  guest_email: string;
  guest_notes: string | null;
  created_at: string;
}

function toBooking(row: BookingRow): Booking {
  const guest: Guest = { name: row.guest_name, email: row.guest_email };

  if (row.guest_notes !== null) {
    guest.notes = row.guest_notes;
  }

  return {
    id: row.id,
    eventTypeId: row.event_type_id,
    eventTypeTitle: row.event_type_title,
    start: row.start_utc,
    end: row.end_utc,
    guest,
    createdAt: row.created_at,
  };
}

export interface BookingFilter {
  /** Нижняя граница по start, UTC ISO. */
  from?: string;
  /** Верхняя граница по start, UTC ISO. */
  to?: string;
  eventTypeId?: string;
}

export function listBookings(db: Database, filter: BookingFilter = {}): Booking[] {
  const conditions: string[] = [];
  const parameters: string[] = [];

  if (filter.from !== undefined) {
    conditions.push('start_utc >= ?');
    parameters.push(filter.from);
  }

  if (filter.to !== undefined) {
    conditions.push('start_utc <= ?');
    parameters.push(filter.to);
  }

  if (filter.eventTypeId !== undefined) {
    conditions.push('event_type_id = ?');
    parameters.push(filter.eventTypeId);
  }

  const where = conditions.length === 0 ? '' : ` WHERE ${conditions.join(' AND ')}`;
  const rows = db
    .prepare(`SELECT * FROM bookings${where} ORDER BY start_utc`)
    .all(...parameters) as unknown as BookingRow[];

  return rows.map(toBooking);
}

export function findBooking(db: Database, id: string): Booking | undefined {
  const row = db.prepare('SELECT * FROM bookings WHERE id = ?').get(id) as unknown as BookingRow | undefined;

  return row === undefined ? undefined : toBooking(row);
}

/**
 * Брони, пересекающиеся с интервалом, по всем типам событий сразу (I1):
 * календарь у владельца один. Используется и для сетки слотов, и для проверки
 * конфликта при создании брони.
 */
export function findOverlapping(db: Database, range: TimeRange): TimeRange[] {
  const rows = db
    .prepare(
      `SELECT start_utc, end_utc FROM bookings
       WHERE start_utc < ? AND end_utc > ?
       ORDER BY start_utc`,
    )
    .all(range.end, range.start) as unknown as { start_utc: string; end_utc: string }[];

  return rows.map((row) => ({ start: row.start_utc, end: row.end_utc }));
}

export interface NewBooking {
  eventTypeId: string;
  eventTypeTitle: string;
  start: string;
  end: string;
  guest: Guest;
}

/**
 * Создаёт бронь, если её интервал ни с чем не пересекается.
 * Проверка и вставка идут в одной транзакции — иначе два одновременных гостя
 * могли бы занять один слот, пройдя проверку до вставки друг друга.
 * `undefined` означает конфликт (409 slot_taken).
 */
export function insertBooking(db: Database, input: NewBooking): Booking | undefined {
  const booking: Booking = {
    id: randomUUID(),
    eventTypeId: input.eventTypeId,
    eventTypeTitle: input.eventTypeTitle,
    start: input.start,
    end: input.end,
    guest: input.guest,
    createdAt: new Date().toISOString().replace(/\.\d{3}Z$/, 'Z'),
  };

  db.exec('BEGIN IMMEDIATE');

  try {
    const conflicting = findOverlapping(db, { start: input.start, end: input.end });

    if (conflicting.length > 0) {
      db.exec('ROLLBACK');
      return undefined;
    }

    db.prepare(
      `INSERT INTO bookings
         (id, event_type_id, event_type_title, start_utc, end_utc,
          guest_name, guest_email, guest_notes, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      booking.id,
      booking.eventTypeId,
      booking.eventTypeTitle,
      booking.start,
      booking.end,
      booking.guest.name,
      booking.guest.email,
      booking.guest.notes ?? null,
      booking.createdAt,
    );

    db.exec('COMMIT');
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }

  return booking;
}

/** Отмена встречи владельцем: слот снова становится свободным. */
export function deleteBooking(db: Database, id: string): boolean {
  return db.prepare('DELETE FROM bookings WHERE id = ?').run(id).changes > 0;
}
