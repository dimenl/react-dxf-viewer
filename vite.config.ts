import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  root: 'demo',
  resolve: {
    alias: {
      'react-dxf-viewer': path.resolve(__dirname, 'src'),
    },
  },
  server: {
    open: true,
  },
});
