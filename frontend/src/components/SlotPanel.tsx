/**
 * Панель «Статус слотов» — сетка выбранного дня.
 * Занятые слоты показываются наравне со свободными: гость видит
 * загруженность дня, но не узнаёт, кто и на какой тип события занял время.
 */
import { Badge, Group, SimpleGrid, Stack, Text, UnstyledButton } from '@mantine/core';
import type { DaySlots, Slot } from '../api/types';
import { formatDayHeading, formatTime } from '../lib/datetime';

interface Props {
  daySlots: DaySlots;
  selectedStart: string | null;
  onSelect: (slot: Slot) => void;
}

export function SlotPanel({ daySlots, selectedStart, onSelect }: Props) {
  const freeCount = daySlots.slots.filter((slot) => slot.status === 'free').length;

  return (
    <Stack gap="sm">
      <Group justify="space-between" align="baseline">
        <Text fw={600} tt="capitalize">
          {formatDayHeading(daySlots.date, daySlots.timeZone)}
        </Text>
        <Badge variant="light" color={freeCount > 0 ? 'teal' : 'gray'}>
          свободно {freeCount} из {daySlots.slots.length}
        </Badge>
      </Group>

      {daySlots.slots.length === 0 ? (
        <Text size="sm" c="dimmed">
          В этот день нет слотов: выходной или день вне окна записи.
        </Text>
      ) : (
        <SimpleGrid cols={{ base: 3, sm: 4 }} spacing="xs">
          {daySlots.slots.map((slot) => {
            const isFree = slot.status === 'free';
            const isSelected = slot.start === selectedStart;

            return (
              <UnstyledButton
                key={slot.start}
                disabled={!isFree}
                onClick={() => isFree && onSelect(slot)}
                data-testid="slot"
                data-status={slot.status}
                style={(theme) => ({
                  padding: '8px 4px',
                  borderRadius: theme.radius.sm,
                  textAlign: 'center',
                  cursor: isFree ? 'pointer' : 'not-allowed',
                  border: `1px solid ${
                    isSelected ? theme.colors.indigo[6] : theme.colors.gray[3]
                  }`,
                  backgroundColor: isSelected
                    ? theme.colors.indigo[6]
                    : isFree
                      ? theme.white
                      : theme.colors.gray[1],
                  color: isSelected ? theme.white : isFree ? theme.black : theme.colors.gray[5],
                  textDecoration: isFree ? 'none' : 'line-through',
                })}
              >
                <Text size="sm" fw={isSelected ? 600 : 400}>
                  {formatTime(slot.start, daySlots.timeZone)}
                </Text>
              </UnstyledButton>
            );
          })}
        </SimpleGrid>
      )}

      <Text size="xs" c="dimmed">
        Время указано в таймзоне {daySlots.timeZone}
      </Text>
    </Stack>
  );
}
