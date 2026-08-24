/**
 * Ошибки контракта. Коды и статусы взяты из NotFoundError / ValidationError /
 * ConflictError в main.tsp — других вариантов бэкенд не отдаёт.
 */
import type { ConflictCode, NotFoundCode, ValidationCode } from '../api/types.js';

export class ApiError extends Error {
  readonly statusCode: number;
  readonly code: NotFoundCode | ValidationCode | ConflictCode;
  readonly details?: string[];

  constructor(
    statusCode: number,
    code: NotFoundCode | ValidationCode | ConflictCode,
    message: string,
    details?: string[],
  ) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }

  /** Тело ответа ровно в форме соответствующей модели ошибки контракта. */
  toBody(): { code: string; message: string; details?: string[] } {
    return this.details === undefined
      ? { code: this.code, message: this.message }
      : { code: this.code, message: this.message, details: this.details };
  }
}

export const eventTypeNotFound = (id: string): ApiError =>
  new ApiError(404, 'event_type_not_found', `Тип события "${id}" не найден`);

export const bookingNotFound = (id: string): ApiError =>
  new ApiError(404, 'booking_not_found', `Бронирование "${id}" не найдено`);

export const invalidPayload = (message: string, details?: string[]): ApiError =>
  new ApiError(422, 'invalid_payload', message, details);

export const slotNotOnGrid = (message: string): ApiError =>
  new ApiError(422, 'slot_not_on_grid', message);

export const slotOutsideWindow = (message: string): ApiError =>
  new ApiError(422, 'slot_outside_window', message);

export const slotTaken = (): ApiError =>
  new ApiError(409, 'slot_taken', 'Это время уже занято другим бронированием');

export const eventTypeAlreadyExists = (id: string): ApiError =>
  new ApiError(409, 'event_type_already_exists', `Тип события "${id}" уже существует`);
