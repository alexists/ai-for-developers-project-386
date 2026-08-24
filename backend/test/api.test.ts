/**
 * Тесты API по контракту: каждый эндпоинт и каждый код ошибки из main.tsp.
 * Приложение поднимается на базе в памяти, «сейчас» зафиксировано.
 */
import assert from 'node:assert/strict';
import { after, describe, it } from 'node:test';
import type { FastifyInstance } from 'fastify';
import type {
  AvailabilityCalendar,
  Booking,
  DaySlots,
  EventType,
  Owner,
  PublicEventType,
} from '../src/api/types.js';
import { createDb, createTestApp, guest, NOW, TODAY, TOMORROW, workdayStartUtc } from './helpers.js';

const app: FastifyInstance = await createTestApp();

after(async () => {
  await app.close();
});

/** Бронь на слот сетки: короткая обёртка, чтобы тесты читались по существу. */
async function book(eventTypeId: string, start: string) {
  return app.inject({
    method: 'POST',
    url: '/api/public/bookings',
    payload: { eventTypeId, start, guest },
  });
}

describe('публичная часть: каталог', () => {
  it('отдаёт профиль владельца', async () => {
    const response = await app.inject('/api/public/owner');
    const owner = response.json<Owner>();

    assert.equal(response.statusCode, 200);
    assert.equal(owner.timeZone, 'Europe/Berlin');
    assert.equal(owner.workdayStart, '09:00:00');
  });

  it('отдаёт карточки типов событий', async () => {
    const response = await app.inject('/api/public/event-types');
    const eventTypes = response.json<PublicEventType[]>();

    assert.equal(response.statusCode, 200);
    assert.deepEqual(
      eventTypes.map((eventType) => eventType.durationMinutes),
      [15, 30, 60],
    );
  });

  it('на неизвестный тип события отвечает 404 event_type_not_found', async () => {
    const response = await app.inject('/api/public/event-types/no-such-type');

    assert.equal(response.statusCode, 404);
    assert.equal(response.json().code, 'event_type_not_found');
  });
});

describe('доступность и сетка слотов', () => {
  it('календарь покрывает окно записи целиком', async () => {
    const response = await app.inject('/api/public/event-types/consultation/availability');
    const calendar = response.json<AvailabilityCalendar>();

    assert.equal(response.statusCode, 200);
    assert.equal(calendar.windowStart, TODAY);
    assert.equal(calendar.windowEnd, '2026-09-21');
    assert.equal(calendar.days.length, 15);
    assert.deepEqual(calendar.days[0], {
      date: TODAY,
      freeSlots: 18,
      totalSlots: 18,
      isBookable: true,
    });
  });

  it('сетка дня отдаётся в шаге типа события', async () => {
    const response = await app.inject(
      `/api/public/event-types/intro-call/slots?date=${TOMORROW}`,
    );
    const day = response.json<DaySlots>();

    assert.equal(response.statusCode, 200);
    assert.equal(day.slots.length, 36);
    assert.equal(day.slots[0]?.start, workdayStartUtc(TOMORROW));
    assert.equal(day.timeZone, 'Europe/Berlin');
  });

  it('день вне окна записи отдаёт пустую сетку', async () => {
    const response = await app.inject(
      '/api/public/event-types/consultation/slots?date=2026-10-01',
    );

    assert.equal(response.statusCode, 200);
    assert.deepEqual(response.json<DaySlots>().slots, []);
  });

  it('дата не в формате контракта — 422 invalid_payload', async () => {
    const response = await app.inject('/api/public/event-types/consultation/slots?date=08.09.2026');

    assert.equal(response.statusCode, 422);
    assert.equal(response.json().code, 'invalid_payload');
    assert.ok(response.json().details.length > 0);
  });
});

