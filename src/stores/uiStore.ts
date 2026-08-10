import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { applyDocumentTheme, type ThemeMode } from '@/theme';

function getSystemTheme(): ThemeMode {
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

interface UIState {
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;

  theme: ThemeMode;
  setTheme: (theme: ThemeMode) => void;
  toggleTheme: () => void;

  /** Table density preference */
  tableDensity: 'default' | 'middle' | 'small';
  setTableDensity: (density: 'default' | 'middle' | 'small') => void;

  editorTheme: ThemeMode;
  setEditorTheme: (theme: ThemeMode) => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set, get) => ({
      sidebarCollapsed: false,
      toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
      setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),

      theme: getSystemTheme(),
      setTheme: (theme) => {
        applyDocumentTheme(theme);
        set({ theme, editorTheme: theme });
      },
      toggleTheme: () => {
        const next = get().theme === 'dark' ? 'light' : 'dark';
        get().setTheme(next);
      },

      tableDensity: 'small',
      setTableDensity: (tableDensity) => set({ tableDensity }),

      editorTheme: getSystemTheme(),
      setEditorTheme: (editorTheme) => set({ editorTheme }),
    }),
    {
      name: 'ldw-ui',
      partialize: (state) => ({
        sidebarCollapsed: state.sidebarCollapsed,
        theme: state.theme,
        tableDensity: state.tableDensity,
        editorTheme: state.editorTheme,
      }),
      onRehydrateStorage: () => (state) => {
        if (state?.theme) {
          applyDocumentTheme(state.theme);
        } else {
          applyDocumentTheme(getSystemTheme());
        }
      },
    },
  ),
);

/** Call once at app boot (before first paint if possible) */
export function initUITheme(): void {
  const stored = localStorage.getItem('ldw-ui');
  if (stored) {
    try {
      const parsed = JSON.parse(stored) as { state?: { theme?: ThemeMode } };
      if (parsed.state?.theme) {
        applyDocumentTheme(parsed.state.theme);
        return;
      }
    } catch {
      /* fall through */
    }
  }
  applyDocumentTheme(getSystemTheme());
}
