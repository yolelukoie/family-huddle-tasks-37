import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.familyhuddle.app',
  appName: 'Family Huddle',
  webDir: 'dist',
  plugins: {
    SystemBars: {
      insetsHandling: 'disable',
    },
    EdgeToEdge: {
      backgroundColor: '#ffffff',
    },
    Keyboard: {
      resize: 'none',
    },
    GoogleAuth: {
      scopes: ['profile', 'email'],
      clientId: '508239163662-14kqipvcnvqmb1qpf9pq6lbbf7c0je02.apps.googleusercontent.com',
      forceCodeForRefreshToken: true,
    },
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
  },
};

export default config;
