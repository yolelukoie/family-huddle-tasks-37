// Platform detection utility for web vs native (Capacitor)
// Uses @capacitor/core for reliable detection

import { Capacitor } from '@capacitor/core';

export type Platform = 'web' | 'ios' | 'android' | 'capacitor';

/**
 * Check if running in a specific platform
 */
export function isPlatform(platform: Platform): boolean {
  switch (platform) {
    case 'capacitor':
      return Capacitor.isNativePlatform();
    case 'ios':
      return Capacitor.getPlatform() === 'ios';
    case 'android':
      return Capacitor.getPlatform() === 'android';
    case 'web':
      return !Capacitor.isNativePlatform();
    default:
      return false;
  }
}

/**
 * Get current platform name
 */
export function getCurrentPlatform(): Platform {
  if (isPlatform('ios')) return 'ios';
  if (isPlatform('android')) return 'android';
  if (isPlatform('capacitor')) return 'capacitor';
  return 'web';
}

