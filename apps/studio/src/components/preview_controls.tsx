'use client'

import { motion } from 'motion/react'
import { useId } from 'react'
import { cn } from '@/lib/cn'
import { Segmented } from './ui/segmented'

export type PreviewBackground = 'auto' | 'light' | 'dark' | 'checker'

export const BACKGROUND_CLASSES: Record<PreviewBackground, string> = {
  auto: 'bg-zinc-50/80 text-zinc-900 dark:bg-white/[0.03] dark:text-zinc-100',
  light: 'bg-white text-zinc-900',
  dark: 'bg-zinc-950 text-zinc-100',
  checker: 'checkerboard text-zinc-900 dark:text-zinc-100',
}

const SWATCHES = ['', '#0091ff', '#8b5cf6', '#16a34a', '#f59e0b', '#ef4444']

interface PreviewControlsProps {
  size: number
  onSizeChange: (size: number) => void
  color: string
  onColorChange: (color: string) => void
  background: PreviewBackground
  onBackgroundChange: (background: PreviewBackground) => void
  className?: string
}

export function PreviewControls(props: PreviewControlsProps) {
  const ringId = useId()
  return (
    <div className={cn('flex flex-wrap items-center gap-x-5 gap-y-3 text-sm', props.className)}>
      <label className="flex items-center gap-3">
        <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Size</span>
        <input
          type="range"
          min={12}
          max={128}
          value={props.size}
          onChange={(event) => props.onSizeChange(Number(event.target.value))}
          className="h-1.5 w-28 cursor-pointer appearance-none rounded-full bg-zinc-200 accent-brand-500 dark:bg-white/10"
        />
        <span className="w-11 font-mono text-xs text-zinc-600 tabular-nums dark:text-zinc-300">
          {props.size}px
        </span>
      </label>

      <div className="flex items-center gap-1.5">
        <span className="mr-1.5 text-xs font-medium text-zinc-500 dark:text-zinc-400">Color</span>
        {SWATCHES.map((swatch) => {
          const active = props.color === swatch
          return (
            <motion.button
              key={swatch || 'auto'}
              type="button"
              aria-label={swatch ? `Use ${swatch}` : 'Use the text color'}
              title={swatch || 'Text color'}
              onClick={() => props.onColorChange(swatch)}
              whileHover={{ scale: 1.15 }}
              whileTap={{ scale: 0.9 }}
              className={cn(
                'relative size-5 rounded-full ring-1 ring-zinc-900/10 dark:ring-white/15',
                !swatch &&
                  'bg-[conic-gradient(from_45deg,#18181b_0_50%,#fafafa_0_100%)] dark:bg-[conic-gradient(from_45deg,#fafafa_0_50%,#18181b_0_100%)]'
              )}
              style={swatch ? { backgroundColor: swatch } : undefined}
            >
              {active && (
                <motion.span
                  layoutId={`swatch-ring-${ringId}`}
                  className="absolute -inset-1 rounded-full ring-2 ring-brand-500"
                />
              )}
            </motion.button>
          )
        })}
        <label
          className="relative ml-1 size-5 cursor-pointer overflow-hidden rounded-full bg-[conic-gradient(red,yellow,lime,cyan,blue,magenta,red)] ring-1 ring-zinc-900/10 dark:ring-white/15"
          title="Custom color"
        >
          <input
            type="color"
            value={props.color || '#18181b'}
            onChange={(event) => props.onColorChange(event.target.value)}
            className="absolute inset-0 cursor-pointer opacity-0"
            aria-label="Custom color"
          />
        </label>
      </div>

      <Segmented
        size="sm"
        value={props.background}
        onChange={props.onBackgroundChange}
        options={[
          { value: 'auto', label: 'Auto' },
          { value: 'light', label: 'Light' },
          { value: 'dark', label: 'Dark' },
          { value: 'checker', label: 'Grid' },
        ]}
      />
    </div>
  )
}
