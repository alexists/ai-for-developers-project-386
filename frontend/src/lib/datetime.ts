/**
 * Работа со временем. Контракт отдаёт моменты в UTC, а даты календаря и
 * рабочие часы трактуются в таймзоне владельца, поэтому всё, что видит
 * пользователь, форматируется именно в ней.
 */
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import 'dayjs/locale/ru';

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.locale('ru');

/**
 * Контракт объявляет timeZone строкой в формате IANA, но проверить это может
 * только рантайм: на нераспознанной зоне Intl бросает RangeError и роняет
 * страницу. Непригодную зону заменяем на UTC — интерфейс остаётся рабочим.
 */
function safeZone(timeZone: string): string {
  try {
    new Intl.DateTimeFormat('ru', { timeZone });
    return timeZone;
  } catch {
    return 'UTC';
  }
}

/** «14:30» — время слота в таймзоне владельца. */
export function formatTime(utcIso: string, timeZone: string): string {
  return dayjs.utc(utcIso).tz(safeZone(timeZone)).format('HH:mm');
}

/** «14:30 – 15:00» — интервал слота. */
export function formatTimeRange(startUtc: string, endUtc: string, timeZone: string): string {
  return `${formatTime(startUtc, timeZone)} – ${formatTime(endUtc, timeZone)}`;
}

/** «24 августа 2026» — дата в таймзоне владельца. */
export function formatDate(value: string, timeZone: string): string {
  return dayjs.utc(value).tz(safeZone(timeZone)).format('D MMMM YYYY');
}

/** «понедельник, 24 августа» — заголовок панели слотов. */
export function formatDayHeading(plainDate: string, timeZone: string): string {
  return dayjs.tz(plainDate, safeZone(timeZone)).format('dddd, D MMMM');
}

/** «24 августа 2026, 14:30» — строка встречи в списке владельца. */
export function formatDateTime(utcIso: string, timeZone: string): string {
  return dayjs.utc(utcIso).tz(safeZone(timeZone)).format('D MMMM YYYY, HH:mm');
}

/** «30 минут» / «1 ч 30 мин» — человекочитаемая длительность. */
export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} мин`;

  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest === 0 ? `${hours} ч` : `${hours} ч ${rest} мин`;
}

/** Прошёл ли момент — для пометки встреч владельца. */
export function isPast(utcIso: string): boolean {
  return dayjs.utc(utcIso).isBefore(dayjs.utc());
}
