'use client'

import { MotionConfig } from 'motion/react'
import { ToastProvider } from './ui/toast'

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <MotionConfig
      reducedMotion="user"
      transition={{ type: 'spring', bounce: 0.18, duration: 0.45 }}
    >
      <ToastProvider>{children}</ToastProvider>
    </MotionConfig>
  )
}
