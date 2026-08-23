/**
 * Экран подтверждения: GET /api/public/bookings/{id}.
 * Открывается по прямой ссылке, аккаунт не нужен.
 */
import { useCallback } from 'react';
import { Button, Card, Divider, Group, Stack, Text, ThemeIcon, Title } from '@mantine/core';
import { IconCalendarCheck, IconCircleCheck } from '@tabler/icons-react';
import { Link, useParams } from 'react-router-dom';
import { publicApi } from '../api/services';
import { useApi } from '../hooks/useApi';
import { QueryState } from '../components/QueryState';
import { formatDate, formatTimeRange } from '../lib/datetime';

/** Поле «ключ — значение» в карточке встречи. */
function Row({ label, value }: { label: string; value: string }) {
  return (
    <Group justify="space-between" wrap="nowrap" align="flex-start">
      <Text size="sm" c="dimmed">
        {label}
      </Text>
      <Text size="sm" ta="right">
        {value}
      </Text>
    </Group>
  );
}

export function ConfirmationPage() {
  const { bookingId = '' } = useParams();

  const loadBooking = useCallback(() => publicApi.getBooking(bookingId), [bookingId]);
  const booking = useApi(loadBooking);

  // Профиль нужен ради таймзоны: в брони её нет, время приходит в UTC.
  const loadOwner = useCallback(() => publicApi.getOwner(), []);
  const owner = useApi(loadOwner);

  return (
    <Stack gap="lg" maw={560} mx="auto">
      <QueryState {...booking} onRetry={booking.reload}>
        {(data) => (
          <>
            <Stack gap="xs" align="center" ta="center">
              <ThemeIcon size={56} radius="xl" color="teal" variant="light">
                <IconCircleCheck size={32} />
              </ThemeIcon>
              <Title order={2}>Встреча забронирована</Title>
              <Text c="dimmed" size="sm">
                Сохраните ссылку на эту страницу — по ней всегда можно свериться с деталями.
              </Text>
            </Stack>

            <Card withBorder padding="lg" radius="md">
              <Stack gap="sm">
                <Group gap={8}>
                  <IconCalendarCheck size={18} />
                  <Text fw={600}>{data.eventTypeTitle}</Text>
                </Group>

                <Divider />

                {owner.data ? (
                  <>
                    <Row label="Дата" value={formatDate(data.start, owner.data.timeZone)} />
                    <Row
                      label="Время"
                      value={`${formatTimeRange(data.start, data.end, owner.data.timeZone)} (${owner.data.timeZone})`}
                    />
                  </>
                ) : (
                  <Row label="Начало" value={data.start} />
                )}

                <Divider />

                <Row label="Гость" value={data.guest.name} />
                <Row label="Email" value={data.guest.email} />
                {data.guest.notes ? <Row label="Заметки" value={data.guest.notes} /> : null}

                <Divider />

                <Row label="Номер записи" value={data.id} />
              </Stack>
            </Card>

            <Group justify="center">
              <Button component={Link} to="/book" variant="default">
                Записаться ещё раз
              </Button>
            </Group>
          </>
        )}
      </QueryState>
    </Stack>
  );
}
