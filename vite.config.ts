import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    build: {
      // Split large vendor libraries into their own chunks for faster initial load.
      rollupOptions: {
        output: {
          manualChunks: {
            charts: ["recharts"],
            motion: ["motion"],
          },
        },
      },
      chunkSizeWarningLimit: 900,
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      // The HMR websocket port is derived from PORT so you can run on another
      // port (e.g. PORT=3001 npm run dev) without the 24678 port clashing.
      hmr: process.env.DISABLE_HMR === 'true'
        ? false
        : { port: (Number(process.env.PORT) || 3000) + 1 },
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
