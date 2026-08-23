/**
 * Единственная точка входа в API. Клиент типизирован сгенерированными
 * из контракта путями: несуществующий эндпоинт или неверное тело запроса
 * не пройдут проверку типов.
 */
import createClient from 'openapi-fetch';
import type { paths } from './schema';
import type { ApiErrorBody, ApiErrorCode } from './types';

/**
 * Пусто по умолчанию — запросы идут на тот же origin по /api,
 * а дальше их разбирает прокси dev-сервера или nginx.
 */
const baseUrl = import.meta.env.VITE_API_BASE_URL ?? '';

export const api = createClient<paths>({ baseUrl });

/** Ошибка ответа API. Код берётся из контракта, если сервер его прислал. */
export class ApiError extends Error {
  readonly status: number;
  readonly code?: ApiErrorCode;
  readonly details?: string[];

  constructor(status: number, body?: Partial<ApiErrorBody> & { details?: string[] }) {
    super(body?.message || `Ошибка запроса (${status})`);
    this.name = 'ApiError';
    this.status = status;
    this.code = body?.code;
    this.details = body?.details;
  }
}

/**
 * Разворачивает ответ openapi-fetch: возвращает данные или бросает ApiError.
 * Позволяет писать вызовы линейно, а ошибки ловить в одном месте.
 */
export async function unwrap<T>(
  request: Promise<{ data?: T; error?: unknown; response: Response }>,
): Promise<T> {
  const { data, error, response } = await request;

  if (error !== undefined || !response.ok) {
    throw new ApiError(response.status, error as Partial<ApiErrorBody> | undefined);
  }

  return data as T;
}

/** Ответ 204 без тела: openapi-fetch отдаёт data === undefined, это не ошибка. */
export async function unwrapEmpty(
  request: Promise<{ error?: unknown; response: Response }>,
): Promise<void> {
  const { error, response } = await request;

  if (!response.ok) {
    throw new ApiError(response.status, error as Partial<ApiErrorBody> | undefined);
  }
}
