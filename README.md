### Hexlet tests and linter status:
[![Actions Status](https://github.com/alexists/ai-for-developers-project-386/actions/workflows/hexlet-check.yml/badge.svg)](https://github.com/alexists/ai-for-developers-project-386/actions)

# Запись на звонок

Упрощённый аналог Cal.com. Владелец календаря публикует типы встреч, гость
выбирает свободный слот и бронирует его без регистрации.

Проект строится по подходу Design First: `api/main.tsp` — единственный источник
правды. Фронтенд и бэкенд реализуются по сгенерированному
`api/openapi/openapi.yaml` и не читают код друг друга.

## Структура

```
api/          контракт: main.tsp -> openapi/openapi.yaml
frontend/     интерфейс: Vite + React + Mantine
domain.md     доменная модель и сценарии
coverage.md   покрытие сценариев задания эндпоинтами
```

## Контракт

```bash
cd api
npm install
npx tsp compile .        # main.tsp -> openapi/openapi.yaml
```

Спецификация правится только в `main.tsp`. Обновлённый `openapi.yaml`
коммитится вместе с ней.

## Фронтенд

```bash
cd frontend
npm install
npm run mock             # Prism поднимает мок по контракту на :4010
npm run dev              # http://127.0.0.1:5173
```

Подробности — в [frontend/README.md](frontend/README.md).

## Статус

| Часть | Состояние |
|---|---|
| Контракт | готов: 12 эндпоинтов, 16 схем |
| Фронтенд | готов: 6 экранов, все операции контракта задействованы |
| Бэкенд | не начат |
| Docker-образ | не начат |
