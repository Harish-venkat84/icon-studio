export type ThemePreference = 'light' | 'dark' | 'system'

export const THEME_STORAGE_KEY = 'icon-studio-theme'

export const themeInitScript = `(() => {
  try {
    const stored = localStorage.getItem('${THEME_STORAGE_KEY}')
    const dark = stored === 'dark' || (stored !== 'light' && matchMedia('(prefers-color-scheme: dark)').matches)
    document.documentElement.classList.toggle('dark', dark)
  } catch {}
})()`
