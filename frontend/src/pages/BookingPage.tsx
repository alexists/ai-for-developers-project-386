/**
 * Страница бронирования: карточка типа события, месячный календарь окна
 * записи, панель слотов выбранного дня и форма гостя.
 *
 * Сценарий из доменной модели, шаги 3–6.
 */
import { useCallback, useState } from 'react';
import {
  Anchor,
  Badge,
  Card,
  Grid,
  Group,
  Modal,
  Stack,
  Text,
  Title,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import { IconArrowLeft, IconClock } from '@tabler/icons-react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { publicApi } from '../api/services';
import { ApiError } from '../api/client';
import type { Guest, Slot } from '../api/types';
import { useApi } from '../hooks/useApi';
import { QueryState } from '../components/QueryState';
import { AvailabilityCalendarView } from '../components/AvailabilityCalendarView';
import { SlotPanel } from '../components/SlotPanel';
import { GuestForm } from '../components/GuestForm';
import { formatDayHeading, formatDuration, formatTimeRange } from '../lib/datetime';

export function BookingPage() {
  const { eventTypeId = '' } = useParams();
  const navigate = useNavigate();

  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formOpened, form] = useDisclosure(false);

  const loadEventType = useCallback(() => publicApi.getEventType(eventTypeId), [eventTypeId]);
  const loadAvailability = useCallback(() => publicApi.getAvailability(eventTypeId), [eventTypeId]);
  const loadSlots = useCallback(
    () => publicApi.getDaySlots(eventTypeId, selectedDate as string),
    [eventTypeId, selectedDate],
  );

  const eventType = useApi(loadEventType);
  const availability = useApi(loadAvailability);
  const daySlots = useApi(loadSlots, selectedDate !== null);

  const handleSelectDate = (date: string | null) => {
    setSelectedDate(date);
    setSelectedSlot(null);
  };

  const handleSelectSlot = (slot: Slot) => {
    setSelectedSlot(slot);
    form.open();
  };

  /** Слот заняли, пока гость заполнял форму: перезапрашиваем сетку дня. */
  const handleSlotTaken = () => {
    form.close();
    setSelectedSlot(null);
    daySlots.reload();
    availability.reload();
    notifications.show({
      color: 'orange',
      title: 'Это время уже заняли',
      message: 'Пока вы заполняли форму, слот забронировали. Выберите другое время.',
    });
  };

  const handleSubmit = async (guest: Guest) => {
    if (!selectedSlot) return;

    setSubmitting(true);
    try {
      const booking = await publicApi.createBooking({
        eventTypeId,
        start: selectedSlot.start,
        guest,
      });
      navigate(`/bookings/${booking.id}`);
    } catch (error) {
      if (!(error instanceof ApiError)) throw error;

      if (error.code === 'slot_taken') {
        handleSlotTaken();
      } else {
        // slot_not_on_grid, slot_outside_window, invalid_payload,
        // event_type_not_found — сетка могла устареть, обновляем её.
        daySlots.reload();
        availability.reload();
        notifications.show({
          color: 'red',
          title: 'Не удалось создать запись',
          message: error.message,
        });
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Stack gap="lg">
      <Anchor component={Link} to="/book" size="sm">
        <Group gap={4}>
          <IconArrowLeft size={14} />
          Ко всем типам встреч
        </Group>
      </Anchor>

      <QueryState {...eventType} onRetry={eventType.reload}>
        {(data) => (
          <Stack gap={6}>
            <Title order={2}>{data.title}</Title>
            {data.description ? <Text c="dimmed">{data.description}</Text> : null}
            <Group>
              <Badge variant="light" leftSection={<IconClock size={12} />}>
                {formatDuration(data.durationMinutes)}
              </Badge>
            </Group>
          </Stack>
        )}
      </QueryState>

      <Grid gap="lg">
        <Grid.Col span={{ base: 12, md: 6 }}>
          <Card withBorder padding="lg" radius="md">
            <Stack gap="sm">
              <Text fw={600}>Выберите день</Text>
              <QueryState {...availability} onRetry={availability.reload}>
                {(data) => (
                  <Stack gap="xs" align="center">
                    <AvailabilityCalendarView
                      availability={data}
                      value={selectedDate}
                      onChange={handleSelectDate}
                    />
                    <Text size="xs" c="dimmed">
                      Окно записи: {data.windowStart} — {data.windowEnd}. Дни без свободных
                      слотов недоступны.
                    </Text>
                  </Stack>
                )}
              </QueryState>
            </Stack>
          </Card>
        </Grid.Col>

        <Grid.Col span={{ base: 12, md: 6 }}>
          <Card withBorder padding="lg" radius="md" h="100%">
            {selectedDate === null ? (
              <Stack gap={4} justify="center" h="100%" mih={160}>
                <Text fw={600}>Статус слотов</Text>
                <Text size="sm" c="dimmed">
                  Выберите день в календаре, чтобы увидеть свободное время.
                </Text>
              </Stack>
            ) : (
              <QueryState {...daySlots} onRetry={daySlots.reload}>
                {(data) => (
                  <SlotPanel
                    daySlots={data}
                    selectedStart={selectedSlot?.start ?? null}
                    onSelect={handleSelectSlot}
                  />
                )}
              </QueryState>
            )}
          </Card>
        </Grid.Col>
      </Grid>

      <Modal
        opened={formOpened}
        onClose={form.close}
        title="Подтверждение записи"
        centered
        closeOnClickOutside={!submitting}
      >
        <Stack gap="md">
          {selectedSlot && daySlots.data ? (
            <Card withBorder padding="sm" radius="sm" bg="gray.0">
              <Stack gap={2}>
                <Text size="sm" fw={600}>
                  {eventType.data?.title}
                </Text>
                <Text size="sm" tt="capitalize">
                  {formatDayHeading(daySlots.data.date, daySlots.data.timeZone)},{' '}
                  {formatTimeRange(selectedSlot.start, selectedSlot.end, daySlots.data.timeZone)}
                </Text>
                <Text size="xs" c="dimmed">
                  Таймзона {daySlots.data.timeZone}
                </Text>
              </Stack>
            </Card>
          ) : null}

          <GuestForm submitting={submitting} onSubmit={handleSubmit} onCancel={form.close} />
        </Stack>
      </Modal>
    </Stack>
  );
}
