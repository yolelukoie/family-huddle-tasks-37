import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.familyhuddle.app',
  appName: 'Family Huddle',
  webDir: 'dist',
  plugins: {
    GoogleAuth: {
      scopes: ['profile', 'email'],
      serverClientId: '508239163662-14kqipvcnvqmb1qpf9pq6lbbf7c0je02.apps.googleusercontent.com',
      forceCodeForRefreshToken: true,
    },
  },
};

export default config;
