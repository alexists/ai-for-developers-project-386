/**
 * Загрузка данных из API: состояние запроса и перезапрос.
 * Отдельной библиотеки состояния проект не требует — экранов немного,
 * а данные всегда запрашиваются по одному ключу.
 */
import { useCallback, useEffect, useState } from 'react';
import { ApiError } from '../api/client';

export interface ApiState<T> {
  data: T | null;
  loading: boolean;
  error: ApiError | null;
  reload: () => void;
}

/**
 * @param request функция запроса; должна быть стабильной (useCallback),
 *                иначе загрузка будет повторяться на каждый рендер
 * @param enabled если false — запрос не выполняется (нет обязательного параметра)
 */
/** Результат запроса. Хранится одним объектом: три поля меняются вместе. */
type Result<T> = { data: T | null; loading: boolean; error: ApiError | null };

const IDLE = { data: null, loading: false, error: null } as const;
const PENDING = { data: null, loading: true, error: null } as const;

export function useApi<T>(request: () => Promise<T>, enabled = true): ApiState<T> {
  const [result, setResult] = useState<Result<T>>(enabled ? PENDING : IDLE);
  const [attempt, setAttempt] = useState(0);

  const reload = useCallback(() => setAttempt((n) => n + 1), []);

  useEffect(() => {
    if (!enabled) return;

    // Ответ на устаревший запрос не должен затирать свежий результат.
    let cancelled = false;

    // Эффект синхронизирует состояние с сетью — тем самым внешним источником,
    // ради которого правило и допускает setState внутри эффекта.
    // eslint-disable-next-line react/set-state-in-effect
    setResult(PENDING);

    request()
      .then((data) => {
        if (!cancelled) setResult({ data, loading: false, error: null });
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        const error = err instanceof ApiError ? err : new ApiError(0, { message: String(err) });
        setResult({ data: null, loading: false, error });
      });

    return () => {
      cancelled = true;
    };
  }, [request, enabled, attempt]);

  // Пока запрос выключен, прошлый результат не показываем и состояние не пишем.
  return { ...(enabled ? result : IDLE), reload };
}
