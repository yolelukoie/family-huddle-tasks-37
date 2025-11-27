export interface Theme {
  id: string;
  name: string;
  emotion: string;
  colors: {
    light: {
      background: string;
      foreground: string;
      card: string;
      cardForeground: string;
      popover: string;
      popoverForeground: string;
      primary: string;
      primaryForeground: string;
      secondary: string;
      secondaryForeground: string;
      muted: string;
      mutedForeground: string;
      accent: string;
      accentForeground: string;
      destructive: string;
      destructiveForeground: string;
      border: string;
      input: string;
      ring: string;
      // Family-specific colors
      familyWarm: string;
      familyWarmForeground: string;
      familySuccess: string;
      familySuccessForeground: string;
      familyStar: string;
      familyCelebration: string;
      // Theme-specific emotion colors
      gradientStart: string;
      gradientEnd: string;
      cardAccent: string;
      cardShadow: string;
      sectionTint: string;
      iconTint: string;
    };
    dark: {
      background: string;
      foreground: string;
      card: string;
      cardForeground: string;
      popover: string;
      popoverForeground: string;
      primary: string;
      primaryForeground: string;
      secondary: string;
      secondaryForeground: string;
      muted: string;
      mutedForeground: string;
      accent: string;
      accentForeground: string;
      destructive: string;
      destructiveForeground: string;
      border: string;
      input: string;
      ring: string;
    };
  };
}

