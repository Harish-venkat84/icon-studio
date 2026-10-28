'use client'

import { motion } from 'motion/react'

export function TopLoader() {
  return (
    <div
      className="fixed inset-x-0 top-0 z-[60] h-0.5 overflow-hidden"
      role="progressbar"
      aria-label="Loading"
    >
      <motion.div
        className="h-full w-1/3 rounded-full bg-gradient-to-r from-transparent via-brand-500 to-violet-500 shadow-[0_0_12px] shadow-brand-500/70"
        initial={{ x: '-100%' }}
        animate={{ x: '300%' }}
        transition={{ duration: 1.1, repeat: Infinity, ease: [0.65, 0, 0.35, 1] }}
      />
    </div>
  )
}
