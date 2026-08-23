import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * Фронтенд ходит в API только по относительному пути /api, а dev-сервер
 * проксирует его на бэкенд. Так один и тот же код работает и с Prism
 * (мок по контракту), и с настоящим бэкендом, и за nginx в Docker.
 */
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const target = env.VITE_API_TARGET || 'http://127.0.0.1:4010';

  return {
    plugins: [react()],
    server: {
      host: '127.0.0.1',
      port: 5173,
      proxy: {
        '/api': { target, changeOrigin: true },
      },
    },
  };
});
