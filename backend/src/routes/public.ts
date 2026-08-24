/**
 * Публичная часть /api/public. Гость работает анонимно и не видит ничего,
 * кроме каталога, сетки слотов и своей собственной брони по ссылке.
 */
import type { FastifyInstance, FastifyPluginAsync } from 'fastify';
import type { BookingCreate, EventType, PublicEventType } from '../api/types.js';
import { arrayOf, schemaRef } from '../contract.js';
import { bookingNotFound, eventTypeNotFound } from '../domain/errors.js';
import { findBooking } from '../repositories/bookings.js';
import { findEventType, listEventTypes } from '../repositories/eventTypes.js';
import { getOwner } from '../repositories/owner.js';
import { buildAvailability, buildDaySlots } from '../services/availability.js';
import { createBooking } from '../services/booking.js';
import { idParams } from './common.js';

interface IdParams {
  id: string;
}

/** Публичная карточка каталога: внутренних полей у типа события пока нет. */
function toPublic(eventType: EventType): PublicEventType {
  return {
    id: eventType.id,
    title: eventType.title,
    description: eventType.description,
    durationMinutes: eventType.durationMinutes,
  };
}

export const publicRoutes: FastifyPluginAsync = async (app) => {
  app.get(
    '/owner',
    { schema: { response: { 200: schemaRef('Owner') } } },
    async () => getOwner(app.db),
  );

  app.get(
    '/event-types',
    { schema: { response: { 200: arrayOf('PublicEventType') } } },
    async () => listEventTypes(app.db).map(toPublic),
  );

  app.get<{ Params: IdParams }>(
    '/event-types/:id',
    {
      schema: {
        params: idParams,
        response: { 200: schemaRef('PublicEventType'), 404: schemaRef('NotFoundError') },
      },
    },
    async (request) => toPublic(requireEventType(app, request.params.id)),
  );

  app.get<{ Params: IdParams }>(
    '/event-types/:id/availability',
    {
      schema: {
        params: idParams,
        response: { 200: schemaRef('AvailabilityCalendar'), 404: schemaRef('NotFoundError') },
      },
    },
    async (request) =>
      buildAvailability(
        app.db,
        getOwner(app.db),
        requireEventType(app, request.params.id),
        app.now(),
      ),
  );

  app.get<{ Params: IdParams; Querystring: { date: string } }>(
    '/event-types/:id/slots',
    {
      schema: {
        params: idParams,
        querystring: {
          type: 'object',
          properties: { date: { type: 'string', format: 'date' } },
          required: ['date'],
        },
        response: {
          200: schemaRef('DaySlots'),
          404: schemaRef('NotFoundError'),
          422: schemaRef('ValidationError'),
        },
      },
    },
    async (request) =>
      buildDaySlots(
        app.db,
        getOwner(app.db),
        requireEventType(app, request.params.id),
        request.query.date,
        app.now(),
      ),
  );

  app.post<{ Body: BookingCreate }>(
    '/bookings',
    {
      schema: {
        body: schemaRef('BookingCreate'),
        response: {
          201: schemaRef('Booking'),
          404: schemaRef('NotFoundError'),
          409: schemaRef('ConflictError'),
          422: schemaRef('ValidationError'),
        },
      },
    },
    async (request, reply) => {
      const booking = createBooking(app.db, getOwner(app.db), request.body, app.now());

      return reply.code(201).send(booking);
    },
  );

  app.get<{ Params: IdParams }>(
    '/bookings/:id',
    {
      schema: {
        params: idParams,
        response: { 200: schemaRef('Booking'), 404: schemaRef('NotFoundError') },
      },
    },
    async (request) => {
      const booking = findBooking(app.db, request.params.id);

      if (booking === undefined) {
        throw bookingNotFound(request.params.id);
      }

      return booking;
    },
  );
};

function requireEventType(app: FastifyInstance, id: string): EventType {
  const eventType = findEventType(app.db, id);

  if (eventType === undefined) {
    throw eventTypeNotFound(id);
  }

  return eventType;
}
