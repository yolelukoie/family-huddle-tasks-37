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
      // Matches `--background: 45 100% 97%` (HSL) — the app's pale cream
      // light-mode background. ThemeContext updates this at runtime when
      // the user switches themes or dark mode.
      backgroundColor: '#fffbf0',
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
