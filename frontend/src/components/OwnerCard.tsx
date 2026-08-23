/** Шапка с профилем владельца: гость видит, чей это календарь. */
import { Avatar, Group, Stack, Text, Title } from '@mantine/core';
import { IconWorld } from '@tabler/icons-react';
import type { Owner } from '../api/types';

/** Инициалы для плейсхолдера, когда avatarUrl не задан. */
function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? '')
    .join('');
}

export function OwnerCard({ owner }: { owner: Owner }) {
  return (
    <Group gap="md" wrap="nowrap" align="flex-start">
      <Avatar src={owner.avatarUrl ?? undefined} size={64} radius="xl" color="indigo">
        {initials(owner.name)}
      </Avatar>

      <Stack gap={4}>
        <Title order={2}>{owner.name}</Title>
        {owner.bio ? (
          <Text c="dimmed" size="sm">
            {owner.bio}
          </Text>
        ) : null}
        <Group gap={6} c="dimmed">
          <IconWorld size={14} />
          <Text size="xs">
            {owner.timeZone} · рабочие часы {owner.workdayStart.slice(0, 5)}–{owner.workdayEnd.slice(0, 5)}
          </Text>
        </Group>
      </Stack>
    </Group>
  );
}
