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
backend/      сервер: Fastify + SQLite
Dockerfile    сборка всего приложения в один образ
domain.md     доменная модель и сценарии
coverage.md   покрытие сценариев задания эндпоинтами
```

## Быстрый старт в Docker

```bash
docker build -t simple-booking .
docker run -p 8080:8080 -v booking-data:/data simple-booking
```

Приложение целиком — на http://127.0.0.1:8080: Node отдаёт и API, и статику
фронтенда. База лежит в томе `booking-data`, поэтому брони переживают
пересоздание контейнера.

## Разработка

### Контракт

```bash
cd api
npm install
npx tsp compile .        # main.tsp -> openapi/openapi.yaml
```

Спецификация правится только в `main.tsp`. Обновлённый `openapi.yaml`
коммитится вместе с ней.

### Бэкенд

```bash
cd backend
npm install
npm run dev              # http://127.0.0.1:8080
npm test
```

Подробности — в [backend/README.md](backend/README.md).

### Фронтенд

```bash
cd frontend
npm install
npm run dev              # http://127.0.0.1:5173, /api проксируется на :8080
npm run mock             # при необходимости — мок Prism по контракту на :4010
```

Подробности — в [frontend/README.md](frontend/README.md).

## Статус

| Часть | Состояние |
|---|---|
| Контракт | готов: 12 эндпоинтов, 16 схем |
| Фронтенд | готов: 6 экранов, все операции контракта задействованы |
| Бэкенд | готов: все 12 эндпоинтов, инварианты I1–I5, 39 тестов |
| Docker-образ | готов: один образ, Node отдаёт API и статику |
