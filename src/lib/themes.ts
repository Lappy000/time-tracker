// time-tracker/src/lib/themes.ts

export interface ThemeColors {
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
  // Productivity colors
  productive: string;
  productiveForeground: string;
  distraction: string;
  distractionForeground: string;
  warning: string;
  warningForeground: string;
}

export interface Theme {
  id: string;
  name: string;
  description: string;
  isDark: boolean;
  colors: ThemeColors;
}

// Default dark theme colors (current app theme)
const darkColors: ThemeColors = {
  background: '222.2 84% 4.9%',
  foreground: '210 40% 98%',
  card: '222.2 84% 4.9%',
  cardForeground: '210 40% 98%',
  popover: '222.2 84% 4.9%',
  popoverForeground: '210 40% 98%',
  primary: '217.2 91.2% 59.8%',
  primaryForeground: '222.2 47.4% 11.2%',
  secondary: '217.2 32.6% 17.5%',
  secondaryForeground: '210 40% 98%',
  muted: '217.2 32.6% 17.5%',
  mutedForeground: '215 20.2% 65.1%',
  accent: '217.2 32.6% 17.5%',
  accentForeground: '210 40% 98%',
  destructive: '0 62.8% 30.6%',
  destructiveForeground: '210 40% 98%',
  border: '217.2 32.6% 17.5%',
  input: '217.2 32.6% 17.5%',
  ring: '224.3 76.3% 48%',
  productive: '142.1 76.2% 36.3%',
  productiveForeground: '355.7 100% 97.3%',
  distraction: '0 72.2% 50.6%',
  distractionForeground: '210 40% 98%',
  warning: '38 92% 50%',
  warningForeground: '0 0% 100%'
};

// Light theme colors
const lightColors: ThemeColors = {
  background: '0 0% 100%',
  foreground: '222.2 84% 4.9%',
  card: '0 0% 100%',
  cardForeground: '222.2 84% 4.9%',
  popover: '0 0% 100%',
  popoverForeground: '222.2 84% 4.9%',
  primary: '221.2 83.2% 53.3%',
  primaryForeground: '210 40% 98%',
  secondary: '210 40% 96.1%',
  secondaryForeground: '222.2 47.4% 11.2%',
  muted: '210 40% 96.1%',
  mutedForeground: '215.4 16.3% 46.9%',
  accent: '210 40% 96.1%',
  accentForeground: '222.2 47.4% 11.2%',
  destructive: '0 84.2% 60.2%',
  destructiveForeground: '210 40% 98%',
  border: '214.3 31.8% 91.4%',
  input: '214.3 31.8% 91.4%',
  ring: '221.2 83.2% 53.3%',
  productive: '142.1 70.6% 45.3%',
  productiveForeground: '144.9 80.4% 10%',
  distraction: '0 84.2% 60.2%',
  distractionForeground: '0 0% 100%',
  warning: '38 92% 50%',
  warningForeground: '0 0% 0%'
};

