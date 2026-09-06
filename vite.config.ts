import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Имя GitHub-репозитория. Страница будет жить на
// https://<user>.github.io/capitals-quiz/ — поэтому base с ведущим и конечным слэшем.
// Если переименуешь репозиторий — поменяй только эту строку.
const REPO = 'capitals-quiz';

export default defineConfig(({ command }) => ({
  base: command === 'build' ? `/${REPO}/` : '/',
  plugins: [react()],
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false,
  },
  server: {
    host: true,
    port: 5173,
  },
}));
