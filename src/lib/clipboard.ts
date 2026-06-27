import { Capacitor } from '@capacitor/core';

/**
 * Cross-platform text copy.
 *
 * - On native (iOS/Android via Capacitor): uses the @capacitor/clipboard plugin,
 *   which has native UIKit/Android clipboard access. Works in WKWebView (iOS)
 *   where `navigator.clipboard` is unreliable in non-secure contexts.
 * - On web: uses `navigator.clipboard.writeText`.
 *
 * Returns `true` if the copy actually succeeded, `false` otherwise. Callers
 * should only show a "Copied" toast when this returns `true`.
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  if (!text) return false;

  if (Capacitor.isNativePlatform()) {
    try {
      const { Clipboard } = await import('@capacitor/clipboard');
      await Clipboard.write({ string: text });
      return true;
    } catch (err) {
      console.warn('[clipboard] Capacitor write failed:', err);
      // Fall through to navigator.clipboard as a best-effort fallback.
    }
  }

  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (err) {
    console.warn('[clipboard] navigator.clipboard.writeText failed:', err);
    return false;
  }
}
