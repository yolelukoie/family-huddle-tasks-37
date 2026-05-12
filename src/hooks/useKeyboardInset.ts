import { useEffect } from 'react';
import { isPlatform } from '@/lib/platform';

export function useKeyboardInset() {
  useEffect(() => {
    if (!isPlatform('capacitor')) return;

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