describe('создание брони', () => {
  it('считает end сам из длительности типа события (I3)', async () => {
    const response = await book('consultation', workdayStartUtc(TOMORROW));
    const booking = response.json<Booking>();

    assert.equal(response.statusCode, 201);
    assert.equal(booking.start, workdayStartUtc(TOMORROW));
    assert.equal(booking.end, `${TOMORROW}T07:30:00Z`);
    assert.equal(booking.eventTypeTitle, 'Консультация');
    assert.equal(booking.guest.notes, guest.notes);
  });

  it('бронь другого типа события гасит перекрытые слоты (I1)', async () => {
    const response = await app.inject(
      `/api/public/event-types/intro-call/slots?date=${TOMORROW}`,
    );
    const day = response.json<DaySlots>();

    // Получасовая консультация 09:00–09:30 закрывает два пятнадцатиминутных слота.
    assert.deepEqual(
      day.slots.slice(0, 3).map((slot) => slot.status),
      ['busy', 'busy', 'free'],
    );
  });

  it('занятый слот не раскрывает гостя (I5)', async () => {
    const response = await app.inject(
      `/api/public/event-types/intro-call/slots?date=${TOMORROW}`,
    );

    assert.deepEqual(Object.keys(response.json<DaySlots>().slots[0] ?? {}), [
      'start',
      'end',
      'status',
    ]);
    assert.equal(response.payload.includes(guest.email), false);
    assert.equal(response.payload.includes(guest.name), false);
  });

  it('на занятое время отвечает 409 slot_taken (I1)', async () => {
    const response = await book('intro-call', workdayStartUtc(TOMORROW));

    assert.equal(response.statusCode, 409);
    assert.equal(response.json().code, 'slot_taken');
  });

  it('время не на сетке типа события — 422 slot_not_on_grid (I4)', async () => {
    // 09:15 — узел сетки пятнадцатиминутного типа, но не получасового.
    const response = await book('consultation', `${TOMORROW}T07:15:00Z`);

    assert.equal(response.statusCode, 422);
    assert.equal(response.json().code, 'slot_not_on_grid');
  });

  it('время за границей окна — 422 slot_outside_window (I2)', async () => {
    const response = await book('consultation', '2026-10-01T07:00:00Z');

    assert.equal(response.statusCode, 422);
    assert.equal(response.json().code, 'slot_outside_window');
  });

  it('время в прошлом — 422 slot_outside_window (I2)', async () => {
    const response = await book('consultation', '2026-09-06T07:00:00Z');

    assert.equal(response.statusCode, 422);
    assert.equal(response.json().code, 'slot_outside_window');
  });

  it('несуществующий тип события — 404 event_type_not_found', async () => {
    const response = await book('no-such-type', workdayStartUtc(TOMORROW));

    assert.equal(response.statusCode, 404);
    assert.equal(response.json().code, 'event_type_not_found');
  });

  it('невалидные данные гостя — 422 invalid_payload', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/public/bookings',
      payload: {
        eventTypeId: 'consultation',
        start: `${TOMORROW}T08:00:00Z`,
        guest: { name: '', email: 'не-почта' },
      },
    });

    assert.equal(response.statusCode, 422);
    assert.equal(response.json().code, 'invalid_payload');
    assert.equal(response.json().details.length, 2);
  });

  it('бронь открывается по ссылке подтверждения', async () => {
    const created = (await book('deep-dive', `${TOMORROW}T10:00:00Z`)).json<Booking>();
    const response = await app.inject(`/api/public/bookings/${created.id}`);

    assert.equal(response.statusCode, 200);
    assert.deepEqual(response.json<Booking>(), created);
  });

  it('несуществующая бронь — 404 booking_not_found', async () => {
    const response = await app.inject('/api/public/bookings/no-such-booking');

    assert.equal(response.statusCode, 404);
    assert.equal(response.json().code, 'booking_not_found');
  });
});

