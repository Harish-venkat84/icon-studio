'use client'

import { toImageExportName, type ImageMeta } from '@icon-studio/core/image'
import { Check, Copy, ImagePlus, Search, SearchX } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import Link from 'next/link'
import { useEffect, useMemo, useRef, useState } from 'react'
import { cn } from '@/lib/cn'
import { formatBytes, imageUrl } from '@/lib/image_url'
import { BACKGROUND_CLASSES, type PreviewBackground } from './preview_controls'
import { Segmented } from './ui/segmented'
import { useToast } from './ui/toast'

export function ImageGallery({ images }: { images: ImageMeta[] }) {
  const toast = useToast()
  const searchInput = useRef<HTMLInputElement>(null)
  const [query, setQuery] = useState('')
  const [background, setBackground] = useState<PreviewBackground>('checker')
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
    if (!needle) return images
    return images.filter((image) =>
      [image.name, image.slug, toImageExportName(image.slug), image.alt, ...image.tags].some(
        (value) => value.toLowerCase().includes(needle)
      )
    )
  }, [images, query])

  const copyImport = async (slug: string) => {
    const exportName = toImageExportName(slug)
    await navigator.clipboard.writeText(`import { ${exportName} } from '@icon-studio/icons/images'`)
    setCopied(slug)
    toast(`Copied import for ${exportName}`)
    setTimeout(() => setCopied((current) => (current === slug ? null : current)), 1600)
  }

  if (images.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        className="surface flex flex-col items-center gap-5 px-6 py-20 text-center"
      >
        <motion.div
          animate={{ y: [0, -6, 0] }}
          transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
          className="grid size-16 place-items-center rounded-2xl bg-gradient-to-br from-emerald-400 to-brand-500 text-white shadow-lg shadow-brand-500/30"
        >
          <ImagePlus className="size-7" />
        </motion.div>
        <div className="space-y-1">
          <p className="text-lg font-semibold">No images yet</p>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Upload a PNG (up to 1 MB) and use it with next/image after the next release.
          </p>
        </div>
        <Link
          href="/images/new"
          className="rounded-xl bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          Upload the first image
        </Link>
      </motion.div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="surface z-30 flex flex-col gap-3 p-3 sm:flex-row sm:items-center sm:justify-between sm:p-4 lg:sticky lg:top-[76px]">
        <div className="relative sm:w-80">
          <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-zinc-400" />
          <input
            ref={searchInput}
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search images, slugs, tags…"
            className="field pr-12 pl-10"
          />
          <kbd className="pointer-events-none absolute top-1/2 right-3 hidden -translate-y-1/2 rounded-md border border-zinc-200 bg-zinc-50 px-1.5 py-0.5 font-mono text-[10px] text-zinc-500 sm:block dark:border-white/10 dark:bg-white/5 dark:text-zinc-400">
            /
          </kbd>
        </div>
        <Segmented
          size="sm"
          value={background}
          onChange={setBackground}
          options={[
            { value: 'checker', label: 'Grid' },
            { value: 'light', label: 'Light' },
            { value: 'dark', label: 'Dark' },
          ]}
        />
      </div>

      <motion.ul
        layout
        initial="hidden"
        animate="show"
        variants={{ hidden: {}, show: { transition: { staggerChildren: 0.04 } } }}
        className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
      >
        <AnimatePresence mode="popLayout">
          {filtered.map((image) => (
            <motion.li
              key={image.slug}
              layout
              variants={{
                hidden: { opacity: 0, y: 16, scale: 0.96 },
                show: { opacity: 1, y: 0, scale: 1 },
              }}
              exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.15 } }}
              className="group relative"
            >
              <Link
                href={`/images/${image.slug}`}
                className="surface block overflow-hidden transition-[border-color,box-shadow,transform] duration-300 hover:-translate-y-1 hover:border-brand-500/40 hover:shadow-[0_18px_40px_-18px_rgb(0_145_255/0.45)]"
              >
                <div
                  className={cn(
                    'relative flex h-48 items-center justify-center overflow-hidden p-6',
                    BACKGROUND_CLASSES[background]
                  )}
                >
                  {/* oxlint-disable-next-line nextjs/no-img-element -- studio previews come from the auth-protected API route */}
                  <img
                    src={imageUrl(image)}
                    alt={image.alt || image.name}
                    loading="lazy"
                    className="max-h-full max-w-full object-contain transition-transform duration-500 group-hover:scale-105"
                  />
                  <span className="absolute bottom-2 left-2 rounded-full bg-zinc-900/70 px-2 py-0.5 font-mono text-[10px] text-white backdrop-blur">
                    {image.width}×{image.height}
                  </span>
                </div>
                <div className="flex items-center gap-3 border-t border-zinc-200/70 px-3.5 py-3 dark:border-white/5">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{image.name}</p>
                    <p className="truncate font-mono text-[11px] text-zinc-500 dark:text-zinc-400">
                      {toImageExportName(image.slug)}
                    </p>
                  </div>
                  <span className="shrink-0 font-mono text-[11px] text-zinc-400">
                    {formatBytes(image.bytes)}
                  </span>
                </div>
              </Link>
              <motion.button
                type="button"
                onClick={() => void copyImport(image.slug)}
                whileTap={{ scale: 0.9 }}
                aria-label={`Copy import for ${image.name}`}
                className="absolute top-2.5 right-2.5 grid size-8 place-items-center rounded-lg border border-zinc-200/80 bg-white/90 text-zinc-600 opacity-0 shadow-sm backdrop-blur transition group-hover:opacity-100 hover:text-brand-600 focus:opacity-100 dark:border-white/10 dark:bg-zinc-900/90 dark:text-zinc-300"
              >
                {copied === image.slug ? (
                  <Check className="size-4 text-emerald-500" />
                ) : (
                  <Copy className="size-4" />
                )}
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
              onClick={() => setQuery('')}
              className="text-sm font-medium text-brand-600 hover:underline dark:text-brand-400"
            >
              Clear search
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
