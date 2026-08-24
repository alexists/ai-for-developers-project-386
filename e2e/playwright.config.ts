import { defineConfig, devices } from '@playwright/test';

/**
 * Сценарии гоняются по собранному приложению в той же связке, что и в Docker:
 * один процесс Node отдаёт и API, и статику фронтенда. Так проверяется ровно то,
 * что уезжает в образ, а не поведение dev-сервера с прокси.
 *
 * База поднимается в памяти (DB_PATH=:memory:), поэтому каждый прогон стартует
 * с чистого календаря и стартовых типов событий.
 */
const PORT = 8099;
const baseURL = `http://127.0.0.1:${PORT}`;

export default defineConfig({
  testDir: './tests',
  timeout: 30_000,
  expect: { timeout: 7_000 },
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,

  // Сценарии меняют общий календарь владельца, поэтому идут строго по одному.
  fullyParallel: false,
  workers: 1,

  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : [['list']],

  use: {
    baseURL,
    locale: 'ru-RU',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],

  webServer: {
    command: 'node ../backend/dist/server.js',
    url: `${baseURL}/api/public/owner`,
    // Сервер поднимается заново на каждый прогон: тесты рассчитывают на пустой календарь.
    reuseExistingServer: false,
    timeout: 30_000,
    stdout: 'ignore',
    stderr: 'pipe',
    env: {
      HOST: '127.0.0.1',
      PORT: String(PORT),
      DB_PATH: ':memory:',
      STATIC_DIR: '../frontend/dist',
      LOG_LEVEL: 'warn',
    },
  },
});