describe('админская часть: типы событий', () => {
  it('создаёт тип события, подставляя значения по умолчанию из контракта', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/owner/event-types',
      payload: { id: 'coffee-chat', title: 'Кофе' },
    });

    assert.equal(response.statusCode, 201);
    assert.deepEqual(response.json<EventType>(), {
      id: 'coffee-chat',
      title: 'Кофе',
      description: '',
      durationMinutes: 30,
    });
  });

  it('повторный id — 409 event_type_already_exists', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/owner/event-types',
      payload: { id: 'coffee-chat', title: 'Ещё кофе' },
    });

    assert.equal(response.statusCode, 409);
    assert.equal(response.json().code, 'event_type_already_exists');
  });

  it('id не по шаблону слага — 422 invalid_payload', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/owner/event-types',
      payload: { id: 'Кофе Брейк', title: 'Кофе' },
    });

    assert.equal(response.statusCode, 422);
    assert.equal(response.json().code, 'invalid_payload');
  });

  it('длительность вне границ контракта — 422 invalid_payload', async () => {
    const response = await app.inject({
      method: 'PATCH',
      url: '/api/owner/event-types/coffee-chat',
      payload: { durationMinutes: 1 },
    });

    assert.equal(response.statusCode, 422);
    assert.equal(response.json().code, 'invalid_payload');
  });

  it('обновляет только переданные поля', async () => {
    const response = await app.inject({
      method: 'PATCH',
      url: '/api/owner/event-types/coffee-chat',
      payload: { durationMinutes: 20 },
    });

    assert.equal(response.statusCode, 200);
    assert.deepEqual(response.json<EventType>(), {
      id: 'coffee-chat',
      title: 'Кофе',
      description: '',
      durationMinutes: 20,
    });
  });

  it('удаляет тип события', async () => {
    const deleted = await app.inject({ method: 'DELETE', url: '/api/owner/event-types/coffee-chat' });
    const missing = await app.inject('/api/owner/event-types/coffee-chat');

    assert.equal(deleted.statusCode, 204);
    assert.equal(missing.statusCode, 404);
  });

  it('удаление несуществующего типа — 404', async () => {
    const response = await app.inject({ method: 'DELETE', url: '/api/owner/event-types/ghost' });

    assert.equal(response.statusCode, 404);
    assert.equal(response.json().code, 'event_type_not_found');
  });
});

describe('админская часть: встречи', () => {
  it('отдаёт предстоящие встречи по возрастанию start', async () => {
    const response = await app.inject('/api/owner/bookings');
    const bookings = response.json<Booking[]>();

    assert.equal(response.statusCode, 200);
    assert.deepEqual(
      bookings.map((booking) => booking.start),
      [`${TOMORROW}T07:00:00Z`, `${TOMORROW}T10:00:00Z`],
    );
  });

  it('фильтрует по типу события и датам', async () => {
    const byType = await app.inject('/api/owner/bookings?eventTypeId=deep-dive');
    const byRange = await app.inject(
      `/api/owner/bookings?from=${TOMORROW}T09:00:00Z&to=${TOMORROW}T23:00:00Z`,
    );

    assert.equal(byType.json<Booking[]>().length, 1);
    assert.equal(byRange.json<Booking[]>()[0]?.eventTypeId, 'deep-dive');
  });

  it('сохраняет название типа события после его удаления', async () => {
    await app.inject({ method: 'DELETE', url: '/api/owner/event-types/deep-dive' });

    const response = await app.inject('/api/owner/bookings?eventTypeId=deep-dive');

    assert.equal(response.json<Booking[]>()[0]?.eventTypeTitle, 'Глубокий разбор');
  });

  it('отмена встречи освобождает слот', async () => {
    const bookings = (await app.inject('/api/owner/bookings')).json<Booking[]>();
    const target = bookings.find((booking) => booking.eventTypeId === 'consultation');

    const cancelled = await app.inject({
      method: 'DELETE',
      url: `/api/owner/bookings/${target?.id}`,
    });
    const day = (
      await app.inject(`/api/public/event-types/consultation/slots?date=${TOMORROW}`)
    ).json<DaySlots>();

    assert.equal(cancelled.statusCode, 204);
    assert.equal(day.slots[0]?.status, 'free');
  });

  it('прошедшая встреча не попадает в список по умолчанию', async () => {
    // Та же база, но «сейчас» сдвинуто на три дня вперёд: вчерашняя встреча
    // выпадает из выборки по умолчанию и возвращается только с явным from.
    const db = createDb();
    const present = await createTestApp(NOW, db);
    const future = await createTestApp(new Date('2026-09-11T06:00:00Z'), db);

    try {
      const created = await present.inject({
        method: 'POST',
        url: '/api/public/bookings',
        payload: { eventTypeId: 'consultation', start: `${TOMORROW}T07:00:00Z`, guest },
      });

      assert.equal(created.statusCode, 201);
      assert.deepEqual((await future.inject('/api/owner/bookings')).json<Booking[]>(), []);
      assert.equal(
        (await future.inject(`/api/owner/bookings?from=${TODAY}T00:00:00Z`)).json<Booking[]>()
          .length,
        1,
      );
    } finally {
      await present.close();
      await future.close();
    }
  });
});
