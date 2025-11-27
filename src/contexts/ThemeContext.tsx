import React, { createContext, useContext, useState, useEffect } from 'react';
import { themes, Theme, getThemeById } from '@/config/themes';

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

    // Apply all color variables
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

    // Apply family-specific colors (only available in light mode)
    if (!isDark) {
      const lightColors = currentTheme.colors.light;
      root.style.setProperty('--family-warm', lightColors.familyWarm);
      root.style.setProperty('--family-warm-foreground', lightColors.familyWarmForeground);
      root.style.setProperty('--family-success', lightColors.familySuccess);
      root.style.setProperty('--family-success-foreground', lightColors.familySuccessForeground);
      root.style.setProperty('--family-star', lightColors.familyStar);
      root.style.setProperty('--family-celebration', lightColors.familyCelebration);
    }
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
