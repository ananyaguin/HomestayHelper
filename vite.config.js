import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function serveWasmPlugin() {
  return {
    name: 'serve-wasm-plugin',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const rawUrl = req.url || '';
        if (rawUrl.startsWith('/wasm/') || rawUrl.includes('ort-wasm')) {
          const urlPath = rawUrl.split('?')[0];
          const fileName = path.basename(urlPath);
          const filePath = path.join(__dirname, 'public/wasm', fileName);
          if (fs.existsSync(filePath)) {
            if (filePath.endsWith('.mjs') || filePath.endsWith('.js')) {
              res.setHeader('Content-Type', 'text/javascript');
            } else if (filePath.endsWith('.wasm')) {
              res.setHeader('Content-Type', 'application/wasm');
            }
            res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
            res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
            res.setHeader('Cache-Control', 'no-cache');
            return fs.createReadStream(filePath).pipe(res);
          }
        }
        next();
      });
    }
  };
}

export default defineConfig({
  plugins: [react(), serveWasmPlugin()],
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
