import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    // The world atlas is one big JSON blob; keeping it out of the entry chunk
    // is not worth a separate request, so silence the size warning instead.
    chunkSizeWarningLimit: 800,
  },
});
