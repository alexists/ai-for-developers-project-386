# Один образ на всё приложение: Node отдаёт и /api, и собранный фронтенд.
# Контракт копируется в каждую стадию — из него генерируются и клиент, и модели,
# а в рантайме он же служит источником схем валидации.

# --- Сборка фронтенда --------------------------------------------------------
FROM node:26-bookworm-slim AS frontend-build
WORKDIR /build
COPY api/openapi/openapi.yaml api/openapi/openapi.yaml
COPY frontend/package.json frontend/package-lock.json frontend/
WORKDIR /build/frontend
RUN npm ci
COPY frontend/ ./
RUN npm run build

# --- Сборка бэкенда ----------------------------------------------------------
FROM node:26-bookworm-slim AS backend-build
WORKDIR /build
COPY api/openapi/openapi.yaml api/openapi/openapi.yaml
COPY backend/package.json backend/package-lock.json backend/
WORKDIR /build/backend
RUN npm ci
COPY backend/ ./
RUN npm run build

# --- Рантайм -----------------------------------------------------------------
FROM node:26-bookworm-slim
WORKDIR /app

ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=8080 \
    DB_PATH=/data/booking.db \
    STATIC_DIR=/app/public \
    CONTRACT_PATH=/app/api/openapi/openapi.yaml

COPY backend/package.json backend/package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY --from=backend-build /build/backend/dist ./dist
COPY --from=frontend-build /build/frontend/dist ./public
COPY api/openapi/openapi.yaml ./api/openapi/openapi.yaml

# База живёт в томе, чтобы брони переживали пересоздание контейнера.
RUN mkdir -p /data && chown -R node:node /data
VOLUME /data

USER node
EXPOSE 8080

# Отдельного эндпоинта проверки в контракте нет — используем публичный профиль.
# Порт берётся из окружения: платформа деплоя подставляет свой PORT.
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s \
  CMD node -e "fetch('http://127.0.0.1:' + process.env.PORT + '/api/public/owner').then(r => process.exit(r.ok ? 0 : 1), () => process.exit(1))"

CMD ["node", "dist/server.js"]
