'use client'

import { MAX_PNG_BYTES, toImageExportName, type ImageMeta } from '@icon-studio/core/image'
import {
  formatName,
  MISSING_TAGS_MESSAGE,
  parseTags,
  slugify,
  SLUG_PATTERN,
} from '@icon-studio/core/meta'
import { imageUsage } from '@icon-studio/core/usage'
import { Check, ImageIcon, Layers, Maximize2, Trash2, Upload } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState, useTransition } from 'react'
import { checkImageAction, deleteImageAction, saveImageAction } from '@/app/actions'
import { cn } from '@/lib/cn'
import { formatBytes, imageUrl } from '@/lib/image_url'
import { BACKGROUND_CLASSES, type PreviewBackground } from './preview_controls'
import { ConfirmDialog } from './ui/confirm_dialog'
import { DuplicateNotice } from './ui/duplicate_notice'
import { Field, Notice, Section, StatusLine } from './ui/form'
import { Portal } from './ui/portal'
import { Segmented } from './ui/segmented'
import { Spinner } from './ui/spinner'
import { TagField } from './ui/tag_field'
import { UsagePanel } from './usage_panel'
import { useToast } from './ui/toast'

interface Upload {
  file: File
  url: string
  width: number
  height: number
}

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]

async function inspectPng(file: File): Promise<Upload> {
  if (file.size > MAX_PNG_BYTES) throw new Error('The PNG is larger than 1 MB')
  const head = new Uint8Array(await file.slice(0, 8).arrayBuffer())
  if (PNG_SIGNATURE.some((byte, index) => head[index] !== byte)) {
    throw new Error('This is not a PNG file')
  }
  const url = URL.createObjectURL(file)
  const size = await new Promise<{ width: number; height: number }>((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve({ width: image.naturalWidth, height: image.naturalHeight })
    image.onerror = () => reject(new Error('The PNG could not be decoded'))
    image.src = url
  }).catch((error: unknown) => {
    URL.revokeObjectURL(url)
    throw error
  })
  return { file, url, ...size }
}

