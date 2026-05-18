import { useEffect } from 'react';
import { isPlatform } from '@/lib/platform';

/**
 * Sets the CSS variable `--keyboard-height` on the document root when the
 * on-screen keyboard appears/disappears.
 *
 * **iOS only.** On Android we rely on the system's
 * `windowSoftInputMode="adjustResize"` in AndroidManifest.xml, which resizes
 * the WebView itself when the keyboard opens. Adding our own bottom padding
 * on top of that would double-count the keyboard height and leave empty
 * space above the keyboard.
 */
export function useKeyboardInset() {
  useEffect(() => {
    // Android handles keyboard via adjustResize; only iOS needs manual padding.
    if (!isPlatform('ios')) return;

    const root = document.documentElement;

    let showHandle: { remove: () => void } | null = null;
    let hideHandle: { remove: () => void } | null = null;

    import('@capacitor/keyboard').then(({ Keyboard }) => {
      Keyboard.addListener('keyboardWillShow', (info) => {
        root.style.setProperty('--keyboard-height', `${info.keyboardHeight}px`);
      }).then((h) => { showHandle = h; });

      Keyboard.addListener('keyboardWillHide', () => {
        root.style.setProperty('--keyboard-height', '0px');
      }).then((h) => { hideHandle = h; });
    });

    return () => {
      showHandle?.remove();
      hideHandle?.remove();
      root.style.removeProperty('--keyboard-height');
    };
  }, []);
}
