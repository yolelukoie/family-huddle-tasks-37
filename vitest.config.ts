import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react-swc';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    css: false,
    deps: {
      inline: [
        '@capacitor/core',
        '@capacitor/app',
        '@capacitor/push-notifications',
        '@capacitor/status-bar',
        '@revenuecat/purchases-capacitor',
        '@southdevs/capacitor-google-auth',
        'capacitor-native-settings',
      ],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
