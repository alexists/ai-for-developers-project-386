/**
 * Настройки процесса. Всё, что различается между локальным запуском и Docker,
 * приходит через переменные окружения; значения по умолчанию рассчитаны
 * на запуск из папки backend.
 */
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/** Корень пакета: dist/config.js и src/config.ts лежат на одной глубине. */
const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

function fromEnv(name: string, fallback: string): string {
  const value = process.env[name];
  return value === undefined || value === '' ? fallback : value;
}

/** База в памяти: данные живут до перезапуска процесса. */
export const IN_MEMORY_DB = ':memory:';

/** Относительный путь трактуется от корня пакета, абсолютный — как есть. */
function pathFromEnv(name: string, fallback: string): string {
  const value = fromEnv(name, fallback);

  // :memory: — не путь, а указание SQLite держать базу в памяти.
  return value === IN_MEMORY_DB ? value : resolve(packageRoot, value);
}

export const config = {
  host: fromEnv('HOST', '127.0.0.1'),
  port: Number(fromEnv('PORT', '8080')),

  /** Файл базы SQLite. В Docker подменяется на путь внутри volume. */
  dbPath: pathFromEnv('DB_PATH', 'data/booking.db'),

  /** Контракт — источник схем валидации и сериализации. */
  contractPath: pathFromEnv('CONTRACT_PATH', '../api/openapi/openapi.yaml'),

  /**
   * Собранный фронтенд. Если папки нет, сервер поднимается как чистое API —
   * так он работает в связке с dev-сервером Vite.
   */
  staticDir: pathFromEnv('STATIC_DIR', '../frontend/dist'),

  logLevel: fromEnv('LOG_LEVEL', 'info'),
} as const;
