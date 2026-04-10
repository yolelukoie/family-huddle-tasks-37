import { vi } from 'vitest';

export function simulateNativePlatform(platform: 'android' | 'ios' = 'android') {
  const { Capacitor } = require('@capacitor/core');
  vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true);
  vi.mocked(Capacitor.getPlatform).mockReturnValue(platform);
}

export function simulateWebPlatform() {
  const { Capacitor } = require('@capacitor/core');
  vi.mocked(Capacitor.isNativePlatform).mockReturnValue(false);
  vi.mocked(Capacitor.getPlatform).mockReturnValue('web');
}
