import { useUIStore } from '@/stores/uiStore';
import type { ThemeMode } from '@/theme';

export interface UseThemeResult {
  theme: ThemeMode;
  isDark: boolean;
  setTheme: (theme: ThemeMode) => void;
  toggleTheme: () => void;
}

/**
 * Theme read/write — persists via uiStore (localStorage key: ldw-ui)
 *
 * @example
 * const { theme, isDark, toggleTheme } = useTheme();
 * <Button onClick={toggleTheme}>{isDark ? 'Light' : 'Dark'}</Button>
 */
export function useTheme(): UseThemeResult {
  const theme = useUIStore((s) => s.theme);
  const setTheme = useUIStore((s) => s.setTheme);
  const toggleTheme = useUIStore((s) => s.toggleTheme);

  return {
    theme,
    isDark: theme === 'dark',
    setTheme,
    toggleTheme,
  };
}

export default useTheme;
