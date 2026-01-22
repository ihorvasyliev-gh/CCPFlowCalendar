import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    // Загружаем переменные окружения
    // VITE_ переменные автоматически доступны через import.meta.env в клиентском коде
    // GEMINI_API_KEY загружаем отдельно, так как он без префикса VITE_
    const env = loadEnv(mode, '.', '');
    
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [react()],
      build: {
        outDir: 'dist',
        assetsDir: 'assets',
        sourcemap: false,
        emptyOutDir: true,
        rollupOptions: {
          input: {
            main: path.resolve(__dirname, 'index.html'),
          },
          output: {
            manualChunks: (id) => {
              // Split vendor chunks for better caching
              if (id.includes('node_modules')) {
                if (id.includes('react') || id.includes('react-dom')) {
                  return 'vendor-react';
                }
                if (id.includes('@supabase')) {
                  return 'vendor-supabase';
                }
                if (id.includes('lucide-react')) {
                  return 'vendor-lucide';
                }
                // Other node_modules
                return 'vendor';
              }
            },
          },
        },
      },
      define: {
        // Только переменные БЕЗ префикса VITE_ нужно определять вручную
        // VITE_ переменные автоматически доступны через import.meta.env
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
