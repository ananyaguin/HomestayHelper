import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 8081,
    hmr: {
      port: 8081,
      clientPort: 8081
    },
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp'
    },
    proxy: {
      '/api/ollama': {
        target: 'http://127.0.0.1:11434',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/ollama/, '')
      },
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true
      }
    }
  },
  preview: {
    port: 8081,
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp'
    },
    proxy: {
      '/api/ollama': {
        target: 'http://127.0.0.1:11434',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/ollama/, '')
      },
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true
      }
    }
  },
  optimizeDeps: {
    exclude: ['@huggingface/transformers', 'onnxruntime-web']
  }
});
