import React, { createContext, useContext, useState, useEffect } from 'react';
import { themes, Theme, getThemeById } from '@/config/themes';
import { isPlatform } from '@/lib/platform';

/**
 * Sync the Android system bar (status + navigation) background color to
 * match the app's current background. Without this, the system bars keep
 * their static config color while the app body changes color via theme,
 * looking like a mismatched band on Android edge-to-edge devices.
 *
 * No-op on iOS / web. Lazily imports the Capawesome edge-to-edge plugin so
 * non-Android platforms don't pay the JS cost.
 */
async function syncAndroidSystemBarColor() {
  if (!isPlatform('android')) return;
  try {
    // Resolve the body's computed background to RGB, then convert to hex.
    const rgb = getComputedStyle(document.body).backgroundColor;
    // rgb() / rgba() — strip and parse the three channel ints
    const match = rgb.match(/\d+/g);
    if (!match || match.length < 3) return;
    const r = parseInt(match[0], 10);
    const g = parseInt(match[1], 10);
    const b = parseInt(match[2], 10);
    const hex = '#' + [r, g, b].map((c) => c.toString(16).padStart(2, '0')).join('');

    const { EdgeToEdge } = await import('@capawesome/capacitor-android-edge-to-edge-support');
    await EdgeToEdge.setBackgroundColor({ color: hex });
  } catch {
    // Plugin may not be available on web/iOS — silently skip
  }
}

interface ThemeContextType {
  currentTheme: Theme;
  setTheme: (themeId: string) => void;
  availableThemes: Theme[];
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentTheme, setCurrentTheme] = useState<Theme>(() => {
    const savedThemeId = localStorage.getItem('app-theme');
    return getThemeById(savedThemeId || 'ocean-calm') || themes[0];
  });

  const setTheme = (themeId: string) => {
    const theme = getThemeById(themeId);
    if (theme) {
      setCurrentTheme(theme);
      localStorage.setItem('app-theme', themeId);
    }
  };

  useEffect(() => {
    const root = document.documentElement;
    const isDark = root.classList.contains('dark');
    const colors = isDark ? currentTheme.colors.dark : currentTheme.colors.light;

    // Apply all base color variables
    root.style.setProperty('--background', colors.background);
    root.style.setProperty('--foreground', colors.foreground);
    root.style.setProperty('--card', colors.card);
    root.style.setProperty('--card-foreground', colors.cardForeground);
    root.style.setProperty('--popover', colors.popover);
    root.style.setProperty('--popover-foreground', colors.popoverForeground);
    root.style.setProperty('--primary', colors.primary);
    root.style.setProperty('--primary-foreground', colors.primaryForeground);
    root.style.setProperty('--secondary', colors.secondary);
    root.style.setProperty('--secondary-foreground', colors.secondaryForeground);
    root.style.setProperty('--muted', colors.muted);
    root.style.setProperty('--muted-foreground', colors.mutedForeground);
    root.style.setProperty('--accent', colors.accent);
    root.style.setProperty('--accent-foreground', colors.accentForeground);
    root.style.setProperty('--destructive', colors.destructive);
    root.style.setProperty('--destructive-foreground', colors.destructiveForeground);
    root.style.setProperty('--border', colors.border);
    root.style.setProperty('--input', colors.input);
    root.style.setProperty('--ring', colors.ring);

    // Apply family-specific colors and theme emotion colors (only available in light mode)
    if (!isDark) {
      const lightColors = currentTheme.colors.light;
      root.style.setProperty('--family-warm', lightColors.familyWarm);
      root.style.setProperty('--family-warm-foreground', lightColors.familyWarmForeground);
      root.style.setProperty('--family-success', lightColors.familySuccess);
      root.style.setProperty('--family-success-foreground', lightColors.familySuccessForeground);
      root.style.setProperty('--family-star', lightColors.familyStar);
      root.style.setProperty('--family-celebration', lightColors.familyCelebration);
      
      // Apply theme emotion colors
      root.style.setProperty('--gradient-start', lightColors.gradientStart);
      root.style.setProperty('--gradient-end', lightColors.gradientEnd);
      root.style.setProperty('--card-accent', lightColors.cardAccent);
      root.style.setProperty('--card-shadow', lightColors.cardShadow);
      root.style.setProperty('--section-tint', lightColors.sectionTint);
      root.style.setProperty('--icon-tint', lightColors.iconTint);
    }

    // Sync Android system bar (edge-to-edge) background to the new theme.
    // No-op on iOS / web.
    void syncAndroidSystemBarColor();
  }, [currentTheme]);

  return (
    <ThemeContext.Provider value={{ currentTheme, setTheme, availableThemes: themes }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
