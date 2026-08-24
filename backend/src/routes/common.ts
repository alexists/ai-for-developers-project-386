/** Общие куски описаний маршрутов, не относящиеся к моделям контракта. */
export const idParams = {
  type: 'object',
  properties: { id: { type: 'string' } },
  required: ['id'],
} as const;
