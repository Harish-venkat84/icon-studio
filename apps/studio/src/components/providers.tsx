'use client'

import { MotionConfig } from 'motion/react'
import { createContext, useContext } from 'react'
import { ToastProvider } from './ui/toast'

const ReadOnlyContext = createContext(false)

/** True when the studio runs as a read-only demo (STUDIO_READ_ONLY=true). */
export function useReadOnly() {
  return useContext(ReadOnlyContext)
}

export function Providers({
  readOnly = false,
  children,
}: {
  readOnly?: boolean
  children: React.ReactNode
}) {
  return (
    <MotionConfig
      reducedMotion="user"
      transition={{ type: 'spring', bounce: 0.18, duration: 0.45 }}
    >
      <ReadOnlyContext value={readOnly}>
        <ToastProvider>{children}</ToastProvider>
      </ReadOnlyContext>
    </MotionConfig>
  )
}
