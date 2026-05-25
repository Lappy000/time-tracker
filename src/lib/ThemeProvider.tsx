// time-tracker/src/lib/ThemeProvider.tsx
import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { applyTheme, getSystemTheme, getThemeById, themes, type Theme } from './themes';

interface IpcResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

interface ThemeContextType {
  theme: string;
  setTheme: (themeId: string) => Promise<void>;
  themes: Theme[];
  currentTheme: Theme | undefined;
  isLoading: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
  children: React.ReactNode;
  defaultTheme?: string;
}

export function ThemeProvider({ children, defaultTheme = 'dark' }: ThemeProviderProps) {
  const [theme, setThemeState] = useState<string>(defaultTheme);
  const [isLoading, setIsLoading] = useState(true);

  // Load saved theme on mount
  useEffect(() => {
    const loadTheme = async () => {
      try {
        if (window.electronAPI) {
          const result = await window.electronAPI.invoke<string>('themes:get-current') as IpcResult<string>;
          if (result.success && result.data) {
            let themeId = result.data;
            
            // Handle system theme
            if (themeId === 'system') {
              themeId = getSystemTheme();
            }
            
            setThemeState(themeId);
            applyTheme(themeId);
          } else {
            applyTheme(defaultTheme);
          }
        } else {
          applyTheme(defaultTheme);
        }
      } catch (error) {
        console.error('Failed to load theme:', error);
        applyTheme(defaultTheme);
      } finally {
        setIsLoading(false);
      }
    };

    loadTheme();
  }, [defaultTheme]);

  // Listen for system theme changes
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    const handleChange = async () => {
      try {
        if (window.electronAPI) {
          const result = await window.electronAPI.invoke<string>('themes:get-current') as IpcResult<string>;
          if (result.success && result.data === 'system') {
            const systemTheme = getSystemTheme();
            setThemeState(systemTheme);
            applyTheme(systemTheme);
          }
        }
      } catch (error) {
        console.error('Failed to handle system theme change:', error);
      }
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  const setTheme = useCallback(async (themeId: string) => {
    try {
      let appliedTheme = themeId;
      
      // Handle system theme
      if (themeId === 'system') {
        appliedTheme = getSystemTheme();
      }
      
      // Apply theme to UI
      setThemeState(appliedTheme);
      applyTheme(appliedTheme);
      
      // Save to backend
      if (window.electronAPI) {
        await window.electronAPI.invoke('themes:set-theme', themeId);
      }
    } catch (error) {
      console.error('Failed to set theme:', error);
    }
  }, []);

  const currentTheme = getThemeById(theme);

  return (
    <ThemeContext.Provider value={{
      theme,
      setTheme,
      themes,
      currentTheme,
      isLoading
    }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

// Export the themes array for convenience
export { themes };