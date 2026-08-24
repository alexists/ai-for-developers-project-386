/** Точка входа: открыть базу, поднять сервер, аккуратно закрыться по сигналу. */
import { buildApp } from './app.js';
import { config } from './config.js';
import { openDatabase } from './db/database.js';

const db = openDatabase(config.dbPath);

const app = await buildApp({
  db,
  staticDir: config.staticDir,
  logger: { level: config.logLevel },
});

async function shutdown(signal: string): Promise<void> {
  app.log.info(`Получен ${signal}, останавливаюсь`);

  await app.close();
  db.close();

  process.exit(0);
}

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, () => {
    void shutdown(signal);
  });
}

try {
  await app.listen({ host: config.host, port: config.port });
  app.log.info(`База: ${config.dbPath}`);
  app.log.info(`Контракт: ${config.contractPath}`);
} catch (error) {
  app.log.error(error);
  process.exit(1);
}
