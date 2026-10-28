'use client'

import { Monitor, Moon, Sun } from 'lucide-react'
import { useEffect, useState, useSyncExternalStore } from 'react'
import { THEME_STORAGE_KEY, type ThemePreference } from '@/lib/theme'
import { Segmented } from './ui/segmented'

function readPreference(): ThemePreference {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY)
    return stored === 'light' || stored === 'dark' ? stored : 'system'
  } catch {
    return 'system'
  }
}

function apply(preference: ThemePreference) {
  const dark =
    preference === 'dark' ||
    (preference === 'system' && matchMedia('(prefers-color-scheme: dark)').matches)
  document.documentElement.classList.toggle('dark', dark)
}

const subscribeNothing = () => () => {}

export function ThemeToggle() {
  const mounted = useSyncExternalStore(
    subscribeNothing,
    () => true,
    () => false
  )
  const [preference, setPreference] = useState<ThemePreference>(() =>
    typeof window === 'undefined' ? 'system' : readPreference()
  )

  useEffect(() => {
    if (preference !== 'system') return
    const media = matchMedia('(prefers-color-scheme: dark)')
    const onChange = () => apply('system')
    media.addEventListener('change', onChange)
    return () => media.removeEventListener('change', onChange)
  }, [preference])

  const choose = (next: ThemePreference) => {
    setPreference(next)
    try {
      if (next === 'system') localStorage.removeItem(THEME_STORAGE_KEY)
      else localStorage.setItem(THEME_STORAGE_KEY, next)
    } catch {}
    apply(next)
  }

  if (!mounted) return <div className="h-[34px] w-[100px]" />

  return (
    <Segmented
      size="sm"
      value={preference}
      onChange={choose}
      options={[
        { value: 'light', label: <Sun className="size-3.5" />, title: 'Light' },
        { value: 'system', label: <Monitor className="size-3.5" />, title: 'System' },
        { value: 'dark', label: <Moon className="size-3.5" />, title: 'Dark' },
      ]}
    />
  )
}
