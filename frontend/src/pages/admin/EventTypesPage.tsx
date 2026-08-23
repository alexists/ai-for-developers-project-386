/**
 * Админка, типы встреч: GET / POST / PATCH / DELETE /api/owner/event-types.
 * id задаёт владелец, и после создания он неизменяем — так требует контракт.
 */
import { useCallback, useState } from 'react';
import {
  ActionIcon,
  Button,
  Card,
  Group,
  Modal,
  NumberInput,
  SimpleGrid,
  Stack,
  Text,
  Textarea,
  TextInput,
  Title,
  Tooltip,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { IconEdit, IconPlus, IconTrash } from '@tabler/icons-react';
import { ownerApi } from '../../api/services';
import { ApiError } from '../../api/client';
import type { EventType } from '../../api/types';
import { useApi } from '../../hooks/useApi';
import { QueryState } from '../../components/QueryState';
import { formatDuration } from '../../lib/datetime';

/** Слаг из контракта: ^[a-z0-9]+(-[a-z0-9]+)*$ */
const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;

interface FormValues {
  id: string;
  title: string;
  description: string;
  durationMinutes: number;
}

const EMPTY_FORM: FormValues = { id: '', title: '', description: '', durationMinutes: 30 };

export function EventTypesPage() {
  const loadEventTypes = useCallback(() => ownerApi.listEventTypes(), []);
  const eventTypes = useApi(loadEventTypes);

  const [opened, modal] = useDisclosure(false);
  const [editing, setEditing] = useState<EventType | null>(null);
  const [saving, setSaving] = useState(false);

  const form = useForm<FormValues>({
    mode: 'uncontrolled',
    initialValues: EMPTY_FORM,
    validate: {
      // При редактировании id не отправляется, поэтому и не проверяется.
      id: (value) =>
        editing || SLUG_PATTERN.test(value)
          ? null
          : 'Только строчные латинские буквы, цифры и дефис',
      title: (value) =>
        value.trim().length >= 1 && value.length <= 120 ? null : 'От 1 до 120 символов',
      description: (value) => (value.length <= 2000 ? null : 'Не больше 2000 символов'),
      durationMinutes: (value) => (value >= 5 && value <= 480 ? null : 'От 5 до 480 минут'),
    },
  });

  const openCreate = () => {
    setEditing(null);
    form.setInitialValues(EMPTY_FORM);
    form.reset();
    modal.open();
  };

  const openEdit = (eventType: EventType) => {
    setEditing(eventType);
    const values: FormValues = {
      id: eventType.id,
      title: eventType.title,
      description: eventType.description,
      durationMinutes: eventType.durationMinutes,
    };
    form.setInitialValues(values);
    form.setValues(values);
    modal.open();
  };

  const handleSubmit = form.onSubmit(async (values) => {
    setSaving(true);
    try {
      if (editing) {
        await ownerApi.updateEventType(editing.id, {
          title: values.title.trim(),
          description: values.description,
          durationMinutes: values.durationMinutes,
        });
        notifications.show({ color: 'teal', message: 'Тип события обновлён' });
      } else {
        await ownerApi.createEventType({
          id: values.id,
          title: values.title.trim(),
          description: values.description,
          durationMinutes: values.durationMinutes,
        });
        notifications.show({ color: 'teal', message: 'Тип события создан' });
      }
      modal.close();
      eventTypes.reload();
    } catch (error) {
      if (!(error instanceof ApiError)) throw error;

      if (error.code === 'event_type_already_exists') {
        form.setFieldError('id', 'Тип события с таким id уже существует');
      } else {
        notifications.show({ color: 'red', title: 'Не удалось сохранить', message: error.message });
      }
    } finally {
      setSaving(false);
    }
  });

  const handleDelete = async (eventType: EventType) => {
    const confirmed = window.confirm(
      `Удалить тип события «${eventType.title}»? Уже созданные встречи останутся в списке записей.`,
    );
    if (!confirmed) return;

    try {
      await ownerApi.deleteEventType(eventType.id);
      notifications.show({ color: 'teal', message: 'Тип события удалён' });
      eventTypes.reload();
    } catch (error) {
      const message = error instanceof ApiError ? error.message : String(error);
      notifications.show({ color: 'red', title: 'Не удалось удалить', message });
    }
  };

  return (
    <Stack gap="lg">
      <Group justify="space-between">
        <Title order={2}>Типы встреч</Title>
        <Button leftSection={<IconPlus size={16} />} onClick={openCreate}>
          Создать тип
        </Button>
      </Group>

      <QueryState {...eventTypes} onRetry={eventTypes.reload} empty="Типов встреч пока нет">
        {(list) => (
          <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="md">
            {list.map((eventType) => (
              <Card key={eventType.id} withBorder padding="lg" radius="md">
                <Stack gap="sm" h="100%" justify="space-between">
                  <Stack gap={6}>
                    <Group justify="space-between" wrap="nowrap" align="flex-start">
                      <Text fw={600}>{eventType.title}</Text>
                      <Group gap={4} wrap="nowrap">
                        <Tooltip label="Редактировать">
                          <ActionIcon variant="subtle" onClick={() => openEdit(eventType)}>
                            <IconEdit size={16} />
                          </ActionIcon>
                        </Tooltip>
                        <Tooltip label="Удалить">
                          <ActionIcon
                            variant="subtle"
                            color="red"
                            onClick={() => handleDelete(eventType)}
                          >
                            <IconTrash size={16} />
                          </ActionIcon>
                        </Tooltip>
                      </Group>
                    </Group>

                    <Text size="xs" c="dimmed" ff="monospace">
                      /book/{eventType.id}
                    </Text>

                    {eventType.description ? (
                      <Text size="sm" c="dimmed" lineClamp={3}>
                        {eventType.description}
                      </Text>
                    ) : null}
                  </Stack>

                  <Text size="sm">{formatDuration(eventType.durationMinutes)}</Text>
                </Stack>
              </Card>
            ))}
          </SimpleGrid>
        )}
      </QueryState>

      <Modal
        opened={opened}
        onClose={modal.close}
        title={editing ? 'Редактирование типа события' : 'Новый тип события'}
        centered
      >
        <form onSubmit={handleSubmit}>
          <Stack gap="md">
            <TextInput
              label="Идентификатор"
              description={
                editing ? 'Изменить нельзя' : 'Попадёт в ссылку вида /book/intro-call'
              }
              placeholder="intro-call"
              withAsterisk
              disabled={editing !== null}
              maxLength={64}
              key={form.key('id')}
              {...form.getInputProps('id')}
            />

            <TextInput
              label="Название"
              placeholder="Знакомство"
              withAsterisk
              maxLength={120}
              key={form.key('title')}
              {...form.getInputProps('title')}
            />

            <Textarea
              label="Описание"
              placeholder="О чём эта встреча"
              autosize
              minRows={3}
              maxLength={2000}
              key={form.key('description')}
              {...form.getInputProps('description')}
            />

            <NumberInput
              label="Длительность, минут"
              description="Она же задаёт шаг сетки слотов"
              withAsterisk
              min={5}
              max={480}
              key={form.key('durationMinutes')}
              {...form.getInputProps('durationMinutes')}
            />

            <Group justify="flex-end">
              <Button variant="default" onClick={modal.close} disabled={saving}>
                Отмена
              </Button>
              <Button type="submit" loading={saving}>
                Сохранить
              </Button>
            </Group>
          </Stack>
        </form>
      </Modal>
    </Stack>
  );
}
