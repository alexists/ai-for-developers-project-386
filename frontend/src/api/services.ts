/**
 * Обёртки над эндпоинтами контракта — по одной функции на операцию.
 * Страницы не собирают URL и не знают о деталях транспорта.
 */
import { api, unwrap, unwrapEmpty } from './client';
import type {
  AvailabilityCalendar,
  Booking,
  BookingCreate,
  DaySlots,
  EventType,
  EventTypeCreate,
  EventTypeUpdate,
  Owner,
  PublicEventType,
} from './types';

// --- Публичная часть: гость -------------------------------------------------

export const publicApi = {
  /** GET /api/public/owner — шапка каталога и страницы бронирования. */
  getOwner: (): Promise<Owner> => unwrap(api.GET('/api/public/owner')),

  /** GET /api/public/event-types — карточки «Выберите тип события». */
  listEventTypes: (): Promise<PublicEventType[]> => unwrap(api.GET('/api/public/event-types')),

  /** GET /api/public/event-types/{id} */
  getEventType: (id: string): Promise<PublicEventType> =>
    unwrap(api.GET('/api/public/event-types/{id}', { params: { path: { id } } })),

  /** GET /api/public/event-types/{id}/availability — дни окна записи. */
  getAvailability: (id: string): Promise<AvailabilityCalendar> =>
    unwrap(api.GET('/api/public/event-types/{id}/availability', { params: { path: { id } } })),

  /** GET /api/public/event-types/{id}/slots?date= — сетка слотов дня. */
  getDaySlots: (id: string, date: string): Promise<DaySlots> =>
    unwrap(api.GET('/api/public/event-types/{id}/slots', { params: { path: { id }, query: { date } } })),

  /** POST /api/public/bookings — создать бронирование. end считает сервер. */
  createBooking: (body: BookingCreate): Promise<Booking> =>
    unwrap(api.POST('/api/public/bookings', { body })),

  /** GET /api/public/bookings/{id} — экран подтверждения по ссылке. */
  getBooking: (id: string): Promise<Booking> =>
    unwrap(api.GET('/api/public/bookings/{id}', { params: { path: { id } } })),
};

// --- Админская часть: владелец календаря ------------------------------------

export const ownerApi = {
  /** GET /api/owner/profile */
  getProfile: (): Promise<Owner> => unwrap(api.GET('/api/owner/profile')),

  /** GET /api/owner/event-types */
  listEventTypes: (): Promise<EventType[]> => unwrap(api.GET('/api/owner/event-types')),

  /** POST /api/owner/event-types — id задаёт владелец, он должен быть уникален. */
  createEventType: (body: EventTypeCreate): Promise<EventType> =>
    unwrap(api.POST('/api/owner/event-types', { body })),

  /** GET /api/owner/event-types/{id} */
  getEventType: (id: string): Promise<EventType> =>
    unwrap(api.GET('/api/owner/event-types/{id}', { params: { path: { id } } })),

  /** PATCH /api/owner/event-types/{id} — частичное обновление, id неизменяем. */
  updateEventType: (id: string, body: EventTypeUpdate): Promise<EventType> =>
    unwrap(api.PATCH('/api/owner/event-types/{id}', { params: { path: { id } }, body })),

  /** DELETE /api/owner/event-types/{id} — уже созданные брони не удаляются. */
  deleteEventType: (id: string): Promise<void> =>
    unwrapEmpty(api.DELETE('/api/owner/event-types/{id}', { params: { path: { id } } })),

  /** GET /api/owner/bookings — единый список встреч по всем типам событий. */
  listBookings: (query?: { from?: string; to?: string; eventTypeId?: string }): Promise<Booking[]> =>
    unwrap(api.GET('/api/owner/bookings', { params: { query } })),

  /** GET /api/owner/bookings/{id} */
  getBooking: (id: string): Promise<Booking> =>
    unwrap(api.GET('/api/owner/bookings/{id}', { params: { path: { id } } })),

  /** DELETE /api/owner/bookings/{id} — отмена освобождает слот. */
  cancelBooking: (id: string): Promise<void> =>
    unwrapEmpty(api.DELETE('/api/owner/bookings/{id}', { params: { path: { id } } })),
};