export function ImageEditor({
  initial,
  knownTags = [],
}: {
  initial?: ImageMeta
  knownTags?: string[]
}) {
  const router = useRouter()
  const toast = useToast()
  const fileInput = useRef<HTMLInputElement>(null)
  const isEdit = Boolean(initial)

  const [upload, setUpload] = useState<Upload | null>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [inspecting, setInspecting] = useState(false)
  const [duplicate, setDuplicate] = useState<{
    slug: string
    name: string
    updatedAt?: string
  } | null>(null)
  const [dragging, setDragging] = useState(false)
  const [name, setName] = useState(initial?.name ?? '')
  const [slug, setSlug] = useState(initial?.slug ?? '')
  const [slugTouched, setSlugTouched] = useState(isEdit)
  const [tags, setTags] = useState(initial?.tags.join(', ') ?? '')
  const [alt, setAlt] = useState(initial?.alt ?? '')
  const [background, setBackground] = useState<PreviewBackground>('checker')
  const [zoom, setZoom] = useState<'fit' | 'actual'>('fit')
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saving, startSaving] = useTransition()
  const [deleting, startDeleting] = useTransition()

  useEffect(() => {
    if (!upload) return
    return () => URL.revokeObjectURL(upload.url)
  }, [upload])

  const loadFile = async (file: File | undefined) => {
    if (!file) return
    setInspecting(true)
    setUploadError(null)
    try {
      const inspected = await inspectPng(file)
      const form = new FormData()
      form.set('file', file)
      if (initial) form.set('exceptSlug', initial.slug)
      const check = await checkImageAction(form)
      setDuplicate(check.ok ? check.data.duplicate : null)
      setUpload(inspected)
      if (!name) {
        const pretty = formatName(file.name.replace(/\.png$/i, ''))
        setName(pretty)
        if (!slugTouched) setSlug(slugify(pretty))
      }
    } catch (error) {
      setUploadError((error as Error).message)
    } finally {
      setInspecting(false)
    }
  }

  const preview = upload
    ? { url: upload.url, width: upload.width, height: upload.height, bytes: upload.file.size }
    : initial
      ? {
          url: imageUrl(initial),
          width: initial.width,
          height: initial.height,
          bytes: initial.bytes,
        }
      : null

  const slugValid = SLUG_PATTERN.test(slug)
  const exportName = slugValid ? toImageExportName(slug) : null
  const renamed = isEdit && initial?.slug !== slug
  const busy = saving || deleting || inspecting
  const problem = !preview
    ? null
    : !name.trim()
      ? 'Give the image a name'
      : !slugValid
        ? 'The slug must be kebab-case: lowercase letters, numbers and dashes'
        : parseTags(tags).length === 0
          ? MISSING_TAGS_MESSAGE
          : null
  const changed =
    !initial ||
    Boolean(upload) ||
    formatName(name) !== initial.name ||
    slug !== initial.slug ||
    alt.trim() !== initial.alt ||
    parseTags(tags).join(',') !== initial.tags.join(',')
  const canSave = Boolean(preview) && !problem && !busy && changed && !duplicate

  const save = () => {
    if (!canSave) return
    setSaveError(null)
    const form = new FormData()
    form.set('name', formatName(name))
    form.set('slug', slug)
    form.set('alt', alt)
    form.set('tags', tags)
    if (initial) form.set('previousSlug', initial.slug)
    if (upload) form.set('file', upload.file)
    startSaving(async () => {
      const response = await saveImageAction(form)
      if (!response.ok) {
        setSaveError(response.error)
        toast(response.error, 'error')
        return
      }
      toast(isEdit ? `Saved ${formatName(name)}` : `Added ${formatName(name)} to the images`)
      router.push(`/images/${response.data.slug}`)
      router.refresh()
    })
  }

  const saveRef = useRef(save)
  useEffect(() => {
    saveRef.current = save
  })
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 's' && (event.metaKey || event.ctrlKey)) {
        event.preventDefault()
        saveRef.current()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const remove = () => {
    if (!initial) return
    startDeleting(async () => {
      const response = await deleteImageAction(initial.slug)
      if (!response.ok) {
        setConfirmDelete(false)
        toast(response.error, 'error')
        return
      }
      toast(`Deleted ${initial.name}`)
      router.push('/images')
      router.refresh()
    })
  }

  const guideMeta = preview
    ? {
        name: name || 'Image',
        slug: slugValid ? slug : 'my-image',
        alt,
        width: preview.width,
        height: preview.height,
        bytes: preview.bytes,
      }
    : null

  return (
    <div className="pb-28">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,440px)_minmax(0,1fr)]">
        <div className="space-y-5">
          <Section step={1} icon={<Upload className="size-4" />} title="PNG file">
            <motion.div
              onDragOver={(event) => {
                event.preventDefault()
                setDragging(true)
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={(event) => {
                event.preventDefault()
                setDragging(false)
                void loadFile(event.dataTransfer.files[0])
              }}
              onClick={() => fileInput.current?.click()}
              animate={{ scale: dragging ? 1.02 : 1 }}
              className={cn(
                'relative flex cursor-pointer flex-col items-center justify-center gap-3 overflow-hidden rounded-xl border-2 border-dashed px-4 py-7 text-center text-sm transition-colors',
                dragging
                  ? 'border-emerald-500 bg-emerald-500/5'
                  : 'border-zinc-200 hover:border-emerald-400/60 hover:bg-emerald-500/[0.03] dark:border-white/10 dark:hover:border-emerald-400/40'
              )}
            >
              <motion.span
                animate={dragging ? { y: [0, -6, 0] } : { y: 0 }}
                transition={dragging ? { duration: 0.8, repeat: Infinity } : {}}
                className="grid size-11 place-items-center rounded-xl bg-gradient-to-br from-emerald-400 to-brand-500 text-white shadow-lg shadow-emerald-500/25"
              >
                {inspecting ? <Spinner className="size-5" /> : <ImageIcon className="size-5" />}
              </motion.span>
              <span className="font-medium">
                {dragging
                  ? 'Drop the PNG'
                  : preview
                    ? 'Drop a new PNG to replace it'
                    : 'Drop a PNG here, or click to browse'}
              </span>
              <span className="text-xs text-zinc-500 dark:text-zinc-400">
                PNG only · up to 1 MB · up to 8192 px
              </span>
              <input
                ref={fileInput}
                type="file"
                accept="image/png,.png"
                className="hidden"
                onChange={(event) => {
                  void loadFile(event.target.files?.[0])
                  event.target.value = ''
                }}
              />
            </motion.div>
            <AnimatePresence mode="wait" initial={false}>
              {uploadError ? (
                <Notice key="error" tone="error">
                  {uploadError}
                </Notice>
              ) : upload ? (
                <motion.p
                  key={upload.url}
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="mt-3 flex items-center gap-1.5 truncate text-xs text-zinc-500 dark:text-zinc-400"
                >
                  <Check className="size-3.5 shrink-0 text-emerald-500" />
                  <span className="truncate">
                    {upload.file.name} · {upload.width}×{upload.height} ·{' '}
                    {formatBytes(upload.file.size)}
                  </span>
                </motion.p>
              ) : null}
            </AnimatePresence>
            <AnimatePresence>
              {duplicate && (
                <DuplicateNotice
                  kind="image"
                  name={duplicate.name}
                  slug={duplicate.slug}
                  preview={
                    // oxlint-disable-next-line nextjs/no-img-element -- auth-protected studio route
                    <img
                      src={imageUrl(duplicate)}
                      alt={duplicate.name}
                      className="max-h-full max-w-full object-contain"
                    />
                  }
                  onDismiss={() => {
                    setDuplicate(null)
                    setUpload(null)
                    fileInput.current?.click()
                  }}
                />
              )}
            </AnimatePresence>
          </Section>

          <Section step={2} icon={<Layers className="size-4" />} title="Details">
            <div className="space-y-4">
              <Field label="Name">
                <input
                  value={name}
                  onChange={(event) => {
                    setName(event.target.value)
                    if (!slugTouched) setSlug(slugify(event.target.value))
                  }}
                  onBlur={() => setName(formatName(name))}
                  placeholder="Company logo"
                  className="field"
                />
              </Field>
              <Field
                label="Slug"
                hint={
                  exportName ? (
                    <code className="rounded-md bg-emerald-500/10 px-1.5 py-0.5 font-mono text-[11px] text-emerald-700 dark:text-emerald-300">
                      {exportName}
                    </code>
                  ) : (
                    'kebab-case, unique'
                  )
                }
              >
                <input
                  value={slug}
                  onChange={(event) => {
                    setSlugTouched(true)
                    setSlug(event.target.value.toLowerCase())
                  }}
                  placeholder="company-logo"
                  className="field font-mono"
                />
                <AnimatePresence>
                  {renamed && initial && (
                    <Notice tone="warning">
                      Renaming changes the export. Apps importing{' '}
                      <code className="font-mono">{toImageExportName(initial.slug)}</code> must be
                      updated.
                    </Notice>
                  )}
                </AnimatePresence>
              </Field>
              <Field label="Alt text" hint="suggested description for apps">
                <input
                  value={alt}
                  onChange={(event) => setAlt(event.target.value)}
                  placeholder="Acme Inc. logo"
                  className="field"
                />
              </Field>
              <Field label="Tags" hint="comma separated, at least one">
                <TagField
                  value={tags}
                  onChange={setTags}
                  suggestions={knownTags}
                  placeholder="token, crypto"
                />
              </Field>
            </div>
          </Section>
        </div>

        <div className="min-w-0 space-y-5 lg:sticky lg:top-[88px] lg:self-start">
          <div className="surface overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-200/70 p-4 dark:border-white/5">
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
              <Segmented
                size="sm"
                value={zoom}
                onChange={setZoom}
                options={[
                  { value: 'fit', label: 'Fit' },
                  {
                    value: 'actual',
                    label: (
                      <>
                        <Maximize2 className="size-3" /> 1:1
                      </>
                    ),
                  },
                ]}
              />
            </div>
            <div
              className={cn(
                'relative flex min-h-96 items-center justify-center overflow-auto p-6 transition-colors duration-300',
                BACKGROUND_CLASSES[background]
              )}
            >
              <AnimatePresence mode="wait">
                {preview ? (
                  <motion.img
                    key={preview.url}
                    src={preview.url}
                    alt={alt || name || 'Preview'}
                    initial={{ opacity: 0, scale: 0.9, filter: 'blur(8px)' }}
                    animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ type: 'spring', bounce: 0.3, duration: 0.5 }}
                    style={
                      zoom === 'actual'
                        ? { width: preview.width, height: preview.height }
                        : undefined
                    }
                    className={cn(
                      zoom === 'fit' && 'max-h-[28rem] max-w-full object-contain',
                      'shadow-sm'
                    )}
                  />
                ) : (
                  <motion.div
                    key="empty"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex flex-col items-center gap-3 text-sm text-zinc-400"
                  >
                    {inspecting ? (
                      <>
                        <Spinner className="size-6 text-emerald-500" />
                        Reading the PNG…
                      </>
                    ) : (
                      <>
                        <div className="grid size-16 place-items-center rounded-2xl border-2 border-dashed border-current opacity-50">
                          <ImageIcon className="size-6" />
                        </div>
                        Your preview appears here
                      </>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            <AnimatePresence>
              {preview && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="grid grid-cols-3 divide-x divide-zinc-200/70 overflow-hidden border-t border-zinc-200/70 text-center dark:divide-white/5 dark:border-white/5"
                >
                  <Stat label="Dimensions" value={`${preview.width} × ${preview.height}`} />
                  <Stat label="File size" value={formatBytes(preview.bytes)} />
                  <Stat label="Export" value={exportName ?? '—'} mono />
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {guideMeta && (
            <UsagePanel
              guides={{
                web: imageUsage(guideMeta, 'web'),
                native: imageUsage(guideMeta, 'native'),
              }}
            />
          )}
        </div>
      </div>

      <Portal>
        <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 px-4 pb-5">
          <motion.div
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ type: 'spring', bounce: 0.3, delay: 0.15 }}
            className="surface pointer-events-auto mx-auto flex max-w-3xl flex-wrap items-center gap-3 rounded-2xl px-4 py-3 shadow-2xl"
          >
            <div className="min-w-0 flex-1 text-xs">
              <AnimatePresence mode="wait" initial={false}>
                {saveError ? (
                  <StatusLine key="err" tone="error" text={saveError} />
                ) : duplicate ? (
                  <StatusLine
                    key="duplicate"
                    tone="error"
                    text={`Same PNG as ${duplicate.name}. Upload a different file`}
                  />
                ) : problem ? (
                  <StatusLine key="problem" tone="warning" text={problem} />
                ) : !preview ? (
                  <StatusLine key="idle" tone="idle" text="Upload a PNG and give it a name" />
                ) : !changed ? (
                  <StatusLine key="clean" tone="idle" text="No unsaved changes" />
                ) : (
                  <StatusLine
                    key="ready"
                    tone="ready"
                    text={`Ready to ${isEdit ? 'save' : 'add'} ${exportName}`}
                  />
                )}
              </AnimatePresence>
            </div>
            {isEdit && (
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                disabled={busy}
                className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-medium text-red-600 transition hover:bg-red-500/10 disabled:opacity-40 dark:text-red-400"
              >
                <Trash2 className="size-4" />
                Delete
              </button>
            )}
            <motion.button
              type="button"
              onClick={save}
              disabled={!canSave}
              whileTap={canSave ? { scale: 0.96 } : undefined}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-brand-500 px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-emerald-500/25 transition disabled:cursor-not-allowed disabled:from-zinc-300 disabled:to-zinc-300 disabled:shadow-none dark:disabled:from-zinc-700 dark:disabled:to-zinc-700"
            >
              {saving && <Spinner />}
              {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Add image'}
            </motion.button>
          </motion.div>
        </div>
      </Portal>

      <ConfirmDialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={remove}
        pending={deleting}
        tone="danger"
        title={`Delete ${initial?.name ?? 'image'}?`}
        description={
          <>
            <code className="font-mono">{initial ? toImageExportName(initial.slug) : ''}</code>{' '}
            disappears from the package on the next release, and apps that import it will stop
            building.
          </>
        }
        confirmLabel="Delete image"
      />
    </div>
  )
}

function Stat({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="px-3 py-3">
      <p className="text-[10px] font-medium tracking-wide text-zinc-400 uppercase">{label}</p>
      <p className={cn('mt-0.5 truncate text-sm font-medium', mono && 'font-mono text-xs')}>
        {value}
      </p>
    </div>
  )
}
