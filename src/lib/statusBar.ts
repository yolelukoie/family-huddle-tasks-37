import { Capacitor } from '@capacitor/core';
import { EdgeToEdge } from '@capawesome/capacitor-android-edge-to-edge-support';

/**
 * Configure the native status bar for Android.
 * Only runs on Android native platform (EdgeToEdge plugin is Android-only).
 */
export async function configureStatusBar() {
  if (!Capacitor.isNativePlatform()) {
    return; // Only configure on native platforms
  }

  try {
    // Set a semi-transparent background color for the status bar area (Android only)
    if (Capacitor.getPlatform() === 'android') {
      await EdgeToEdge.setStatusBarColor({ color: '#00000033' }); // 20% black
    }

    console.log('[StatusBar] Configured successfully');
  } catch (error) {
    console.warn('[StatusBar] Configuration failed:', error);
  }
}

/**
 * Show the status bar (if hidden).
 * No-op with EdgeToEdge plugin — status bar visibility is always-on in edge-to-edge mode.
 */
export async function showStatusBar() {
  // EdgeToEdge plugin does not support show/hide; status bar is always visible
}

/**
 * Hide the status bar for immersive mode.
 * No-op with EdgeToEdge plugin — status bar visibility is always-on in edge-to-edge mode.
 */
export async function hideStatusBar() {
  // EdgeToEdge plugin does not support show/hide; status bar is always visible
}

/**
 * Set status bar style based on theme.
 * No-op with EdgeToEdge plugin — icon style is controlled by Android system in edge-to-edge mode.
 */
export async function setStatusBarStyle(_isDark: boolean) {
  // EdgeToEdge plugin does not expose a setStyle API; style is managed by the Android system
}