export const themes: Theme[] = [
  {
    id: 'dark',
    name: 'Dark',
    description: 'Default dark theme',
    isDark: true,
    colors: darkColors
  },
  {
    id: 'light',
    name: 'Light',
    description: 'Clean light theme',
    isDark: false,
    colors: lightColors
  },
  {
    id: 'midnight',
    name: 'Midnight Blue',
    description: 'Deep blue dark theme',
    isDark: true,
    colors: {
      ...darkColors,
      background: '230 35% 7%',
      card: '230 35% 9%',
      popover: '230 35% 9%',
      secondary: '230 30% 15%',
      muted: '230 30% 15%',
      border: '230 30% 20%',
      input: '230 30% 20%',
      primary: '210 100% 60%',
      ring: '210 100% 55%',
      accent: '230 30% 20%'
    }
  },
  {
    id: 'forest',
    name: 'Forest Green',
    description: 'Nature-inspired dark theme',
    isDark: true,
    colors: {
      ...darkColors,
      background: '150 20% 6%',
      card: '150 20% 8%',
      popover: '150 20% 8%',
      secondary: '150 15% 14%',
      muted: '150 15% 14%',
      border: '150 15% 18%',
      input: '150 15% 18%',
      primary: '142 71% 45%',
      primaryForeground: '144 80% 10%',
      ring: '142 71% 45%',
      accent: '150 15% 18%'
    }
  },
  {
    id: 'sunset',
    name: 'Sunset Orange',
    description: 'Warm orange-tinted dark theme',
    isDark: true,
    colors: {
      ...darkColors,
      background: '20 20% 7%',
      card: '20 20% 9%',
      popover: '20 20% 9%',
      secondary: '20 15% 15%',
      muted: '20 15% 15%',
      border: '20 15% 20%',
      input: '20 15% 20%',
      primary: '25 95% 53%',
      primaryForeground: '20 50% 10%',
      ring: '25 95% 53%',
      accent: '20 15% 20%'
    }
  },
  {
    id: 'ocean',
    name: 'Ocean',
    description: 'Deep ocean blue theme',
    isDark: true,
    colors: {
      ...darkColors,
      background: '200 50% 5%',
      card: '200 50% 7%',
      popover: '200 50% 7%',
      secondary: '200 40% 12%',
      muted: '200 40% 12%',
      border: '200 40% 18%',
      input: '200 40% 18%',
      primary: '185 80% 50%',
      primaryForeground: '200 60% 10%',
      ring: '185 80% 50%',
      accent: '200 40% 18%'
    }
  },
  {
    id: 'lavender',
    name: 'Lavender',
    description: 'Soft purple theme',
    isDark: true,
    colors: {
      ...darkColors,
      background: '270 30% 7%',
      card: '270 30% 9%',
      popover: '270 30% 9%',
      secondary: '270 25% 15%',
      muted: '270 25% 15%',
      border: '270 25% 20%',
      input: '270 25% 20%',
      primary: '270 60% 60%',
      ring: '270 60% 55%',
      accent: '270 25% 20%'
    }
  },
  {
    id: 'monokai',
    name: 'Monokai',
    description: 'Classic code editor theme',
    isDark: true,
    colors: {
      ...darkColors,
      background: '70 8% 15%',
      foreground: '60 30% 96%',
      card: '70 8% 17%',
      cardForeground: '60 30% 96%',
      popover: '70 8% 17%',
      popoverForeground: '60 30% 96%',
      secondary: '70 6% 22%',
      muted: '70 6% 22%',
      border: '70 6% 25%',
      input: '70 6% 25%',
      primary: '80 76% 53%',
      primaryForeground: '70 10% 10%',
      ring: '80 76% 53%',
      accent: '70 6% 25%',
      destructive: '0 93% 63%'
    }
  },
  {
    id: 'nord',
    name: 'Nord',
    description: 'Arctic, north-bluish theme',
    isDark: true,
    colors: {
      ...darkColors,
      background: '220 16% 22%',
      foreground: '219 28% 88%',
      card: '220 16% 24%',
      cardForeground: '219 28% 88%',
      popover: '220 16% 24%',
      popoverForeground: '219 28% 88%',
      secondary: '220 16% 28%',
      muted: '220 16% 28%',
      mutedForeground: '219 20% 65%',
      border: '220 16% 32%',
      input: '220 16% 32%',
      primary: '213 32% 52%',
      primaryForeground: '220 16% 98%',
      ring: '213 32% 52%',
      accent: '220 16% 32%'
    }
  },
  {
    id: 'dracula',
    name: 'Dracula',
    description: 'Popular dark theme with purple accents',
    isDark: true,
    colors: {
      ...darkColors,
      background: '231 15% 18%',
      foreground: '60 30% 96%',
      card: '232 14% 20%',
      cardForeground: '60 30% 96%',
      popover: '232 14% 20%',
      popoverForeground: '60 30% 96%',
      secondary: '232 14% 25%',
      muted: '232 14% 25%',
      mutedForeground: '228 8% 60%',
      border: '232 14% 28%',
      input: '232 14% 28%',
      primary: '265 89% 78%',
      primaryForeground: '232 14% 10%',
      ring: '265 89% 78%',
      accent: '232 14% 28%',
      productive: '135 94% 65%',
      destructive: '0 100% 67%'
    }
  }
];

/**
 * Get a theme by ID
 */
export function getThemeById(id: string): Theme | undefined {
  return themes.find(theme => theme.id === id);
}

/**
 * Get all available theme IDs
 */
export function getThemeIds(): string[] {
  return themes.map(theme => theme.id);
}

/**
 * Apply theme CSS variables to the document
 */
export function applyTheme(themeId: string): void {
  const theme = getThemeById(themeId);
  if (!theme) {
    console.warn(`Theme ${themeId} not found, using default dark theme`);
    return;
  }

  const root = document.documentElement;
  const colors = theme.colors;

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
  root.style.setProperty('--productive', colors.productive);
  root.style.setProperty('--productive-foreground', colors.productiveForeground);
  root.style.setProperty('--distraction', colors.distraction);
  root.style.setProperty('--distraction-foreground', colors.distractionForeground);
  root.style.setProperty('--warning', colors.warning);
  root.style.setProperty('--warning-foreground', colors.warningForeground);

  // Add/remove light class for proper rendering
  if (theme.isDark) {
    root.classList.remove('light');
  } else {
    root.classList.add('light');
  }
}

/**
 * Get system preferred color scheme
 */
export function getSystemTheme(): 'dark' | 'light' {
  if (typeof window !== 'undefined' && window.matchMedia) {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return 'dark';
}