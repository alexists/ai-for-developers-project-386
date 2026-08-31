/**
 * Месячная сетка окна записи. Под числом дня — сколько слотов свободно.
 * Кликабельность дня определяет только сервер, через isBookable:
 * фронтенд не пересчитывает окно записи самостоятельно.
 */
import { Stack, Text } from '@mantine/core';
import { DatePicker } from '@mantine/dates';
import type { AvailabilityCalendar } from '../api/types';

interface Props {
  availability: AvailabilityCalendar;
  value: string | null;
  onChange: (date: string | null) => void;
}

export function AvailabilityCalendarView({ availability, value, onChange }: Props) {
  const byDate = new Map(availability.days.map((day) => [day.date, day]));

  // Окно записи начинается сегодня, а сегодняшний рабочий день может уже
  // кончиться. Открываем календарь на первом дне, куда реально можно
  // записаться: иначе в последний день месяца гость видит пустую сетку.
  const firstBookable = availability.days.find((day) => day.isBookable)?.date;

  return (
    <DatePicker
      value={value}
      onChange={onChange}
      // Дни за пределами окна записи в ответе отсутствуют — их не показываем.
      minDate={availability.windowStart}
      maxDate={availability.windowEnd}
      defaultDate={firstBookable ?? availability.windowStart}
      hideOutsideDates
      size="md"
      excludeDate={(date) => !byDate.get(date)?.isBookable}
      renderDay={(date) => {
        const day = byDate.get(date);
        const dayNumber = Number(date.slice(-2));
        // У выбранного дня фон закрашен акцентным цветом, поэтому
        // подпись на нём должна быть белой, а не бирюзовой.
        const isSelected = date === value;

        return (
          <Stack gap={0} align="center" justify="center">
            <Text size="sm" lh={1.1}>
              {dayNumber}
            </Text>
            <Text
              size="9px"
              lh={1.1}
              c={isSelected ? 'white' : day?.isBookable ? 'teal' : 'dimmed'}
            >
              {day ? `${day.freeSlots} св.` : ''}
            </Text>
          </Stack>
        );
      }}
      styles={{
        day: { height: 44, width: 44 },
      }}
    />
  );
}
