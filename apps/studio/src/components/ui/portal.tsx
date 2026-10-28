'use client'

import { useSyncExternalStore } from 'react'
import { createPortal } from 'react-dom'

const subscribe = () => () => {}

export function Portal({ children }: { children: React.ReactNode }) {
  const mounted = useSyncExternalStore(
    subscribe,
    () => true,
    () => false
  )
  return mounted ? createPortal(children, document.body) : null
}
