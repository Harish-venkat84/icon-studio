'use client'

import { ArrowRight, CopyX } from 'lucide-react'
import { motion } from 'motion/react'
import Link from 'next/link'

interface DuplicateNoticeProps {
  kind: 'icon' | 'image'
  name: string
  slug: string
  preview: React.ReactNode
  onDismiss: () => void
}

export function DuplicateNotice({ kind, name, slug, preview, onDismiss }: DuplicateNoticeProps) {
  const href = kind === 'icon' ? `/icons/${slug}` : `/images/${slug}`
  return (
    <motion.div
      initial={{ opacity: 0, height: 0, marginTop: 0 }}
      animate={{ opacity: 1, height: 'auto', marginTop: 12 }}
      exit={{ opacity: 0, height: 0, marginTop: 0 }}
      className="overflow-hidden"
      role="alert"
    >
      <div className="flex items-center gap-3 rounded-xl border border-amber-300/60 bg-amber-50/80 p-3 dark:border-amber-400/20 dark:bg-amber-500/10">
        <motion.div
          initial={{ scale: 0.6, rotate: -8 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: 'spring', bounce: 0.5 }}
          className="checkerboard grid size-14 shrink-0 place-items-center overflow-hidden rounded-lg ring-1 ring-amber-300/60 dark:ring-amber-400/20"
        >
          {preview}
        </motion.div>
        <div className="min-w-0 flex-1 text-xs">
          <p className="flex items-center gap-1.5 font-semibold text-amber-800 dark:text-amber-300">
            <CopyX className="size-3.5 shrink-0" />
            Already in the library
          </p>
          <p className="mt-0.5 text-amber-700/90 dark:text-amber-200/80">
            This {kind === 'icon' ? 'SVG' : 'PNG'} is the same as <strong>{name}</strong>{' '}
            <code className="font-mono">({slug})</code>, so it can&apos;t be added twice.
          </p>
          <div className="mt-2 flex items-center gap-3">
            <Link
              href={href}
              className="inline-flex items-center gap-1 rounded-lg bg-amber-500 px-2.5 py-1 font-semibold text-white shadow-sm transition hover:bg-amber-600"
            >
              Open {name} <ArrowRight className="size-3" />
            </Link>
            <button
              type="button"
              onClick={onDismiss}
              className="font-medium text-amber-800 hover:underline dark:text-amber-300"
            >
              Use a different file
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  )
}
