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
      familyWarm: string;
      familyWarmForeground: string;
      familySuccess: string;
      familySuccessForeground: string;
      familyStar: string;
      familyCelebration: string;
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
        background: '200 25% 97%',
        foreground: '200 20% 20%',
        card: '200 30% 100%',
        cardForeground: '200 20% 20%',
        popover: '200 30% 100%',
        popoverForeground: '200 20% 20%',
        primary: '200 80% 50%',
        primaryForeground: '0 0% 100%',
        secondary: '200 25% 95%',
        secondaryForeground: '200 20% 25%',
        familyWarm: '190 70% 50%',
        familyWarmForeground: '0 0% 100%',
        familySuccess: '160 70% 45%',
        familySuccessForeground: '0 0% 100%',
        familyStar: '45 100% 55%',
        familyCelebration: '200 85% 65%',
        muted: '200 30% 96%',
        mutedForeground: '200 20% 50%',
        accent: '200 30% 96%',
        accentForeground: '200 20% 20%',
        destructive: '0 70% 60%',
        destructiveForeground: '0 0% 100%',
        border: '200 25% 90%',
        input: '200 25% 90%',
        ring: '200 80% 50%',
      },
      dark: {
        background: '200 35% 8%',
        foreground: '200 15% 95%',
        card: '200 35% 8%',
        cardForeground: '200 15% 95%',
        popover: '200 35% 8%',
        popoverForeground: '200 15% 95%',
        primary: '200 70% 55%',
        primaryForeground: '200 35% 10%',
        secondary: '200 25% 15%',
        secondaryForeground: '200 15% 95%',
        muted: '200 25% 15%',
        mutedForeground: '200 15% 65%',
        accent: '200 25% 15%',
        accentForeground: '200 15% 95%',
        destructive: '0 60% 40%',
        destructiveForeground: '0 0% 100%',
        border: '200 25% 15%',
        input: '200 25% 15%',
        ring: '200 70% 60%',
      },
    },
  },
  {
    id: 'sunset-energy',
    name: 'themes.sunsetEnergy.name',
    emotion: 'themes.sunsetEnergy.emotion',
    colors: {
      light: {
        background: '25 35% 97%',
        foreground: '25 20% 20%',
        card: '25 40% 100%',
        cardForeground: '25 20% 20%',
        popover: '25 40% 100%',
        popoverForeground: '25 20% 20%',
        primary: '15 85% 55%',
        primaryForeground: '0 0% 100%',
        secondary: '35 80% 95%',
        secondaryForeground: '25 20% 25%',
        familyWarm: '15 90% 58%',
        familyWarmForeground: '0 0% 100%',
        familySuccess: '140 75% 40%',
        familySuccessForeground: '0 0% 100%',
        familyStar: '45 100% 55%',
        familyCelebration: '330 85% 65%',
        muted: '25 35% 96%',
        mutedForeground: '25 20% 50%',
        accent: '25 35% 96%',
        accentForeground: '25 20% 20%',
        destructive: '0 75% 60%',
        destructiveForeground: '0 0% 100%',
        border: '25 30% 90%',
        input: '25 30% 90%',
        ring: '15 85% 55%',
      },
      dark: {
        background: '20 40% 8%',
        foreground: '20 15% 95%',
        card: '20 40% 8%',
        cardForeground: '20 15% 95%',
        popover: '20 40% 8%',
        popoverForeground: '20 15% 95%',
        primary: '15 80% 60%',
        primaryForeground: '20 40% 10%',
        secondary: '25 30% 15%',
        secondaryForeground: '20 15% 95%',
        muted: '25 30% 15%',
        mutedForeground: '20 15% 65%',
        accent: '25 30% 15%',
        accentForeground: '20 15% 95%',
        destructive: '0 65% 45%',
        destructiveForeground: '0 0% 100%',
        border: '25 30% 15%',
        input: '25 30% 15%',
        ring: '15 80% 65%',
      },
    },
  },
  {
    id: 'forest-growth',
    name: 'themes.forestGrowth.name',
    emotion: 'themes.forestGrowth.emotion',
    colors: {
      light: {
        background: '140 20% 97%',
        foreground: '140 15% 20%',
        card: '140 25% 100%',
        cardForeground: '140 15% 20%',
        popover: '140 25% 100%',
        popoverForeground: '140 15% 20%',
        primary: '145 60% 45%',
        primaryForeground: '0 0% 100%',
        secondary: '140 25% 95%',
        secondaryForeground: '140 15% 25%',
        familyWarm: '35 85% 55%',
        familyWarmForeground: '0 0% 100%',
        familySuccess: '145 70% 40%',
        familySuccessForeground: '0 0% 100%',
        familyStar: '45 100% 55%',
        familyCelebration: '160 70% 60%',
        muted: '140 20% 96%',
        mutedForeground: '140 15% 50%',
        accent: '140 20% 96%',
        accentForeground: '140 15% 20%',
        destructive: '0 70% 60%',
        destructiveForeground: '0 0% 100%',
        border: '140 20% 90%',
        input: '140 20% 90%',
        ring: '145 60% 45%',
      },
      dark: {
        background: '145 30% 8%',
        foreground: '140 10% 95%',
        card: '145 30% 8%',
        cardForeground: '140 10% 95%',
        popover: '145 30% 8%',
        popoverForeground: '140 10% 95%',
        primary: '145 55% 50%',
        primaryForeground: '145 30% 10%',
        secondary: '140 20% 15%',
        secondaryForeground: '140 10% 95%',
        muted: '140 20% 15%',
        mutedForeground: '140 10% 65%',
        accent: '140 20% 15%',
        accentForeground: '140 10% 95%',
        destructive: '0 60% 40%',
        destructiveForeground: '0 0% 100%',
        border: '140 20% 15%',
        input: '140 20% 15%',
        ring: '145 55% 55%',
      },
    },
  },
  {
    id: 'lavender-dreams',
    name: 'themes.lavenderDreams.name',
    emotion: 'themes.lavenderDreams.emotion',
    colors: {
      light: {
        background: '270 30% 97%',
        foreground: '270 15% 20%',
        card: '270 35% 100%',
        cardForeground: '270 15% 20%',
        popover: '270 35% 100%',
        popoverForeground: '270 15% 20%',
        primary: '270 65% 60%',
        primaryForeground: '0 0% 100%',
        secondary: '270 30% 95%',
        secondaryForeground: '270 15% 25%',
        familyWarm: '280 60% 65%',
        familyWarmForeground: '0 0% 100%',
        familySuccess: '145 70% 45%',
        familySuccessForeground: '0 0% 100%',
        familyStar: '45 100% 55%',
        familyCelebration: '280 75% 70%',
        muted: '270 25% 96%',
        mutedForeground: '270 15% 50%',
        accent: '270 25% 96%',
        accentForeground: '270 15% 20%',
        destructive: '0 70% 60%',
        destructiveForeground: '0 0% 100%',
        border: '270 25% 90%',
        input: '270 25% 90%',
        ring: '270 65% 60%',
      },
      dark: {
        background: '270 35% 8%',
        foreground: '270 15% 95%',
        card: '270 35% 8%',
        cardForeground: '270 15% 95%',
        popover: '270 35% 8%',
        popoverForeground: '270 15% 95%',
        primary: '270 60% 65%',
        primaryForeground: '270 35% 10%',
        secondary: '270 25% 15%',
        secondaryForeground: '270 15% 95%',
        muted: '270 25% 15%',
        mutedForeground: '270 15% 65%',
        accent: '270 25% 15%',
        accentForeground: '270 15% 95%',
        destructive: '0 60% 40%',
        destructiveForeground: '0 0% 100%',
        border: '270 25% 15%',
        input: '270 25% 15%',
        ring: '270 60% 70%',
      },
    },
  },
  {
    id: 'rose-garden',
    name: 'themes.roseGarden.name',
    emotion: 'themes.roseGarden.emotion',
    colors: {
      light: {
        background: '340 30% 97%',
        foreground: '340 15% 20%',
        card: '340 35% 100%',
        cardForeground: '340 15% 20%',
        popover: '340 35% 100%',
        popoverForeground: '340 15% 20%',
        primary: '340 75% 55%',
        primaryForeground: '0 0% 100%',
        secondary: '340 35% 95%',
        secondaryForeground: '340 15% 25%',
        familyWarm: '350 80% 60%',
        familyWarmForeground: '0 0% 100%',
        familySuccess: '145 70% 45%',
        familySuccessForeground: '0 0% 100%',
        familyStar: '45 100% 55%',
        familyCelebration: '320 85% 65%',
        muted: '340 25% 96%',
        mutedForeground: '340 15% 50%',
        accent: '340 25% 96%',
        accentForeground: '340 15% 20%',
        destructive: '0 70% 60%',
        destructiveForeground: '0 0% 100%',
        border: '340 25% 90%',
        input: '340 25% 90%',
        ring: '340 75% 55%',
      },
      dark: {
        background: '340 35% 8%',
        foreground: '340 15% 95%',
        card: '340 35% 8%',
        cardForeground: '340 15% 95%',
        popover: '340 35% 8%',
        popoverForeground: '340 15% 95%',
        primary: '340 70% 60%',
        primaryForeground: '340 35% 10%',
        secondary: '340 25% 15%',
        secondaryForeground: '340 15% 95%',
        muted: '340 25% 15%',
        mutedForeground: '340 15% 65%',
        accent: '340 25% 15%',
        accentForeground: '340 15% 95%',
        destructive: '0 60% 40%',
        destructiveForeground: '0 0% 100%',
        border: '340 25% 15%',
        input: '340 25% 15%',
        ring: '340 70% 65%',
      },
    },
  },
  {
    id: 'midnight-focus',
    name: 'themes.midnightFocus.name',
    emotion: 'themes.midnightFocus.emotion',
    colors: {
      light: {
        background: '230 20% 97%',
        foreground: '230 15% 20%',
        card: '230 25% 100%',
        cardForeground: '230 15% 20%',
        popover: '230 25% 100%',
        popoverForeground: '230 15% 20%',
        primary: '230 60% 50%',
        primaryForeground: '0 0% 100%',
        secondary: '230 20% 95%',
        secondaryForeground: '230 15% 25%',
        familyWarm: '25 85% 55%',
        familyWarmForeground: '0 0% 100%',
        familySuccess: '145 70% 45%',
        familySuccessForeground: '0 0% 100%',
        familyStar: '45 100% 55%',
        familyCelebration: '250 75% 65%',
        muted: '230 20% 96%',
        mutedForeground: '230 15% 50%',
        accent: '230 20% 96%',
        accentForeground: '230 15% 20%',
        destructive: '0 70% 60%',
        destructiveForeground: '0 0% 100%',
        border: '230 20% 90%',
        input: '230 20% 90%',
        ring: '230 60% 50%',
      },
      dark: {
        background: '230 40% 8%',
        foreground: '230 15% 95%',
        card: '230 40% 8%',
        cardForeground: '230 15% 95%',
        popover: '230 40% 8%',
        popoverForeground: '230 15% 95%',
        primary: '230 65% 55%',
        primaryForeground: '230 40% 10%',
        secondary: '230 30% 15%',
        secondaryForeground: '230 15% 95%',
        muted: '230 30% 15%',
        mutedForeground: '230 15% 65%',
        accent: '230 30% 15%',
        accentForeground: '230 15% 95%',
        destructive: '0 60% 40%',
        destructiveForeground: '0 0% 100%',
        border: '230 30% 15%',
        input: '230 30% 15%',
        ring: '230 65% 60%',
      },
    },
  },
];

export const getThemeById = (id: string): Theme | undefined => {
  return themes.find(theme => theme.id === id);
};
