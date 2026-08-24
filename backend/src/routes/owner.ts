/**
 * Админская часть /api/owner. Авторизации нет: все операции выполняются
 * от имени единственного владельца календаря.
 */
import type { FastifyPluginAsync } from 'fastify';
import type { EventTypeCreate, EventTypeUpdate } from '../api/types.js';
import { arrayOf, schemaRef } from '../contract.js';
import { bookingNotFound, eventTypeAlreadyExists, eventTypeNotFound } from '../domain/errors.js';
import {
  deleteBooking,
  findBooking,
  listBookings,
  type BookingFilter,
} from '../repositories/bookings.js';
import {
  deleteEventType,
  eventTypeExists,
  findEventType,
  insertEventType,
  listEventTypes,
  updateEventType,
} from '../repositories/eventTypes.js';
import { getOwner } from '../repositories/owner.js';
import { idParams } from './common.js';

interface IdParams {
  id: string;
}

export const ownerRoutes: FastifyPluginAsync = async (app) => {
  app.get(
    '/profile',
    { schema: { response: { 200: schemaRef('Owner') } } },
    async () => getOwner(app.db),
  );

  app.get(
    '/event-types',
    { schema: { response: { 200: arrayOf('EventType') } } },
    async () => listEventTypes(app.db),
  );

  app.post<{ Body: EventTypeCreate }>(
    '/event-types',
    {
      schema: {
        body: schemaRef('EventTypeCreate'),
        response: {
          201: schemaRef('EventType'),
          409: schemaRef('ConflictError'),
          422: schemaRef('ValidationError'),
        },
      },
    },
    async (request, reply) => {
      // description и durationMinutes уже подставлены валидатором из default'ов контракта.
      const body = request.body as Required<EventTypeCreate>;

      if (eventTypeExists(app.db, body.id)) {
        throw eventTypeAlreadyExists(body.id);
      }

      return reply.code(201).send(insertEventType(app.db, body));
    },
  );

  app.get<{ Params: IdParams }>(
    '/event-types/:id',
    {
      schema: {
        params: idParams,
        response: { 200: schemaRef('EventType'), 404: schemaRef('NotFoundError') },
      },
    },
    async (request) => {
      const eventType = findEventType(app.db, request.params.id);

      if (eventType === undefined) {
        throw eventTypeNotFound(request.params.id);
      }

      return eventType;
    },
  );

  app.patch<{ Params: IdParams; Body: EventTypeUpdate }>(
    '/event-types/:id',
    {
      schema: {
        params: idParams,
        body: schemaRef('EventTypeUpdate'),
        response: {
          200: schemaRef('EventType'),
          404: schemaRef('NotFoundError'),
          422: schemaRef('ValidationError'),
        },
      },
    },
    async (request) => {
      // Изменение durationMinutes не пересчитывает уже созданные брони:
      // у них свои start/end, сетка меняется только для новых записей.
      const updated = updateEventType(app.db, request.params.id, request.body);

      if (updated === undefined) {
        throw eventTypeNotFound(request.params.id);
      }

      return updated;
    },
  );

  app.delete<{ Params: IdParams }>(
    '/event-types/:id',
    { schema: { params: idParams, response: { 404: schemaRef('NotFoundError') } } },
    async (request, reply) => {
      if (!deleteEventType(app.db, request.params.id)) {
        throw eventTypeNotFound(request.params.id);
      }

      return reply.code(204).send();
    },
  );

  app.get<{ Querystring: BookingFilter }>(
    '/bookings',
    {
      schema: {
        querystring: {
          type: 'object',
          properties: {
            from: { type: 'string', format: 'date-time' },
            to: { type: 'string', format: 'date-time' },
            eventTypeId: { type: 'string' },
          },
        },
        response: { 200: arrayOf('Booking') },
      },
    },
    async (request) => {
      // По умолчанию — предстоящие встречи, как описано в контракте.
      const from = request.query.from ?? app.now().toISOString();

      return listBookings(app.db, { ...request.query, from });
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

  app.delete<{ Params: IdParams }>(
    '/bookings/:id',
    { schema: { params: idParams, response: { 404: schemaRef('NotFoundError') } } },
    async (request, reply) => {
      // Отмена освобождает слот: он снова попадёт в сетку как free.
      if (!deleteBooking(app.db, request.params.id)) {
        throw bookingNotFound(request.params.id);
      }

      return reply.code(204).send();
    },
  );
};
