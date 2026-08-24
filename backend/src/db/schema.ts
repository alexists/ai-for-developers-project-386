/**
 * Структура базы и стартовые данные.
 *
 * Хранятся только две сущности: типы событий и бронирования. Слоты не хранятся —
 * они вычисляются на лету из профиля владельца, длительности типа события и
 * существующих броней (см. domain/slots.ts).
 *
 * Профиль владельца лежит одной строкой с жёстким CHECK id = 1: владелец
 * единственный, создать или удалить его через API нельзя.
 */
export const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS owner (
  id            INTEGER PRIMARY KEY CHECK (id = 1),
  name          TEXT NOT NULL,
  bio           TEXT,
  avatar_url    TEXT,
  time_zone     TEXT NOT NULL,
  workday_start TEXT NOT NULL,
  workday_end   TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS event_types (
  id               TEXT PRIMARY KEY,
  title            TEXT NOT NULL,
  description      TEXT NOT NULL DEFAULT '',
  duration_minutes INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS bookings (
  id               TEXT PRIMARY KEY,
  event_type_id    TEXT NOT NULL,
  event_type_title TEXT NOT NULL,
  start_utc        TEXT NOT NULL,
  end_utc          TEXT NOT NULL,
  guest_name       TEXT NOT NULL,
  guest_email      TEXT NOT NULL,
  guest_notes      TEXT,
  created_at       TEXT NOT NULL
);

-- Проверка пересечений (I1) и список встреч владельца читают брони по времени.
CREATE INDEX IF NOT EXISTS idx_bookings_start ON bookings (start_utc);
`;

/**
 * Владелец календаря. Задания на регистрацию нет, профиль создаётся при
 * инициализации базы и дальше правится только в базе.
 */
export const OWNER_SEED = {
  name: 'Алексей Смирнов',
  bio: 'Продуктовый разработчик. Обсудим задачу, интеграцию или код-ревью — выберите удобный формат и время.',
  avatarUrl: null,
  timeZone: 'Europe/Berlin',
  workdayStart: '09:00:00',
  workdayEnd: '18:00:00',
} as const;

/** Стартовый каталог: разные длительности дают разные сетки при общем календаре. */
export const EVENT_TYPES_SEED = [
  {
    id: 'intro-call',
    title: 'Знакомство',
    description: 'Короткий созвон: рассказать о задаче и понять, чем я могу помочь.',
    durationMinutes: 15,
  },
  {
    id: 'consultation',
    title: 'Консультация',
    description: 'Разбор конкретного вопроса: архитектура, выбор стека, оценка объёма работ.',
    durationMinutes: 30,
  },
  {
    id: 'deep-dive',
    title: 'Глубокий разбор',
    description: 'Час на подробный разбор проекта с обзором кода и планом действий.',
    durationMinutes: 60,
  },
] as const;
