import { Capacitor } from '@capacitor/core';
import { StatusBar, Style } from '@capacitor/status-bar';

/**
 * Configure the native status bar for Android/iOS.
 * Only runs on native platforms (not web).
 */
export async function configureStatusBar() {
  if (!Capacitor.isNativePlatform()) {
    return; // Only configure on native platforms
  }

  try {
    // Set status bar to overlay the webview (edge-to-edge)
    await StatusBar.setOverlaysWebView({ overlay: true });
    
    // Set status bar style (light icons for dark backgrounds, dark icons for light backgrounds)
    await StatusBar.setStyle({ style: Style.Light });
    
    // Set a semi-transparent background color (Android only)
    if (Capacitor.getPlatform() === 'android') {
      await StatusBar.setBackgroundColor({ color: '#00000033' }); // 20% black
    }
    
    console.log('[StatusBar] Configured successfully');
  } catch (error) {
    console.warn('[StatusBar] Configuration failed:', error);
  }
}

/**
 * Show the status bar (if hidden).
 */
export async function showStatusBar() {
  if (!Capacitor.isNativePlatform()) return;
  try {
    await StatusBar.show();
  } catch (error) {
    console.warn('[StatusBar] Show failed:', error);
  }
}

/**
 * Hide the status bar for immersive mode.
 */
export async function hideStatusBar() {
  if (!Capacitor.isNativePlatform()) return;
  try {
    await StatusBar.hide();
  } catch (error) {
    console.warn('[StatusBar] Hide failed:', error);
  }
}

/**
 * Set status bar style based on theme.
 */
export async function setStatusBarStyle(isDark: boolean) {
  if (!Capacitor.isNativePlatform()) return;
  try {
    await StatusBar.setStyle({ style: isDark ? Style.Dark : Style.Light });
  } catch (error) {
    console.warn('[StatusBar] Style change failed:', error);
  }
}
