/**
 * Сборка приложения. Валидацию запросов и сериализацию ответов делает Fastify
 * по схемам из контракта: тело, не проходящее по main.tsp, до обработчика
 * не доходит, а ответ с лишним полем до клиента не уезжает.
 */
import { existsSync } from 'node:fs';
import fastifyStatic from '@fastify/static';
import ajvFormats from 'ajv-formats';
import Fastify, {
  type FastifyError,
  type FastifyInstance,
  type FastifyServerOptions,
} from 'fastify';
import { contractSchema } from './contract.js';
import type { Database } from './db/database.js';
import { ApiError } from './domain/errors.js';
import { ownerRoutes } from './routes/owner.js';
import { publicRoutes } from './routes/public.js';

declare module 'fastify' {
  interface FastifyInstance {
    db: Database;
    /** Текущий момент. Вынесен в декоратор, чтобы тесты могли им управлять. */
    now(): Date;
  }
}

/**
 * ajv-formats — пакет CommonJS: TypeScript видит в default-импорте пространство
 * имён, хотя в рантайме там сама функция-плагин. Приводим тип явно.
 */
type AjvPlugin = NonNullable<NonNullable<FastifyServerOptions['ajv']>['plugins']>[number];
const addFormats = ajvFormats as unknown as AjvPlugin;

export interface AppOptions {
  db: Database;
  /** Папка со сборкой фронтенда. Если не задана или её нет — сервер работает как чистое API. */
  staticDir?: string;
  now?: () => Date;
  logger?: FastifyServerOptions['logger'];
}

export async function buildApp(options: AppOptions): Promise<FastifyInstance> {
  const serverOptions: FastifyServerOptions = {
    logger: options.logger ?? false,
    ajv: {
      customOptions: {
        // strict: false — в схемах OpenAPI есть ключи вроде format: int32,
        // которых ajv не знает; они не должны ронять компиляцию.
        strict: false,
        allErrors: true,
      },
      // Форматы контракта — date, date-time, time, email, uri — проверяет ajv-formats.
      plugins: [addFormats],
    },
  };

  const app = Fastify(serverOptions);

  app.decorate('db', options.db);
  app.decorate('now', options.now ?? (() => new Date()));

  app.addSchema(contractSchema);

  app.setErrorHandler((error: FastifyError, request, reply) => {
    if (error instanceof ApiError) {
      return reply.code(error.statusCode).send(error.toBody());
    }

    // Ошибки валидации Fastify отдаёт как 400; контракт требует 422 invalid_payload.
    if (error.validation !== undefined) {
      const details = error.validation.map((issue) =>
        `${issue.instancePath || issue.params['missingProperty'] || ''} ${issue.message ?? ''}`.trim(),
      );

      return reply.code(422).send({
        code: 'invalid_payload',
        message: 'Запрос не соответствует контракту',
        details,
      });
    }

    // Битый JSON, неверный Content-Type и прочие claims клиента о теле запроса.
    // Для контракта это тот же случай: запрос не разобран, ответ — 422.
    if (error.statusCode !== undefined && error.statusCode >= 400 && error.statusCode < 500) {
      return reply.code(422).send({
        code: 'invalid_payload',
        message: 'Запрос не удалось разобрать',
        details: [error.message],
      });
    }

    request.log.error(error);

    return reply
      .code(500)
      .send({ code: 'internal_error', message: 'Внутренняя ошибка сервера' });
  });

  await app.register(ownerRoutes, { prefix: '/api/owner' });
  await app.register(publicRoutes, { prefix: '/api/public' });

  if (options.staticDir !== undefined && existsSync(options.staticDir)) {
    await app.register(fastifyStatic, { root: options.staticDir });

    // SPA: маршруты вида /book/intro-call обслуживает роутер на клиенте,
    // поэтому всё, что не /api и не файл, отдаётся как index.html.
    app.setNotFoundHandler((request, reply) => {
      if (request.method === 'GET' && !request.url.startsWith('/api/')) {
        return reply.sendFile('index.html');
      }

      return reply.code(404).send({ code: 'not_found', message: 'Ресурс не найден' });
    });
  }

  return app;
}
