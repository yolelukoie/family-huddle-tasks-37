import { vi } from 'vitest';

export function createI18nMock() {
  return {
    useTranslation: () => ({
      t: (key: string, opts?: any) => {
        if (opts && typeof opts === 'object') {
          const interpolated = Object.entries(opts)
            .map(([k, v]) => `${k}:${v}`)
            .join(',');
          return `${key}{${interpolated}}`;
        }
        return key;
      },
      i18n: {
        language: 'en',
        changeLanguage: vi.fn().mockResolvedValue(undefined),
        exists: vi.fn().mockReturnValue(true),
      },
    }),
    Trans: ({ children }: any) => children,
    initReactI18next: { type: '3rdParty', init: vi.fn() },
  };
}
