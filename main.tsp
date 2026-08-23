import "@typespec/http";
import "@typespec/openapi";

using TypeSpec.Http;
using TypeSpec.OpenAPI;

/**
 * «Запись на звонок» — упрощённый сервис бронирования встреч по мотивам Cal.com.
 *
 * Роли:
 *  - Владелец календаря: один заранее заданный профиль, без регистрации и входа.
 *    Эндпоинты /api/owner — админская часть, работают от его имени.
 *  - Гость: без аккаунта, работает только с /api/public.
 *
 * Инварианты (обязательны для бэкенда):
 *  I1. Два бронирования не могут пересекаться по времени, даже если относятся
 *      к разным типам событий. Календарь у владельца один.
 *  I2. Окно записи — 14 дней, начиная с текущего момента (BOOKING_WINDOW_DAYS).
 *      Слот в прошлом или за границей окна недоступен для записи.
 *  I3. Длительность бронирования всегда равна durationMinutes своего типа события.
 *      Гость передаёт только start, end вычисляет сервер.
 *  I4. Сетка слотов строится с шагом, равным durationMinutes типа события,
 *      от начала рабочего дня владельца. Поэтому у типа «15 минут» и типа
 *      «30 минут» сетки разные, а занятость — общая (см. I1).
 *  I5. Слот со статусом busy виден гостю, но не раскрывает, кто и на какой
 *      тип события его занял.
 *
 * Все моменты времени в API — UTC (ISO 8601). Даты календаря (plainDate) и
 * рабочие часы (plainTime) трактуются в таймзоне владельца.
 */
