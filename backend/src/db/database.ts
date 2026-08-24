/**
 * Открытие базы. SQLite взят встроенный в Node (`node:sqlite`): это тот же
 * SQLite, но без нативной сборки — образ Docker собирается без компилятора.
 */
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { EVENT_TYPES_SEED, OWNER_SEED, SCHEMA_SQL } from './schema.js';

export type Database = DatabaseSync;

/** Данные создаются один раз: повторный старт на существующей базе их не трогает. */
function seed(db: Database): void {
  const ownerCount = db.prepare('SELECT COUNT(*) AS count FROM owner').get() as { count: number };

  if (ownerCount.count === 0) {
    db.prepare(
      `INSERT INTO owner (id, name, bio, avatar_url, time_zone, workday_start, workday_end)
       VALUES (1, ?, ?, ?, ?, ?, ?)`,
    ).run(
      OWNER_SEED.name,
      OWNER_SEED.bio,
      OWNER_SEED.avatarUrl,
      OWNER_SEED.timeZone,
      OWNER_SEED.workdayStart,
      OWNER_SEED.workdayEnd,
    );
  }

  const eventTypeCount = db.prepare('SELECT COUNT(*) AS count FROM event_types').get() as {
    count: number;
  };

  if (eventTypeCount.count === 0) {
    const insert = db.prepare(
      'INSERT INTO event_types (id, title, description, duration_minutes) VALUES (?, ?, ?, ?)',
    );

    for (const eventType of EVENT_TYPES_SEED) {
      insert.run(eventType.id, eventType.title, eventType.description, eventType.durationMinutes);
    }
  }
}

export function openDatabase(path: string): Database {
  if (path !== ':memory:') {
    mkdirSync(dirname(path), { recursive: true });
  }

  const db = new DatabaseSync(path);

  db.exec('PRAGMA journal_mode = WAL');
  db.exec('PRAGMA foreign_keys = ON');
  db.exec(SCHEMA_SQL);

  seed(db);

  return db;
}
