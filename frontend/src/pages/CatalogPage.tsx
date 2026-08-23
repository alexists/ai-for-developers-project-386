/**
 * Каталог типов событий.
 * GET /api/public/owner — шапка, GET /api/public/event-types — карточки.
 */
import { useCallback } from 'react';
import { Badge, Card, Divider, Group, SimpleGrid, Stack, Text, Title } from '@mantine/core';
import { IconClock } from '@tabler/icons-react';
import { Link } from 'react-router-dom';
import { publicApi } from '../api/services';
import { useApi } from '../hooks/useApi';
import { QueryState } from '../components/QueryState';
import { OwnerCard } from '../components/OwnerCard';
import { formatDuration } from '../lib/datetime';

export function CatalogPage() {
  const loadOwner = useCallback(() => publicApi.getOwner(), []);
  const loadEventTypes = useCallback(() => publicApi.listEventTypes(), []);

  const owner = useApi(loadOwner);
  const eventTypes = useApi(loadEventTypes);

  return (
    <Stack gap="xl">
      <QueryState {...owner}>{(data) => <OwnerCard owner={data} />}</QueryState>

      <Divider />

      <Stack gap="md">
        <Title order={3}>Выберите тип события</Title>

        <QueryState {...eventTypes} empty="Владелец пока не опубликовал ни одного типа встречи">
          {(list) => (
            <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="md">
              {list.map((eventType) => (
                <Card
                  key={eventType.id}
                  component={Link}
                  to={`/book/${eventType.id}`}
                  withBorder
                  padding="lg"
                  radius="md"
                  data-testid="event-type-card"
                >
                  <Stack gap="sm" h="100%" justify="space-between">
                    <Stack gap={6}>
                      <Text fw={600}>{eventType.title}</Text>
                      {eventType.description ? (
                        <Text size="sm" c="dimmed" lineClamp={3}>
                          {eventType.description}
                        </Text>
                      ) : null}
                    </Stack>

                    <Group gap={6}>
                      <Badge variant="light" leftSection={<IconClock size={12} />}>
                        {formatDuration(eventType.durationMinutes)}
                      </Badge>
                    </Group>
                  </Stack>
                </Card>
              ))}
            </SimpleGrid>
          )}
        </QueryState>
      </Stack>
    </Stack>
  );
}