@service(#{ title: "Simple Booking API" })
@info(#{ version: "1.0.0" })
namespace SimpleBooking;

// ---------------------------------------------------------------------------
// Константы контракта
// ---------------------------------------------------------------------------

/** Глубина окна записи в днях от текущего момента. */
const BOOKING_WINDOW_DAYS = 14;

/** Длительность типа события по умолчанию. */
const DEFAULT_DURATION_MINUTES = 30;

// ---------------------------------------------------------------------------
// Доменные модели
// ---------------------------------------------------------------------------

/** Профиль владельца календаря. Единственный, создаётся при инициализации. */
model Owner {
  /** Отображаемое имя в шапке страницы бронирования. */
  name: string;

  /** Короткое описание/приветствие для гостя. */
  bio?: string;

  /** URL аватара. Если пусто — фронтенд рисует плейсхолдер. */
  avatarUrl?: url;

  /** Таймзона владельца в формате IANA, например "Europe/Berlin". */
  timeZone: string;

  /** Начало рабочего дня в таймзоне владельца. */
  workdayStart: plainTime;

  /** Конец рабочего дня в таймзоне владельца. */
  workdayEnd: plainTime;
}

/** Тип события — шаблон встречи, которую можно забронировать. */
model EventType {
  /** Человекочитаемый идентификатор-слаг, задаёт владелец. */
  @pattern("^[a-z0-9]+(-[a-z0-9]+)*$")
  @maxLength(64)
  id: string;

  @minLength(1)
  @maxLength(120)
  title: string;

  @maxLength(2000)
  description: string;

  /** Длительность встречи в минутах. Она же — шаг сетки слотов. */
  @minValue(5)
  @maxValue(480)
  durationMinutes: int32;
}

/** Данные для создания типа события. */
model EventTypeCreate {
  @pattern("^[a-z0-9]+(-[a-z0-9]+)*$")
  @maxLength(64)
  id: string;

  @minLength(1)
  @maxLength(120)
  title: string;

  @maxLength(2000)
  description?: string = "";

  @minValue(5)
  @maxValue(480)
  durationMinutes?: int32 = DEFAULT_DURATION_MINUTES;
}

/** Частичное обновление типа события. id неизменяем. */
model EventTypeUpdate {
  @minLength(1)
  @maxLength(120)
  title?: string;

  @maxLength(2000)
  description?: string;

  @minValue(5)
  @maxValue(480)
  durationMinutes?: int32;
}

/** Публичное представление типа события: карточка в каталоге. */
model PublicEventType {
  id: string;
  title: string;
  description: string;
  durationMinutes: int32;
}

/** Статус слота в сетке. */
enum SlotStatus {
  /** Свободен, доступен для бронирования. */
  free: "free",

  /** Пересекается с существующим бронированием любого типа события. */
  busy: "busy",
}

/** Интервал сетки конкретного дня. */
model Slot {
  /** Начало слота, UTC. */
  start: utcDateTime;

  /** Конец слота, UTC. start + durationMinutes типа события. */
  end: utcDateTime;

  status: SlotStatus;
}

/**
 * Сетка слотов за один день — панель «Статус слотов».
 * Возвращаются и свободные, и занятые слоты, чтобы гость видел загруженность дня.
 */
model DaySlots {
  eventTypeId: string;

  /** Запрошенная дата в таймзоне владельца. */
  date: plainDate;

  /** Таймзона, в которой фронтенд форматирует время. */
  timeZone: string;

  /** Все слоты дня по возрастанию start. Пустой массив — выходной или день вне окна. */
  slots: Slot[];
}

/** Сводка по одному дню месяца — для подписей вида «36 св.» в календаре. */
model DayAvailability {
  date: plainDate;

  /** Сколько слотов дня свободно. */
  freeSlots: int32;

  /** Сколько слотов в сетке дня всего. */
  totalSlots: int32;

  /** false, если день вне окна записи или свободных слотов нет —
   *  фронтенд делает такой день некликабельным. */
  isBookable: boolean;
}

/** Календарь доступности на окно записи — данные для месячной сетки. */
model AvailabilityCalendar {
  eventTypeId: string;
  timeZone: string;

  /** Первый день окна записи (сегодня в таймзоне владельца). */
  windowStart: plainDate;

  /** Последний день окна: windowStart + 14 дней. */
  windowEnd: plainDate;

  /** Дни окна по возрастанию. Дни вне окна в ответ не попадают. */
  days: DayAvailability[];
}

/** Контактные данные гостя. */
model Guest {
  @minLength(1)
  @maxLength(120)
  name: string;

  @format("email")
  email: string;

  /** Дополнительные заметки к встрече. */
  @maxLength(1000)
  notes?: string;
}

/** Созданное бронирование. */
model Booking {
  id: string;
  eventTypeId: string;

  /** Название типа события на момент бронирования — чтобы список встреч
   *  владельца читался без дополнительных запросов и не ломался,
   *  если тип события переименовали или удалили. */
  eventTypeTitle: string;

  start: utcDateTime;
  end: utcDateTime;
  guest: Guest;
  createdAt: utcDateTime;
}

/** Запрос на бронирование. end не передаётся: выводится из типа события. */
model BookingCreate {
  eventTypeId: string;

  /** Начало выбранного слота, UTC. Должно совпадать со слотом сетки в статусе free. */
  start: utcDateTime;

  guest: Guest;
}

// ---------------------------------------------------------------------------
// Ошибки
// ---------------------------------------------------------------------------

@error
model NotFoundError {
  @statusCode statusCode: 404;
  code: "event_type_not_found" | "booking_not_found";
  message: string;
}

@error
model ValidationError {
  @statusCode statusCode: 422;

  code:
    | "invalid_payload"
    /** start не совпадает с сеткой слотов или слот не целиком в рабочих часах. */
    | "slot_not_on_grid"
    /** Слот в прошлом или дальше, чем на 14 дней вперёд. */
    | "slot_outside_window";

  message: string;
  details?: string[];
}

@error
model ConflictError {
  @statusCode statusCode: 409;

  code:
    /** Время занято другим бронированием, в том числе другого типа события. */
    | "slot_taken"
    /** Тип события с таким id уже существует. */
    | "event_type_already_exists";

  message: string;
}

// ---------------------------------------------------------------------------
// Ответы со статусом
// ---------------------------------------------------------------------------

model EventTypeCreated {
  @statusCode statusCode: 201;
  @body eventType: EventType;
}

model BookingCreated {
  @statusCode statusCode: 201;
  @body booking: Booking;
}

model Deleted {
  @statusCode statusCode: 204;
}

// ---------------------------------------------------------------------------
// Админская часть: владелец календаря
// ---------------------------------------------------------------------------

@route("/api/owner")
@tag("Owner")
namespace OwnerApi {
  @route("/profile")
  interface OwnerProfile {
    /** Профиль владельца, используемый админкой по умолчанию. */
    @get
    get(): Owner;
  }

  @route("/event-types")
  interface OwnerEventTypes {
    /** Все типы событий владельца. */
    @get
    list(): EventType[];

    /** Создать тип события. id задаёт владелец, он должен быть уникальным. */
    @post
    create(@body body: EventTypeCreate): EventTypeCreated | ConflictError | ValidationError;

    @get
    @route("{id}")
    get(@path id: string): EventType | NotFoundError;

    /** Изменение durationMinutes не пересчитывает уже созданные бронирования. */
    @patch
    @route("{id}")
    update(@path id: string, @body body: EventTypeUpdate): EventType | NotFoundError | ValidationError;

    /** Удаление типа события не удаляет уже созданные бронирования:
     *  они остаются в списке встреч с сохранённым eventTypeTitle. */
    @delete
    @route("{id}")
    delete(@path id: string): Deleted | NotFoundError;
  }

  @route("/bookings")
  interface OwnerBookings {
    /**
     * Страница предстоящих встреч: единый список бронирований по всем типам
     * событий, отсортированный по start по возрастанию.
     */
    @get
    list(
      /** Нижняя граница выборки, UTC. По умолчанию — текущий момент. */
      @query from?: utcDateTime,

      /** Верхняя граница выборки, UTC. По умолчанию — без ограничения. */
      @query to?: utcDateTime,

      /** Фильтр по типу события. По умолчанию — все типы. */
      @query eventTypeId?: string,
    ): Booking[];

    @get
    @route("{id}")
    get(@path id: string): Booking | NotFoundError;

    /** Отмена встречи владельцем освобождает слот. */
    @delete
    @route("{id}")
    cancel(@path id: string): Deleted | NotFoundError;
  }
}

// ---------------------------------------------------------------------------
// Публичная часть: гость
// ---------------------------------------------------------------------------

@route("/api/public")
@tag("Public")
namespace PublicApi {
  @route("/owner")
  interface PublicOwner {
    /** Публичный профиль владельца для шапки каталога и страницы бронирования. */
    @get
    get(): Owner;
  }

  @route("/event-types")
  interface PublicEventTypes {
    /** Каталог: карточки «Выберите тип события». */
    @get
    list(): PublicEventType[];

    @get
    @route("{id}")
    get(@path id: string): PublicEventType | NotFoundError;

    /**
     * Доступность по дням на всё окно записи — данные для месячной сетки
     * календаря с подписями «сколько свободно».
     */
    @get
    @route("{id}/availability")
    availability(@path id: string): AvailabilityCalendar | NotFoundError;

    /**
     * Сетка слотов конкретного дня со статусами free/busy —
     * панель «Статус слотов» справа от календаря.
     */
    @get
    @route("{id}/slots")
    slots(
      @path id: string,

      /** Дата в таймзоне владельца. Обязательна: слоты запрашиваются по дню. */
      @query date: plainDate,
    ): DaySlots | NotFoundError | ValidationError;
  }

  @route("/bookings")
  interface PublicBookings {
    /**
     * Создать бронирование на выбранный слот.
     * 409 slot_taken — если время успели занять, пока гость заполнял форму.
     */
    @post
    create(
      @body body: BookingCreate,
    ): BookingCreated | ConflictError | ValidationError | NotFoundError;

    /** Экран подтверждения: гость открывает бронирование по ссылке с id. */
    @get
    @route("{id}")
    get(@path id: string): Booking | NotFoundError;
  }
}
