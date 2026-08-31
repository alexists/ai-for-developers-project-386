### Hexlet tests and linter status:
[![Actions Status](https://github.com/alexists/ai-for-developers-project-386/actions/workflows/hexlet-check.yml/badge.svg)](https://github.com/alexists/ai-for-developers-project-386/actions)

# Запись на звонок

**Приложение: https://simple-booking.onrender.com**

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
e2e/          интеграционные сценарии в браузере: Playwright
Dockerfile    сборка всего приложения в один образ
domain.md     доменная модель и правила календаря
scenarios.md  пользовательские сценарии для проверки и где они проверяются
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

### Интеграционные сценарии

```bash
cd e2e
npm install
npx playwright install chromium
npm run build:app        # собрать бэкенд и фронтенд
npm test                 # 8 сценариев в настоящем браузере
```

Сценарии гоняются по собранному приложению — в той же связке, что и в Docker.
Что проверяется — в [scenarios.md](scenarios.md), как именно — в
[e2e/README.md](e2e/README.md).

## Проверки и релизы

Каждый push и pull request проходят через GitHub Actions
([ci.yml](.github/workflows/ci.yml)): пересборка контракта из `main.tsp` без
расхождений, сборка и тесты бэкенда, сборка фронтенда, интеграционные сценарии
в браузере и проверка, что Docker-образ поднимается и отвечает.

Коммиты — по [Conventional Commits](https://www.conventionalcommits.org/ru/v1.0.0/),
формат описан в [CLAUDE.md](CLAUDE.md) и проверяется в CI на каждом pull request.
По ним [release-please](.github/workflows/release-please.yml) держит открытым
release-PR с changelog и следующей версией; мёрдж этого PR выпускает релиз и
ставит тег.

## Деплой

Приложение публикуется как один Docker-сервис: тот же образ, что собирается
локально и в CI. Порт берётся из переменной `PORT` — платформа подставляет свой,
в `Dockerfile` у неё есть значение по умолчанию 8080.

Опубликовано на Render: **https://simple-booking.onrender.com**. Сервис собран
из этого репозитория, ветка `main`; коммит в неё запускает пересборку.

Развернуть свою копию — по блюпринту [render.yaml](render.yaml): New → Blueprint,
указать репозиторий. Остальное — сборка, health check, автодеплой — описано в файле.

Две особенности бесплатного плана:

- сервис засыпает после 15 минут без запросов, поэтому первый запрос
  после простоя идёт около минуты;
- постоянный диск не подключается, поэтому SQLite живёт в файловой системе
  контейнера и обнуляется при перезапуске. Чтобы брони переживали рестарт,
  нужен диск, смонтированный в `/data`.

## Статус

| Часть | Состояние |
|---|---|
| Контракт | готов: 12 эндпоинтов, 16 схем |
| Фронтенд | готов: 6 экранов, все операции контракта задействованы |
| Бэкенд | готов: все 12 эндпоинтов, инварианты I1–I5, 39 тестов |
| Docker-образ | готов: один образ, Node отдаёт API и статику |
| Интеграционные тесты | готовы: 8 сценариев Playwright поверх зафиксированных в `scenarios.md` |
| CI и релизы | готовы: GitHub Actions на каждый push, release-please с changelog |
| Деплой | готов: Render, публичная ссылка, автодеплой с `main` |
