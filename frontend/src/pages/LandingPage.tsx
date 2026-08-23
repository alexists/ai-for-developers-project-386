/** Лендинг. Статическая страница, запросов к API не делает. */
import { Badge, Button, Card, Container, Group, SimpleGrid, Stack, Text, Title } from '@mantine/core';
import { IconCalendarEvent, IconClockHour4, IconUserCheck } from '@tabler/icons-react';
import { Link } from 'react-router-dom';

const features = [
  {
    icon: IconCalendarEvent,
    title: 'Календарь на 14 дней',
    text: 'Гость видит ближайшие свободные дни и сразу понимает, когда вы доступны.',
  },
  {
    icon: IconClockHour4,
    title: 'Слоты без пересечений',
    text: 'Календарь один на все типы встреч: занятое время нельзя забронировать дважды.',
  },
  {
    icon: IconUserCheck,
    title: 'Без регистрации',
    text: 'Гостю достаточно имени и почты — аккаунт создавать не нужно.',
  },
];

export function LandingPage() {
  return (
    <Container size="md" py="xl">
      <Stack gap="xl" align="center">
        <Stack gap="md" align="center" ta="center">
          <Badge size="lg" variant="light">
            Планирование встреч
          </Badge>
          <Title order={1}>Запись на звонок</Title>
          <Text c="dimmed" size="lg" maw={560}>
            Опубликуйте типы встреч, а гость сам выберет удобное время из вашего календаря.
            Согласование по переписке больше не нужно.
          </Text>
          <Group>
            <Button component={Link} to="/book" size="md">
              Записаться на встречу
            </Button>
            <Button component={Link} to="/admin/event-types" size="md" variant="default">
              Управлять календарём
            </Button>
          </Group>
        </Stack>

        <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="md" w="100%">
          {features.map(({ icon: Icon, title, text }) => (
            <Card key={title} withBorder padding="lg" radius="md">
              <Stack gap="xs">
                <Icon size={24} />
                <Text fw={600}>{title}</Text>
                <Text size="sm" c="dimmed">
                  {text}
                </Text>
              </Stack>
            </Card>
          ))}
        </SimpleGrid>
      </Stack>
    </Container>
  );
}
