/** Общая обвязка тестов: приложение на базе в памяти и с зафиксированным «сейчас». */
import { buildApp } from '../src/app.js';
import { openDatabase } from '../src/db/database.js';

/**
 * Понедельник, 08:00 в Europe/Berlin (CEST, UTC+2).
 * Рабочий день владельца 09:00–18:00 ещё не начался, поэтому вся сегодняшняя
 * сетка попадает в окно записи и тесты не зависят от реального времени.
 */
export const NOW = new Date('2026-09-07T06:00:00Z');

export const TODAY = '2026-09-07';
export const TOMORROW = '2026-09-08';

/** 09:00 в Берлине — начало рабочего дня, первый слот любой сетки. */
export const workdayStartUtc = (date: string): string => `${date}T07:00:00Z`;

export const createDb = () => openDatabase(':memory:');

/** База по умолчанию своя у каждого приложения; общую передают, чтобы сменить «сейчас». */
export async function createTestApp(now: Date = NOW, db = createDb()) {
  return buildApp({ db, now: () => now });
}

export const guest = {
  name: 'Мария Иванова',
  email: 'maria@example.com',
  notes: 'Хочу обсудить интеграцию',
};
