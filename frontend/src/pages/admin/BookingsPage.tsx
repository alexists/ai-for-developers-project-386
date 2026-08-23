/**
 * Админка, предстоящие записи: GET /api/owner/bookings с фильтрами
 * from / to / eventTypeId и отмена через DELETE /api/owner/bookings/{id}.
 *
 * Список приходит уже отсортированным по start — на клиенте не пересортировываем.
 */
import { useCallback, useMemo, useState } from 'react';
import {
  ActionIcon,
  Badge,
  Button,
  Card,
  Group,
  Select,
  Stack,
  Table,
  Text,
  Title,
  Tooltip,
} from '@mantine/core';
import { DatePickerInput } from '@mantine/dates';
import { notifications } from '@mantine/notifications';
import { IconFilterOff, IconTrash } from '@tabler/icons-react';
import dayjs from 'dayjs';
import { ownerApi } from '../../api/services';
import { ApiError } from '../../api/client';
import type { Booking } from '../../api/types';
import { useApi } from '../../hooks/useApi';
import { QueryState } from '../../components/QueryState';
import { formatDateTime, formatTime, isPast } from '../../lib/datetime';

export function BookingsPage() {
  const [from, setFrom] = useState<string | null>(null);
  const [to, setTo] = useState<string | null>(null);
  const [eventTypeId, setEventTypeId] = useState<string | null>(null);

  const loadProfile = useCallback(() => ownerApi.getProfile(), []);
  const loadEventTypes = useCallback(() => ownerApi.listEventTypes(), []);
  const profile = useApi(loadProfile);
  const eventTypes = useApi(loadEventTypes);

  // Границы фильтра задаются датой, а контракт ждёт момент в UTC.
  const query = useMemo(
    () => ({
      ...(from ? { from: dayjs(from).startOf('day').toISOString() } : {}),
      ...(to ? { to: dayjs(to).endOf('day').toISOString() } : {}),
      ...(eventTypeId ? { eventTypeId } : {}),
    }),
    [from, to, eventTypeId],
  );

  const loadBookings = useCallback(() => ownerApi.listBookings(query), [query]);
  const bookings = useApi(loadBookings);

  const hasFilters = from !== null || to !== null || eventTypeId !== null;

  const resetFilters = () => {
    setFrom(null);
    setTo(null);
    setEventTypeId(null);
  };

  const handleCancel = async (booking: Booking) => {
    const confirmed = window.confirm(
      `Отменить встречу «${booking.eventTypeTitle}» с гостем ${booking.guest.name}? Слот освободится.`,
    );
    if (!confirmed) return;

    try {
      await ownerApi.cancelBooking(booking.id);
      notifications.show({ color: 'teal', message: 'Встреча отменена, слот освободился' });
      bookings.reload();
    } catch (error) {
      const message = error instanceof ApiError ? error.message : String(error);
      notifications.show({ color: 'red', title: 'Не удалось отменить', message });
    }
  };

  const timeZone = profile.data?.timeZone ?? 'UTC';

  return (
    <Stack gap="lg">
      <Group justify="space-between" align="baseline">
        <Title order={2}>Предстоящие записи</Title>
        {profile.data ? (
          <Text size="sm" c="dimmed">
            Время в таймзоне {timeZone}
          </Text>
        ) : null}
      </Group>

      <Card withBorder padding="md" radius="md">
        <Group align="flex-end" gap="md">
          <DatePickerInput
            label="С даты"
            placeholder="Не ограничено"
            clearable
            value={from}
            onChange={setFrom}
            maw={180}
          />
          <DatePickerInput
            label="По дату"
            placeholder="Не ограничено"
            clearable
            value={to}
            onChange={setTo}
            maw={180}
          />
          <Select
            label="Тип события"
            placeholder="Все типы"
            clearable
            searchable
            value={eventTypeId}
            onChange={(value) => setEventTypeId(value)}
            data={(eventTypes.data ?? []).map((type) => ({ value: type.id, label: type.title }))}
            maw={220}
          />
          <Button
            variant="default"
            leftSection={<IconFilterOff size={16} />}
            onClick={resetFilters}
            disabled={!hasFilters}
          >
            Сбросить
          </Button>
        </Group>
      </Card>

      <QueryState
        {...bookings}
        onRetry={bookings.reload}
        empty={hasFilters ? 'Под фильтры ничего не подошло' : 'Записей пока нет'}
      >
        {(list) => (
          <Table.ScrollContainer minWidth={720}>
            <Table verticalSpacing="sm" highlightOnHover>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Когда</Table.Th>
                  <Table.Th>Тип встречи</Table.Th>
                  <Table.Th>Гость</Table.Th>
                  <Table.Th>Заметки</Table.Th>
                  <Table.Th w={60} />
                </Table.Tr>
              </Table.Thead>

              <Table.Tbody>
                {list.map((booking) => (
                  <Table.Tr key={booking.id} opacity={isPast(booking.start) ? 0.55 : 1}>
                    <Table.Td>
                      <Stack gap={0}>
                        <Text size="sm">{formatDateTime(booking.start, timeZone)}</Text>
                        <Text size="xs" c="dimmed">
                          до {formatTime(booking.end, timeZone)}
                          {isPast(booking.start) ? ' · прошла' : ''}
                        </Text>
                      </Stack>
                    </Table.Td>

                    <Table.Td>
                      <Badge variant="light">{booking.eventTypeTitle}</Badge>
                    </Table.Td>

                    <Table.Td>
                      <Stack gap={0}>
                        <Text size="sm">{booking.guest.name}</Text>
                        <Text size="xs" c="dimmed">
                          {booking.guest.email}
                        </Text>
                      </Stack>
                    </Table.Td>

                    <Table.Td maw={240}>
                      <Text size="sm" c="dimmed" lineClamp={2}>
                        {booking.guest.notes || '—'}
                      </Text>
                    </Table.Td>

                    <Table.Td>
                      <Tooltip label="Отменить встречу">
                        <ActionIcon
                          variant="subtle"
                          color="red"
                          onClick={() => handleCancel(booking)}
                        >
                          <IconTrash size={16} />
                        </ActionIcon>
                      </Tooltip>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </Table.ScrollContainer>
        )}
      </QueryState>
    </Stack>
  );
}
