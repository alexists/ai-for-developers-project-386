/**
 * Единое отображение состояний запроса: загрузка, ошибка, пустой результат.
 * Держит обработку ошибок контракта в одном месте, а не на каждом экране.
 */
import type { ReactNode } from 'react';
import { Alert, Button, Center, Group, Loader, Stack, Text } from '@mantine/core';
import { IconAlertTriangle, IconInbox } from '@tabler/icons-react';
import type { ApiError } from '../api/client';

interface QueryStateProps<T> {
  data: T | null;
  loading: boolean;
  error: ApiError | null;
  onRetry?: () => void;
  /** Показывается, когда пришёл пустой массив. */
  empty?: ReactNode;
  children: (data: T) => ReactNode;
}

export function QueryState<T>({ data, loading, error, onRetry, empty, children }: QueryStateProps<T>) {
  if (loading) {
    return (
      <Center py="xl">
        <Loader />
      </Center>
    );
  }

  if (error) {
    return (
      <Alert
        color="red"
        icon={<IconAlertTriangle size={18} />}
        title={error.status === 404 ? 'Не найдено' : 'Не удалось загрузить данные'}
      >
        <Stack gap="xs" align="flex-start">
          <Text size="sm">{error.message}</Text>
          {error.details?.length ? (
            <Stack gap={2}>
              {error.details.map((line) => (
                <Text key={line} size="xs" c="dimmed">
                  {line}
                </Text>
              ))}
            </Stack>
          ) : null}
          {onRetry ? (
            <Button size="xs" variant="light" color="red" onClick={onRetry}>
              Повторить
            </Button>
          ) : null}
        </Stack>
      </Alert>
    );
  }

  if (data === null) return null;

  if (Array.isArray(data) && data.length === 0 && empty) {
    return (
      <Center py="xl">
        <Group gap="xs" c="dimmed">
          <IconInbox size={18} />
          <Text size="sm">{empty}</Text>
        </Group>
      </Center>
    );
  }

  return <>{children(data)}</>;
}