export const themes: Theme[] = [
  {
    id: 'ocean-calm',
    name: 'themes.oceanCalm.name',
    emotion: 'themes.oceanCalm.emotion',
    colors: {
      light: {
        background: '195 53% 95%',
        foreground: '195 40% 15%',
        card: '195 40% 98%',
        cardForeground: '195 40% 15%',
        popover: '0 0% 100%',
        popoverForeground: '195 40% 15%',
        primary: '195 92% 50%',
        primaryForeground: '0 0% 100%',
        secondary: '195 53% 92%',
        secondaryForeground: '195 40% 20%',
        muted: '195 30% 94%',
        mutedForeground: '195 20% 40%',
        accent: '195 70% 88%',
        accentForeground: '195 40% 20%',
        destructive: '0 84% 60%',
        destructiveForeground: '0 0% 100%',
        border: '195 30% 85%',
        input: '195 30% 85%',
        ring: '195 92% 50%',
        familyWarm: '195 70% 60%',
        familyWarmForeground: '0 0% 100%',
        familySuccess: '150 65% 45%',
        familySuccessForeground: '0 0% 100%',
        familyStar: '45 100% 55%',
        familyCelebration: '195 92% 55%',
        // Emotion colors - Tranquil ocean vibes
        gradientStart: '195 92% 85%',
        gradientEnd: '195 70% 92%',
        cardAccent: '195 92% 50%',
        cardShadow: '195 92% 50%',
        sectionTint: '195 70% 96%',
        iconTint: '195 92% 50%',
      },
      dark: {
        background: '195 50% 8%',
        foreground: '195 20% 90%',
        card: '195 45% 12%',
        cardForeground: '195 20% 90%',
        popover: '195 45% 10%',
        popoverForeground: '195 20% 90%',
        primary: '195 92% 50%',
        primaryForeground: '0 0% 100%',
        secondary: '195 40% 18%',
        secondaryForeground: '195 20% 90%',
        muted: '195 40% 16%',
        mutedForeground: '195 20% 65%',
        accent: '195 45% 20%',
        accentForeground: '195 20% 90%',
        destructive: '0 62% 40%',
        destructiveForeground: '0 0% 100%',
        border: '195 40% 20%',
        input: '195 40% 20%',
        ring: '195 92% 50%',
      },
    },
  },
  {
    id: 'sunset-energy',
    name: 'themes.sunsetEnergy.name',
    emotion: 'themes.sunsetEnergy.emotion',
    colors: {
      light: {
        background: '25 100% 95%',
        foreground: '25 40% 15%',
        card: '25 60% 97%',
        cardForeground: '25 40% 15%',
        popover: '0 0% 100%',
        popoverForeground: '25 40% 15%',
        primary: '15 100% 50%',
        primaryForeground: '0 0% 100%',
        secondary: '35 100% 92%',
        secondaryForeground: '25 40% 20%',
        muted: '25 50% 93%',
        mutedForeground: '25 20% 40%',
        accent: '35 95% 85%',
        accentForeground: '25 40% 20%',
        destructive: '0 84% 60%',
        destructiveForeground: '0 0% 100%',
        border: '25 40% 88%',
        input: '25 40% 88%',
        ring: '15 100% 50%',
        familyWarm: '25 95% 53%',
        familyWarmForeground: '0 0% 100%',
        familySuccess: '142 76% 36%',
        familySuccessForeground: '0 0% 100%',
        familyStar: '45 100% 55%',
        familyCelebration: '15 100% 60%',
        // Emotion colors - Warm energetic sunset
        gradientStart: '15 100% 85%',
        gradientEnd: '35 100% 88%',
        cardAccent: '15 100% 50%',
        cardShadow: '15 100% 50%',
        sectionTint: '25 100% 96%',
        iconTint: '15 100% 50%',
      },
      dark: {
        background: '25 50% 8%',
        foreground: '25 20% 90%',
        card: '25 45% 12%',
        cardForeground: '25 20% 90%',
        popover: '25 45% 10%',
        popoverForeground: '25 20% 90%',
        primary: '15 100% 50%',
        primaryForeground: '0 0% 100%',
        secondary: '25 40% 18%',
        secondaryForeground: '25 20% 90%',
        muted: '25 40% 16%',
        mutedForeground: '25 20% 65%',
        accent: '25 45% 20%',
        accentForeground: '25 20% 90%',
        destructive: '0 62% 40%',
        destructiveForeground: '0 0% 100%',
        border: '25 40% 20%',
        input: '25 40% 20%',
        ring: '15 100% 50%',
      },
    },
  },
  {
    id: 'forest-growth',
    name: 'themes.forestGrowth.name',
    emotion: 'themes.forestGrowth.emotion',
    colors: {
      light: {
        background: '120 35% 95%',
        foreground: '120 30% 15%',
        card: '120 30% 98%',
        cardForeground: '120 30% 15%',
        popover: '0 0% 100%',
        popoverForeground: '120 30% 15%',
        primary: '142 76% 36%',
        primaryForeground: '0 0% 100%',
        secondary: '120 35% 92%',
        secondaryForeground: '120 30% 20%',
        muted: '120 25% 93%',
        mutedForeground: '120 15% 40%',
        accent: '140 50% 85%',
        accentForeground: '120 30% 20%',
        destructive: '0 84% 60%',
        destructiveForeground: '0 0% 100%',
        border: '120 25% 87%',
        input: '120 25% 87%',
        ring: '142 76% 40%',
        familyWarm: '35 80% 60%',
        familyWarmForeground: '0 0% 100%',
        familySuccess: '142 76% 36%',
        familySuccessForeground: '0 0% 100%',
        familyStar: '45 100% 55%',
        familyCelebration: '140 65% 55%',
        // Emotion colors - Natural forest growth
        gradientStart: '140 65% 88%',
        gradientEnd: '120 45% 92%',
        cardAccent: '142 76% 40%',
        cardShadow: '142 76% 36%',
        sectionTint: '120 35% 96%',
        iconTint: '142 76% 40%',
      },
      dark: {
        background: '120 30% 8%',
        foreground: '120 15% 90%',
        card: '120 28% 12%',
        cardForeground: '120 15% 90%',
        popover: '120 28% 10%',
        popoverForeground: '120 15% 90%',
        primary: '142 76% 40%',
        primaryForeground: '0 0% 100%',
        secondary: '120 25% 18%',
        secondaryForeground: '120 15% 90%',
        muted: '120 25% 16%',
        mutedForeground: '120 15% 65%',
        accent: '120 28% 20%',
        accentForeground: '120 15% 90%',
        destructive: '0 62% 40%',
        destructiveForeground: '0 0% 100%',
        border: '120 25% 20%',
        input: '120 25% 20%',
        ring: '142 76% 40%',
      },
    },
  },
  {
    id: 'lavender-dreams',
    name: 'themes.lavenderDreams.name',
    emotion: 'themes.lavenderDreams.emotion',
    colors: {
      light: {
        background: '270 60% 97%',
        foreground: '270 20% 15%',
        card: '270 50% 98%',
        cardForeground: '270 20% 15%',
        popover: '0 0% 100%',
        popoverForeground: '270 20% 15%',
        primary: '280 70% 60%',
        primaryForeground: '0 0% 100%',
        secondary: '270 50% 94%',
        secondaryForeground: '270 20% 20%',
        muted: '270 40% 95%',
        mutedForeground: '270 15% 40%',
        accent: '280 60% 88%',
        accentForeground: '270 20% 20%',
        destructive: '0 84% 60%',
        destructiveForeground: '0 0% 100%',
        border: '270 35% 90%',
        input: '270 35% 90%',
        ring: '280 70% 60%',
        familyWarm: '270 60% 70%',
        familyWarmForeground: '0 0% 100%',
        familySuccess: '142 76% 36%',
        familySuccessForeground: '0 0% 100%',
        familyStar: '45 100% 55%',
        familyCelebration: '280 70% 65%',
        // Emotion colors - Dreamy lavender pastels
        gradientStart: '280 70% 90%',
        gradientEnd: '270 60% 93%',
        cardAccent: '280 70% 60%',
        cardShadow: '280 70% 60%',
        sectionTint: '270 60% 97%',
        iconTint: '280 70% 60%',
      },
      dark: {
        background: '270 40% 8%',
        foreground: '270 15% 90%',
        card: '270 38% 12%',
        cardForeground: '270 15% 90%',
        popover: '270 38% 10%',
        popoverForeground: '270 15% 90%',
        primary: '280 70% 60%',
        primaryForeground: '0 0% 100%',
        secondary: '270 30% 18%',
        secondaryForeground: '270 15% 90%',
        muted: '270 30% 16%',
        mutedForeground: '270 15% 65%',
        accent: '270 38% 20%',
        accentForeground: '270 15% 90%',
        destructive: '0 62% 40%',
        destructiveForeground: '0 0% 100%',
        border: '270 30% 20%',
        input: '270 30% 20%',
        ring: '280 70% 60%',
      },
    },
  },
  {
    id: 'rose-garden',
    name: 'themes.roseGarden.name',
    emotion: 'themes.roseGarden.emotion',
    colors: {
      light: {
        background: '340 70% 96%',
        foreground: '340 20% 15%',
        card: '340 60% 98%',
        cardForeground: '340 20% 15%',
        popover: '0 0% 100%',
        popoverForeground: '340 20% 15%',
        primary: '330 70% 60%',
        primaryForeground: '0 0% 100%',
        secondary: '340 60% 93%',
        secondaryForeground: '340 20% 20%',
        muted: '340 50% 94%',
        mutedForeground: '340 15% 40%',
        accent: '330 65% 88%',
        accentForeground: '340 20% 20%',
        destructive: '0 84% 60%',
        destructiveForeground: '0 0% 100%',
        border: '340 40% 90%',
        input: '340 40% 90%',
        ring: '330 70% 60%',
        familyWarm: '340 70% 68%',
        familyWarmForeground: '0 0% 100%',
        familySuccess: '142 76% 36%',
        familySuccessForeground: '0 0% 100%',
        familyStar: '45 100% 55%',
        familyCelebration: '330 70% 65%',
        // Emotion colors - Romantic rose garden
        gradientStart: '330 70% 88%',
        gradientEnd: '340 65% 92%',
        cardAccent: '330 70% 60%',
        cardShadow: '330 70% 60%',
        sectionTint: '340 70% 96%',
        iconTint: '330 70% 60%',
      },
      dark: {
        background: '340 40% 8%',
        foreground: '340 15% 90%',
        card: '340 38% 12%',
        cardForeground: '340 15% 90%',
        popover: '340 38% 10%',
        popoverForeground: '340 15% 90%',
        primary: '330 70% 60%',
        primaryForeground: '0 0% 100%',
        secondary: '340 30% 18%',
        secondaryForeground: '340 15% 90%',
        muted: '340 30% 16%',
        mutedForeground: '340 15% 65%',
        accent: '340 38% 20%',
        accentForeground: '340 15% 90%',
        destructive: '0 62% 40%',
        destructiveForeground: '0 0% 100%',
        border: '340 30% 20%',
        input: '340 30% 20%',
        ring: '330 70% 60%',
      },
    },
  },
  {
    id: 'midnight-focus',
    name: 'themes.midnightFocus.name',
    emotion: 'themes.midnightFocus.emotion',
    colors: {
      light: {
        background: '220 25% 96%',
        foreground: '220 20% 15%',
        card: '220 30% 98%',
        cardForeground: '220 20% 15%',
        popover: '0 0% 100%',
        popoverForeground: '220 20% 15%',
        primary: '220 80% 50%',
        primaryForeground: '0 0% 100%',
        secondary: '220 25% 92%',
        secondaryForeground: '220 20% 20%',
        muted: '220 20% 94%',
        mutedForeground: '220 15% 40%',
        accent: '220 70% 88%',
        accentForeground: '220 20% 20%',
        destructive: '0 84% 60%',
        destructiveForeground: '0 0% 100%',
        border: '220 25% 88%',
        input: '220 25% 88%',
        ring: '220 80% 55%',
        familyWarm: '220 70% 60%',
        familyWarmForeground: '0 0% 100%',
        familySuccess: '142 76% 36%',
        familySuccessForeground: '0 0% 100%',
        familyStar: '45 100% 55%',
        familyCelebration: '220 80% 60%',
        // Emotion colors - Professional midnight focus
        gradientStart: '220 80% 85%',
        gradientEnd: '220 50% 92%',
        cardAccent: '220 80% 50%',
        cardShadow: '220 80% 50%',
        sectionTint: '220 25% 96%',
        iconTint: '220 80% 50%',
      },
      dark: {
        background: '220 40% 8%',
        foreground: '220 15% 90%',
        card: '220 38% 12%',
        cardForeground: '220 15% 90%',
        popover: '220 38% 10%',
        popoverForeground: '220 15% 90%',
        primary: '220 80% 55%',
        primaryForeground: '0 0% 100%',
        secondary: '220 35% 18%',
        secondaryForeground: '220 15% 90%',
        muted: '220 35% 16%',
        mutedForeground: '220 15% 65%',
        accent: '220 38% 20%',
        accentForeground: '220 15% 90%',
        destructive: '0 62% 40%',
        destructiveForeground: '0 0% 100%',
        border: '220 35% 20%',
        input: '220 35% 20%',
        ring: '220 80% 55%',
      },
    },
  },
];

export const getThemeById = (id: string): Theme | undefined => {
  return themes.find(theme => theme.id === id);
};
