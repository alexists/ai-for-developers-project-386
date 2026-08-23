/** Общий каркас: шапка с навигацией и контейнер под контент страницы. */
import { AppShell, Anchor, Container, Group, Text } from '@mantine/core';
import { IconCalendarClock } from '@tabler/icons-react';
import { Link, Outlet, useLocation } from 'react-router-dom';

const navLinks = [
  { to: '/book', label: 'Записаться' },
  { to: '/admin/event-types', label: 'Типы встреч' },
  { to: '/admin/bookings', label: 'Записи' },
];

export function Layout() {
  const { pathname } = useLocation();

  return (
    <AppShell header={{ height: 60 }} padding="md">
      <AppShell.Header>
        <Container size="lg" h="100%">
          <Group h="100%" justify="space-between">
            <Anchor component={Link} to="/" underline="never" c="inherit">
              <Group gap={8}>
                <IconCalendarClock size={22} />
                <Text fw={700}>Запись на звонок</Text>
              </Group>
            </Anchor>

            <Group gap="lg">
              {navLinks.map(({ to, label }) => (
                <Anchor
                  key={to}
                  component={Link}
                  to={to}
                  underline="never"
                  size="sm"
                  c="inherit"
                  // Активный раздел считаем сами: Mantine разбирает style
                  // как свой проп и не пробрасывает isActive из NavLink.
                  fw={pathname.startsWith(to) ? 600 : 400}
                >
                  {label}
                </Anchor>
              ))}
            </Group>
          </Group>
        </Container>
      </AppShell.Header>

      <AppShell.Main>
        <Container size="lg" py="md">
          <Outlet />
        </Container>
      </AppShell.Main>
    </AppShell>
  );
}
