/** Типы событий: CRUD владельца и публичное чтение. */
import type { EventType, EventTypeCreate, EventTypeUpdate } from '../api/types.js';
import type { Database } from '../db/database.js';

interface EventTypeRow {
  id: string;
  title: string;
  description: string;
  duration_minutes: number;
}

function toEventType(row: EventTypeRow): EventType {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    durationMinutes: row.duration_minutes,
  };
}

export function listEventTypes(db: Database): EventType[] {
  const rows = db.prepare('SELECT * FROM event_types ORDER BY duration_minutes, id').all() as unknown as
    | EventTypeRow[];

  return rows.map(toEventType);
}

export function findEventType(db: Database, id: string): EventType | undefined {
  const row = db.prepare('SELECT * FROM event_types WHERE id = ?').get(id) as unknown as
    | EventTypeRow
    | undefined;

  return row === undefined ? undefined : toEventType(row);
}

export function eventTypeExists(db: Database, id: string): boolean {
  return db.prepare('SELECT 1 FROM event_types WHERE id = ?').get(id) !== undefined;
}

/**
 * description и durationMinutes приходят уже заполненными: значения по умолчанию
 * из контракта подставляет валидатор запроса, поэтому здесь их не дублируем.
 */
export function insertEventType(db: Database, input: Required<EventTypeCreate>): EventType {
  db.prepare(
    'INSERT INTO event_types (id, title, description, duration_minutes) VALUES (?, ?, ?, ?)',
  ).run(input.id, input.title, input.description, input.durationMinutes);

  return {
    id: input.id,
    title: input.title,
    description: input.description,
    durationMinutes: input.durationMinutes,
  };
}

/** Частичное обновление: id неизменяем, непереданные поля остаются как были. */
export function updateEventType(
  db: Database,
  id: string,
  patch: EventTypeUpdate,
): EventType | undefined {
  const current = findEventType(db, id);

  if (current === undefined) {
    return undefined;
  }

  const updated: EventType = {
    id: current.id,
    title: patch.title ?? current.title,
    description: patch.description ?? current.description,
    durationMinutes: patch.durationMinutes ?? current.durationMinutes,
  };

  db.prepare(
    'UPDATE event_types SET title = ?, description = ?, duration_minutes = ? WHERE id = ?',
  ).run(updated.title, updated.description, updated.durationMinutes, id);

  return updated;
}

/** Уже созданные брони остаются: у них сохранён eventTypeTitle на момент записи. */
export function deleteEventType(db: Database, id: string): boolean {
  return db.prepare('DELETE FROM event_types WHERE id = ?').run(id).changes > 0;
}
