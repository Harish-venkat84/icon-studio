'use client'

import { toComponentName, type IconMeta } from '@icon-studio/core/meta'
import type { IconNode } from '@icon-studio/core/render'
import { Check, Copy, Plus, Search, SearchX, TriangleAlert } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import Link from 'next/link'
import { useEffect, useMemo, useRef, useState } from 'react'
import { cn } from '@/lib/cn'
import { BACKGROUND_CLASSES, PreviewControls, type PreviewBackground } from './preview_controls'
import { SvgPreview } from './svg_preview'
import { Segmented } from './ui/segmented'
import { useToast } from './ui/toast'

export interface GalleryIcon {
  meta: IconMeta
  root: IconNode | null
  error?: string
}

type ModeFilter = 'all' | 'mono' | 'multi' | 'untagged'

export function Gallery({ icons }: { icons: GalleryIcon[] }) {
  const toast = useToast()
  const searchInput = useRef<HTMLInputElement>(null)
  const [query, setQuery] = useState('')
  const [mode, setMode] = useState<ModeFilter>('all')
  const [size, setSize] = useState(32)
  const [color, setColor] = useState('')
  const [background, setBackground] = useState<PreviewBackground>('auto')
  const [copied, setCopied] = useState<string | null>(null)

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const typing = (event.target as HTMLElement | null)?.closest('input, textarea')
      if (
        (event.key === 'k' && (event.metaKey || event.ctrlKey)) ||
        (event.key === '/' && !typing)
      ) {
        event.preventDefault()
        searchInput.current?.focus()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return icons.filter(({ meta }) => {
      if (mode === 'untagged' ? meta.tags.length > 0 : mode !== 'all' && meta.mode !== mode) {
        return false
      }
      if (!needle) return true
      return [meta.name, meta.slug, toComponentName(meta.slug), ...meta.tags].some((value) =>
        value.toLowerCase().includes(needle)
      )
    })
  }, [icons, query, mode])

  const copyImport = async (slug: string) => {
    const componentName = toComponentName(slug)
    await navigator.clipboard.writeText(`import { ${componentName} } from '@icon-studio/icons'`)
    setCopied(slug)
    toast(`Copied import for ${componentName}`)
    setTimeout(() => setCopied((current) => (current === slug ? null : current)), 1600)
  }

  if (icons.length === 0) return <EmptyLibrary />

  const counts = {
    all: icons.length,
    mono: icons.filter((icon) => icon.meta.mode === 'mono').length,
    multi: icons.filter((icon) => icon.meta.mode === 'multi').length,
    untagged: icons.filter((icon) => icon.meta.tags.length === 0).length,
  }

  return (
    <div className="space-y-6">
      <div className="surface z-30 flex flex-col gap-4 p-3 sm:p-4 lg:sticky lg:top-[76px] xl:flex-row xl:items-center xl:justify-between">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative sm:w-80">
            <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-zinc-400" />
            <input
              ref={searchInput}
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search icons, slugs, tags…"
              className="field pr-12 pl-10"
            />
            <kbd className="pointer-events-none absolute top-1/2 right-3 hidden -translate-y-1/2 rounded-md border border-zinc-200 bg-zinc-50 px-1.5 py-0.5 font-mono text-[10px] text-zinc-500 sm:block dark:border-white/10 dark:bg-white/5 dark:text-zinc-400">
              /
            </kbd>
          </div>
          <Segmented
            size="sm"
            value={mode}
            onChange={setMode}
            options={[
              {
                value: 'all',
                label: (
                  <>
                    All <Count value={counts.all} />
                  </>
                ),
              },
              {
                value: 'mono',
                label: (
                  <>
                    Single <Count value={counts.mono} />
                  </>
                ),
              },
              {
                value: 'multi',
                label: (
                  <>
                    Multi <Count value={counts.multi} />
                  </>
                ),
              },
              ...(counts.untagged > 0 || mode === 'untagged'
                ? [
                    {
                      value: 'untagged' as const,
                      label: (
                        <>
                          Untagged <Count value={counts.untagged} />
                        </>
                      ),
                    },
                  ]
                : []),
            ]}
          />
        </div>
        <PreviewControls
          size={size}
          onSizeChange={setSize}
          color={color}
          onColorChange={setColor}
          background={background}
          onBackgroundChange={setBackground}
        />
      </div>

      <motion.ul
        layout
        initial="hidden"
        animate="show"
        variants={{ hidden: {}, show: { transition: { staggerChildren: 0.035 } } }}
        className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6"
      >
        <AnimatePresence mode="popLayout">
          {filtered.map(({ meta, root, error }) => (
            <motion.li
              key={meta.slug}
              layout
              variants={{
                hidden: { opacity: 0, y: 16, scale: 0.96 },
                show: { opacity: 1, y: 0, scale: 1 },
              }}
              exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.15 } }}
              className="group relative"
            >
              <Link
                href={`/icons/${meta.slug}`}
                className="surface block overflow-hidden transition-[border-color,box-shadow,transform] duration-300 hover:-translate-y-1 hover:border-brand-500/40 hover:shadow-[0_18px_40px_-18px_rgb(0_145_255/0.45)] dark:hover:border-brand-400/40"
              >
                <div
                  className={cn(
                    'relative flex h-36 items-center justify-center overflow-hidden transition-colors',
                    BACKGROUND_CLASSES[background]
                  )}
                >
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgb(0_145_255/0.14),transparent_65%)] opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                  {root ? (
                    <motion.div
                      className="relative"
                      whileHover={{ scale: 1.12, rotate: -3 }}
                      transition={{ type: 'spring', stiffness: 400, damping: 18 }}
                    >
                      <SvgPreview
                        root={root}
                        iconStyle={meta}
                        options={{ size, color: color || undefined }}
                      />
                    </motion.div>
                  ) : (
                    <span className="flex flex-col items-center gap-1.5 px-3 text-center text-xs text-red-600 dark:text-red-400">
                      <TriangleAlert className="size-5" />
                      {error}
                    </span>
                  )}
                  {meta.mode === 'multi' && (
                    <span className="absolute bottom-2 left-2 rounded-full bg-gradient-to-r from-brand-500 via-violet-500 to-amber-500 px-1.5 py-0.5 text-[9px] font-semibold tracking-wide text-white uppercase">
                      Multi
                    </span>
                  )}
                </div>
                <div className="border-t border-zinc-200/70 px-3.5 py-3 dark:border-white/5">
                  <p className="truncate text-sm font-medium">{meta.name}</p>
                  <p className="truncate font-mono text-[11px] text-zinc-500 dark:text-zinc-400">
                    {toComponentName(meta.slug)}
                  </p>
                </div>
              </Link>
              <motion.button
                type="button"
                onClick={() => void copyImport(meta.slug)}
                whileTap={{ scale: 0.9 }}
                aria-label={`Copy import for ${meta.name}`}
                className="absolute top-2.5 right-2.5 grid size-8 place-items-center rounded-lg border border-zinc-200/80 bg-white/90 text-zinc-600 opacity-0 shadow-sm backdrop-blur transition group-hover:opacity-100 hover:text-brand-600 focus:opacity-100 dark:border-white/10 dark:bg-zinc-900/90 dark:text-zinc-300"
              >
                <AnimatePresence mode="wait" initial={false}>
                  <motion.span
                    key={copied === meta.slug ? 'done' : 'copy'}
                    initial={{ scale: 0.4, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.4, opacity: 0 }}
                    transition={{ duration: 0.15 }}
                  >
                    {copied === meta.slug ? (
                      <Check className="size-4 text-emerald-500" />
                    ) : (
                      <Copy className="size-4" />
                    )}
                  </motion.span>
                </AnimatePresence>
              </motion.button>
            </motion.li>
          ))}
        </AnimatePresence>
      </motion.ul>

      <AnimatePresence>
        {filtered.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center gap-3 py-16 text-center text-zinc-500 dark:text-zinc-400"
          >
            <SearchX className="size-8" />
            <p className="text-sm">
              Nothing matches{' '}
              <span className="font-medium text-zinc-800 dark:text-zinc-200">“{query}”</span>
            </p>
            <button
              type="button"
              onClick={() => {
                setQuery('')
                setMode('all')
              }}
              className="text-sm font-medium text-brand-600 hover:underline dark:text-brand-400"
            >
              Clear filters
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function Count({ value }: { value: number }) {
  return <span className="font-mono text-[10px] text-zinc-400 tabular-nums">{value}</span>
}

function EmptyLibrary() {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      className="surface flex flex-col items-center gap-5 px-6 py-20 text-center"
    >
      <motion.div
        animate={{ y: [0, -6, 0] }}
        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
        className="grid size-16 place-items-center rounded-2xl bg-gradient-to-br from-brand-400 to-violet-500 text-white shadow-lg shadow-brand-500/30"
      >
        <Plus className="size-7" />
      </motion.div>
      <div className="space-y-1">
        <p className="text-lg font-semibold">Your icon library is empty</p>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Upload an SVG and it becomes a React component on the next release.
        </p>
      </div>
      <Link
        href="/icons/new"
        className="rounded-xl bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
      >
        Upload the first icon
      </Link>
    </motion.div>
  )
}
