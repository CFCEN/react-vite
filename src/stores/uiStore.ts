import { create } from 'zustand';

interface UIState {
  /** 侧边栏折叠 */
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;

  /** 主题模式 */
  theme: 'light' | 'dark';
  setTheme: (theme: 'light' | 'dark') => void;

  /** CodeMirror 编辑器主题 */
  editorTheme: 'light' | 'dark';
  setEditorTheme: (theme: 'light' | 'dark') => void;
}

export const useUIStore = create<UIState>((set) => ({
  sidebarCollapsed: false,
  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
  setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),

  theme: 'light',
  setTheme: (theme) => set({ theme }),

  editorTheme: 'light',
  setEditorTheme: (editorTheme) => set({ editorTheme }),
}));
