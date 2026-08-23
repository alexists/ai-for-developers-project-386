/**
 * Форма гостя. Ограничения полей повторяют модель Guest из контракта,
 * чтобы очевидные ошибки отсекались до запроса, а не возвращались как 422.
 */
import { Button, Group, Stack, Textarea, TextInput } from '@mantine/core';
import { useForm } from '@mantine/form';
import type { Guest } from '../api/types';

interface Props {
  submitting: boolean;
  onSubmit: (guest: Guest) => void;
  onCancel: () => void;
}

export function GuestForm({ submitting, onSubmit, onCancel }: Props) {
  const form = useForm<Guest>({
    mode: 'uncontrolled',
    initialValues: { name: '', email: '', notes: '' },
    validate: {
      name: (value) => {
        const trimmed = value.trim();
        if (trimmed.length < 1) return 'Укажите имя';
        if (trimmed.length > 120) return 'Не больше 120 символов';
        return null;
      },
      email: (value) => (/^\S+@\S+\.\S+$/.test(value) ? null : 'Укажите корректный email'),
      notes: (value) => ((value ?? '').length > 1000 ? 'Не больше 1000 символов' : null),
    },
  });

  const handleSubmit = form.onSubmit((values) => {
    const notes = values.notes?.trim();
    onSubmit({
      name: values.name.trim(),
      email: values.email.trim(),
      // notes необязательны: пустую строку не отправляем.
      ...(notes ? { notes } : {}),
    });
  });

  return (
    <form onSubmit={handleSubmit}>
      <Stack gap="md">
        <TextInput
          label="Имя"
          placeholder="Как к вам обращаться"
          withAsterisk
          maxLength={120}
          key={form.key('name')}
          {...form.getInputProps('name')}
        />

        <TextInput
          label="Email"
          placeholder="you@example.com"
          withAsterisk
          type="email"
          key={form.key('email')}
          {...form.getInputProps('email')}
        />

        <Textarea
          label="Заметки"
          description="Что обсудить на встрече — необязательно"
          placeholder="Коротко о теме звонка"
          autosize
          minRows={3}
          maxLength={1000}
          key={form.key('notes')}
          {...form.getInputProps('notes')}
        />

        <Group justify="flex-end">
          <Button variant="default" onClick={onCancel} disabled={submitting}>
            Отмена
          </Button>
          <Button type="submit" loading={submitting}>
            Подтвердить запись
          </Button>
        </Group>
      </Stack>
    </form>
  );
}
