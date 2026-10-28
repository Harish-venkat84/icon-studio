'use client'

import { CircleAlert } from 'lucide-react'
import { motion } from 'motion/react'
import { cn } from '@/lib/cn'

export function Section({
  step,
  icon,
  title,
  children,
}: {
  step: number
  icon: React.ReactNode
  title: string
  children: React.ReactNode
}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: step * 0.06 }}
      className="surface p-5"
    >
      <div className="mb-4 flex items-center gap-2.5">
        <span className="grid size-7 place-items-center rounded-lg bg-zinc-900/5 text-zinc-600 dark:bg-white/10 dark:text-zinc-300">
          {icon}
        </span>
        <h2 className="text-sm font-semibold">{title}</h2>
        <span className="ml-auto font-mono text-[10px] text-zinc-400">0{step}</span>
      </div>
      {children}
    </motion.section>
  )
}

export function Field({
  label,
  hint,
  children,
}: {
  label: string
  hint?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between gap-2">
        <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">{label}</label>
        {hint && <span className="text-[11px] text-zinc-500 dark:text-zinc-400">{hint}</span>}
      </div>
      {children}
    </div>
  )
}

export function Notice({
  tone,
  children,
}: {
  tone: 'error' | 'warning'
  children: React.ReactNode
}) {
  return (
    <motion.p
      initial={{ opacity: 0, height: 0, marginTop: 0 }}
      animate={{ opacity: 1, height: 'auto', marginTop: 12 }}
      exit={{ opacity: 0, height: 0, marginTop: 0 }}
      className={cn(
        'flex gap-2 overflow-hidden rounded-xl px-3 py-2.5 text-xs',
        tone === 'error'
          ? 'bg-red-500/10 text-red-700 dark:text-red-300'
          : 'bg-amber-500/10 text-amber-800 dark:text-amber-300'
      )}
    >
      <CircleAlert className="mt-px size-3.5 shrink-0" />
      <span>{children}</span>
    </motion.p>
  )
}

export function StatusLine({
  tone,
  text,
  more = 0,
}: {
  tone: 'error' | 'warning' | 'ready' | 'idle'
  text: string
  more?: number
}) {
  return (
    <motion.p
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      transition={{ duration: 0.15 }}
      className={cn(
        'flex items-center gap-2 truncate',
        tone === 'error' && 'text-red-600 dark:text-red-400',
        tone === 'warning' && 'text-amber-700 dark:text-amber-400',
        tone === 'ready' && 'text-emerald-700 dark:text-emerald-400',
        tone === 'idle' && 'text-zinc-500 dark:text-zinc-400'
      )}
    >
      <span
        className={cn(
          'size-2 shrink-0 rounded-full',
          tone === 'error' && 'bg-red-500',
          tone === 'warning' && 'bg-amber-500',
          tone === 'ready' && 'animate-pulse bg-emerald-500',
          tone === 'idle' && 'bg-zinc-400'
        )}
      />
      <span className="truncate">{text}</span>
      {more > 0 && <span className="shrink-0 text-zinc-400">+{more} more</span>}
    </motion.p>
  )
}
