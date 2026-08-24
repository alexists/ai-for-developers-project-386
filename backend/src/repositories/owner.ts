/** Профиль владельца: одна строка, только чтение. */
import type { Owner } from '../api/types.js';
import type { Database } from '../db/database.js';

interface OwnerRow {
  name: string;
  bio: string | null;
  avatar_url: string | null;
  time_zone: string;
  workday_start: string;
  workday_end: string;
}

function toOwner(row: OwnerRow): Owner {
  const owner: Owner = {
    name: row.name,
    timeZone: row.time_zone,
    workdayStart: row.workday_start,
    workdayEnd: row.workday_end,
  };

  // Необязательные поля контракта не отдаются пустыми строками: их просто нет.
  if (row.bio !== null) {
    owner.bio = row.bio;
  }

  if (row.avatar_url !== null) {
    owner.avatarUrl = row.avatar_url;
  }

  return owner;
}

export function getOwner(db: Database): Owner {
  const row = db.prepare('SELECT * FROM owner WHERE id = 1').get() as unknown as OwnerRow | undefined;

  if (row === undefined) {
    throw new Error('Профиль владельца не инициализирован');
  }

  return toOwner(row);
}
