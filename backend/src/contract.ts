/**
 * Схемы валидации и сериализации берутся прямо из контракта.
 *
 * openapi.yaml читается на старте, `components.schemas` регистрируется в Fastify
 * одной схемой с $id "contract", а ссылки вида `#/components/schemas/X`
 * переписываются в `contract#/$defs/X` — в таком виде их понимают и ajv
 * (валидация запросов), и fast-json-stringify (сериализация ответов).
 *
 * Смысл: ни одно правило контракта — pattern слага, длина title, границы
 * durationMinutes, значения по умолчанию — не продублировано в коде руками.
 */
import { readFileSync } from 'node:fs';
import { parse } from 'yaml';
import { config } from './config.js';

type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };
type SchemaObject = Record<string, JsonValue>;

const OPENAPI_REF_PREFIX = '#/components/schemas/';
const CONTRACT_SCHEMA_ID = 'contract';

/** Рекурсивно переписывает ссылки OpenAPI в ссылки на зарегистрированную схему. */
function rewriteRefs(node: JsonValue): JsonValue {
  if (Array.isArray(node)) {
    return node.map(rewriteRefs);
  }

  if (node === null || typeof node !== 'object') {
    return node;
  }

  const result: SchemaObject = {};

  for (const [key, value] of Object.entries(node)) {
    if (key === '$ref' && typeof value === 'string' && value.startsWith(OPENAPI_REF_PREFIX)) {
      result[key] = `${CONTRACT_SCHEMA_ID}#/$defs/${value.slice(OPENAPI_REF_PREFIX.length)}`;
      continue;
    }

    result[key] = rewriteRefs(value);
  }

  return result;
}

interface OpenApiDocument {
  info: { version: string };
  components: { schemas: Record<string, SchemaObject> };
}

const document = parse(readFileSync(config.contractPath, 'utf8')) as OpenApiDocument;

const definitions = rewriteRefs(document.components.schemas) as Record<string, SchemaObject>;

/** Единственная схема, которую регистрирует приложение. */
export const contractSchema = {
  $id: CONTRACT_SCHEMA_ID,
  $defs: definitions,
};

export const contractVersion = document.info.version;

/** Ссылка на схему контракта по имени. Опечатка падает на старте, а не в рантайме. */
export function schemaRef(name: string): { $ref: string } {
  if (!(name in definitions)) {
    throw new Error(`В контракте нет схемы "${name}"`);
  }

  return { $ref: `${CONTRACT_SCHEMA_ID}#/$defs/${name}` };
}

/** Массив объектов схемы контракта — ответы-списки описываются им. */
export function arrayOf(name: string): { type: 'array'; items: { $ref: string } } {
  return { type: 'array', items: schemaRef(name) };
}
