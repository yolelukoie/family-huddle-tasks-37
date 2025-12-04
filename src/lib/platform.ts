// Platform detection utility for web vs native (Capacitor)
// This will be expanded when Capacitor is added

export type Platform = 'web' | 'ios' | 'android' | 'capacitor';

/**
 * Check if running in a specific platform
 */
export function isPlatform(platform: Platform): boolean {
  if (typeof window === 'undefined') return false;
  
  // When Capacitor is added, it sets window.Capacitor
  const capacitor = (window as any).Capacitor;
  
  switch (platform) {
    case 'capacitor':
      return !!capacitor?.isNativePlatform?.();
    case 'ios':
      return capacitor?.getPlatform?.() === 'ios';
    case 'android':
      return capacitor?.getPlatform?.() === 'android';
    case 'web':
      return !capacitor?.isNativePlatform?.();
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

/**
 * Check if running as PWA (installed to home screen)
 */
export function isPWA(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as any).standalone === true;
}
