/**
 * Доменные типы фронтенда — псевдонимы схем из контракта.
 * Ничего не описывается руками: единственный источник — schema.d.ts,
 * который генерируется из api/openapi/openapi.yaml (npm run gen:api).
 */
import type { components } from './schema';

type Schemas = components['schemas'];

export type Owner = Schemas['Owner'];
export type EventType = Schemas['EventType'];
export type EventTypeCreate = Schemas['EventTypeCreate'];
export type EventTypeUpdate = Schemas['EventTypeUpdate'];
export type PublicEventType = Schemas['PublicEventType'];
export type Slot = Schemas['Slot'];
export type SlotStatus = Schemas['SlotStatus'];
export type DaySlots = Schemas['DaySlots'];
export type DayAvailability = Schemas['DayAvailability'];
export type AvailabilityCalendar = Schemas['AvailabilityCalendar'];
export type Guest = Schemas['Guest'];
export type Booking = Schemas['Booking'];
export type BookingCreate = Schemas['BookingCreate'];

export type NotFoundError = Schemas['NotFoundError'];
export type ValidationError = Schemas['ValidationError'];
export type ConflictError = Schemas['ConflictError'];

/** Любая ошибка, описанная в контракте. */
export type ApiErrorBody = NotFoundError | ValidationError | ConflictError;

/** Коды ошибок из контракта — полный перечень. */
export type ApiErrorCode = ApiErrorBody['code'];
