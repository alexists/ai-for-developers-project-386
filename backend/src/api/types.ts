/**
 * Доменные типы бэкенда — псевдонимы схем из контракта.
 * Руками они не пишутся: `npm run gen:api` пересобирает schema.d.ts из
 * api/openapi/openapi.yaml, и любое расхождение с контрактом ломает сборку.
 */
import type { components } from './schema.js';

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

export type NotFoundCode = Schemas['NotFoundError']['code'];
export type ValidationCode = Schemas['ValidationError']['code'];
export type ConflictCode = Schemas['ConflictError']['code'];
