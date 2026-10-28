'use client'

import { generateComponent, generateNativeComponent } from '@icon-studio/core/codegen'
import {
  COLOR_PROP_PATTERN,
  formatName,
  iconMetaSchema,
  MISSING_TAGS_MESSAGE,
  parseTags,
  slugify,
  SLUG_PATTERN,
  STANDARD_ICON_SIZE,
  toComponentName,
  type IconMeta,
  type IconMetaInput,
} from '@icon-studio/core/meta'
import type { IconNode } from '@icon-studio/core/render'
import { iconUsage } from '@icon-studio/core/usage'
import {
  Check,
  Code2,
  Copy,
  FileCode2,
  Layers,
  Palette,
  Smartphone,
  Trash2,
  Upload,
} from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState, useTransition } from 'react'
import { deleteIconAction, processSvgAction, saveIconAction } from '@/app/actions'
import { cn } from '@/lib/cn'
import { BACKGROUND_CLASSES, PreviewControls, type PreviewBackground } from './preview_controls'
import { SvgPreview } from './svg_preview'
import { highlightTsx } from './ui/code_block'
import { UsagePanel } from './usage_panel'
import { ConfirmDialog } from './ui/confirm_dialog'
import { Segmented } from './ui/segmented'
import { Portal } from './ui/portal'
import { DuplicateNotice } from './ui/duplicate_notice'
import { useReadOnly } from './providers'
import { Field, Notice, Section, StatusLine } from './ui/form'
import { Spinner } from './ui/spinner'
import { TagField } from './ui/tag_field'
import { useToast } from './ui/toast'

const MAX_UPLOAD_BYTES = 256 * 1024
const PREVIEW_SIZES = [16, 20, 24, 32, 48]

interface IconEditorProps {
  initial?: { meta: IconMeta; svg: string }
  knownTags?: string[]
}

interface Processed {
  root: IconNode
  colors: string[]
  bytes: number
  duplicate: { slug: string; name: string } | null
}

export function IconEditor({ initial, knownTags = [] }: IconEditorProps) {
  const router = useRouter()
  const toast = useToast()
  const fileInput = useRef<HTMLInputElement>(null)
  const isEdit = Boolean(initial)

  const [raw, setRaw] = useState(initial?.svg ?? '')
  const [showSource, setShowSource] = useState(false)
  const [dragging, setDragging] = useState(false)
  const [result, setResult] = useState<{
    raw: string
    processed: Processed | null
    error: string | null
  }>({ raw: '', processed: null, error: null })
  const hasSource = raw.trim() !== ''
  const processing = hasSource && result.raw !== raw
  const processed = hasSource ? result.processed : null
  const svgError = hasSource ? result.error : null
  const setSvgError = (error: string) => setResult({ raw, processed: null, error })

  const [name, setName] = useState(initial?.meta.name ?? '')
  const [slug, setSlug] = useState(initial?.meta.slug ?? '')
  const [slugTouched, setSlugTouched] = useState(isEdit)
  const [tags, setTags] = useState(initial?.meta.tags.join(', ') ?? '')
  const [defaultSize, setDefaultSize] = useState(initial?.meta.defaults.size ?? STANDARD_ICON_SIZE)
  const [mode, setMode] = useState<'mono' | 'multi'>(initial?.meta.mode ?? 'mono')
  const [defaultColor, setDefaultColor] = useState(initial?.meta.defaults.color ?? '')
  const [propNames, setPropNames] = useState<Record<string, string>>(() =>
    Object.fromEntries((initial?.meta.colorProps ?? []).map((prop) => [prop.value, prop.name]))
  )

  const [previewSize, setPreviewSize] = useState(96)
  const [previewColor, setPreviewColor] = useState('')
  const [background, setBackground] = useState<PreviewBackground>('auto')
  const [colorValues, setColorValues] = useState<Record<string, string>>({})
  const [tab, setTab] = useState<'component' | 'native'>('component')
  const [copiedCode, setCopiedCode] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const [saveError, setSaveError] = useState<string | null>(null)
  const [saving, startSaving] = useTransition()
  const [deleting, startDeleting] = useTransition()

  const ownSlug = initial?.meta.slug
  useEffect(() => {
    if (!raw.trim()) return
    let cancelled = false
    const timer = setTimeout(async () => {
      const response = await processSvgAction(raw, ownSlug)
      if (cancelled) return
      setResult(
        response.ok
          ? { raw, processed: response.data, error: null }
          : { raw, processed: null, error: response.error }
      )
    }, 250)
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [raw, ownSlug])

  const detectedColors = processed?.colors ?? []
  const colorProps = detectedColors
    .filter((color) => mode === 'multi' && propNames[color]?.trim())
    .map((color) => ({ name: propNames[color]!.trim(), value: color }))

  const metaInput: IconMetaInput = {
    name: formatName(name),
    slug,
    tags: parseTags(tags),
    mode,
    defaults: { size: defaultSize, ...(defaultColor ? { color: defaultColor } : {}) },
    colorProps,
  }
  const validation = iconMetaSchema.safeParse(metaInput)
  const missingTags = metaInput.tags!.length === 0
  const issues = [
    ...(validation.success
      ? []
      : validation.error.issues.map(
          (issue) => `${issue.path.join('.') || 'icon'}: ${issue.message}`
        )),
    ...(missingTags ? [`tags: ${MISSING_TAGS_MESSAGE}`] : []),
  ]

  const previewParse = iconMetaSchema.safeParse({
    ...metaInput,
    name: metaInput.name || 'Untitled',
    slug: SLUG_PATTERN.test(slug) ? slug : 'untitled',
    colorProps: colorProps.filter((prop) => COLOR_PROP_PATTERN.test(prop.name)),
  })
  const previewMeta = previewParse.success ? previewParse.data : null

  const code =
    processed && previewMeta
      ? tab === 'component'
        ? generateComponent(processed.root, previewMeta)
        : generateNativeComponent(processed.root, previewMeta).code
      : ''

  const loadFile = async (file: File | undefined) => {
    if (!file) return
    if (file.size > MAX_UPLOAD_BYTES) {
      setSvgError(`The file is larger than ${MAX_UPLOAD_BYTES / 1024} KB`)
      return
    }
    setRaw(await file.text())
    if (!name) {
      const pretty = formatName(file.name.replace(/\.svg$/i, ''))
      setName(pretty)
      if (!slugTouched) setSlug(slugify(pretty))
    }
  }

  const onNameChange = (value: string) => {
    setName(value)
    if (!slugTouched) setSlug(slugify(value))
  }

  const renamed = isEdit && initial?.meta.slug !== slug
  const readOnly = useReadOnly()
  const busy = saving || deleting
  const duplicate = processed?.duplicate ?? null
  const canSave =
    !readOnly &&
    Boolean(processed) &&
    validation.success &&
    !missingTags &&
    !busy &&
    !processing &&
    !duplicate

  const save = () => {
    if (!canSave) return
    setSaveError(null)
    startSaving(async () => {
      const response = await saveIconAction({
        raw,
        meta: metaInput,
        previousSlug: initial?.meta.slug,
      })
      if (!response.ok) {
        setSaveError(response.error)
        toast(response.error, 'error')
        return
      }
      toast(isEdit ? `Saved ${metaInput.name}` : `Added ${metaInput.name} to the library`)
      router.push(`/icons/${response.data.slug}`)
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
      const response = await deleteIconAction(initial.meta.slug)
      if (!response.ok) {
        setConfirmDelete(false)
        setSaveError(response.error)
        toast(response.error, 'error')
        return
      }
      toast(`Deleted ${initial.meta.name}`)
      router.push('/')
      router.refresh()
    })
  }

  const copyCode = async () => {
    await navigator.clipboard.writeText(code)
    setCopiedCode(true)
    setTimeout(() => setCopiedCode(false), 1500)
  }

  const renderOptions = { size: previewSize, color: previewColor || undefined, colorValues }
  const previewKey = `${result.raw.length}-${mode}`

  return (
    <div className="pb-28">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,440px)_minmax(0,1fr)]">
        <div className="space-y-5">
          <Section step={1} icon={<Upload className="size-4" />} title="SVG file">
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
                  ? 'border-brand-500 bg-brand-500/5'
                  : 'border-zinc-200 hover:border-brand-400/60 hover:bg-brand-500/[0.03] dark:border-white/10 dark:hover:border-brand-400/40'
              )}
            >
              <motion.span
                animate={dragging ? { y: [0, -6, 0] } : { y: 0 }}
                transition={dragging ? { duration: 0.8, repeat: Infinity } : {}}
                className="grid size-11 place-items-center rounded-xl bg-gradient-to-br from-brand-400 to-violet-500 text-white shadow-lg shadow-brand-500/25"
              >
                {processing ? <Spinner className="size-5" /> : <Upload className="size-5" />}
              </motion.span>
              <span className="font-medium">
                {dragging
                  ? 'Drop it like it’s hot'
                  : raw
                    ? 'Drop a new SVG to replace it'
                    : 'Drop an SVG here, or click to browse'}
              </span>
              <span className="text-xs text-zinc-500 dark:text-zinc-400">
                Up to 256 KB · scripts, event handlers and external links are removed
              </span>
              <input
                ref={fileInput}
                type="file"
                accept=".svg,image/svg+xml"
                className="hidden"
                onChange={(event) => {
                  void loadFile(event.target.files?.[0])
                  event.target.value = ''
                }}
              />
            </motion.div>

            <button
              type="button"
              onClick={() => setShowSource((value) => !value)}
              className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white"
            >
              <FileCode2 className="size-3.5" />
              {showSource ? 'Hide markup' : 'Paste or edit markup'}
            </button>
            <AnimatePresence initial={false}>
              {showSource && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <textarea
                    value={raw}
                    onChange={(event) => setRaw(event.target.value)}
                    spellCheck={false}
                    rows={8}
                    placeholder="<svg ...>...</svg>"
                    className="field code-scroll mt-2 font-mono text-xs"
                  />
                </motion.div>
              )}
            </AnimatePresence>

            <AnimatePresence mode="wait" initial={false}>
              {svgError ? (
                <Notice key="error" tone="error">
                  {svgError}
                </Notice>
              ) : processed ? (
                <motion.p
                  key="ok"
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="mt-3 flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400"
                >
                  <Check className="size-3.5 text-emerald-500" />
                  Optimized to {(processed.bytes / 1024).toFixed(1)} KB ·{' '}
                  {detectedColors.length || 'no'} color{detectedColors.length === 1 ? '' : 's'}{' '}
                  found
                </motion.p>
              ) : null}
            </AnimatePresence>
            <AnimatePresence>
              {duplicate && processed && (
                <DuplicateNotice
                  kind="icon"
                  name={duplicate.name}
                  slug={duplicate.slug}
                  preview={
                    <SvgPreview
                      root={processed.root}
                      iconStyle={{ mode: 'multi', colorProps: [], defaults: { size: 36 } }}
                      className="text-zinc-900"
                    />
                  }
                  onDismiss={() => {
                    setRaw(initial?.svg ?? '')
                    fileInput.current?.click()
                  }}
                />
              )}
            </AnimatePresence>
          </Section>

          <Section step={2} icon={<Layers className="size-4" />} title="Identity">
            <div className="space-y-4">
              <Field label="Name">
                <input
                  value={name}
                  onChange={(event) => onNameChange(event.target.value)}
                  onBlur={() => setName(formatName(name))}
                  placeholder="Credit card"
                  className="field"
                />
              </Field>
              <Field
                label="Slug"
                hint={
                  SLUG_PATTERN.test(slug) ? (
                    <code className="rounded-md bg-brand-500/10 px-1.5 py-0.5 font-mono text-[11px] text-brand-700 dark:text-brand-300">
                      {toComponentName(slug)}
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
                  placeholder="credit-card"
                  className="field font-mono"
                />
                <AnimatePresence>
                  {renamed && (
                    <Notice tone="warning">
                      Renaming changes the component name. Apps importing{' '}
                      <code className="font-mono">{toComponentName(initial!.meta.slug)}</code> must
                      be updated.
                    </Notice>
                  )}
                </AnimatePresence>
              </Field>
              <div className="grid grid-cols-[1fr_7rem] gap-3">
                <Field label="Tags" hint="comma separated, at least one">
                  <TagField
                    value={tags}
                    onChange={setTags}
                    suggestions={knownTags}
                    placeholder="sidebar, payment"
                  />
                </Field>
                <Field label="Default size">
                  <div className="relative">
                    <input
                      type="number"
                      min={1}
                      max={1024}
                      value={defaultSize}
                      onChange={(event) => setDefaultSize(Number(event.target.value))}
                      className="field pr-9"
                    />
                    <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-xs text-zinc-400">
                      px
                    </span>
                  </div>
                </Field>
              </div>
              <AnimatePresence>
                {defaultSize !== STANDARD_ICON_SIZE && (
                  <Notice tone="warning">
                    Most icons default to {STANDARD_ICON_SIZE} px. Keep {STANDARD_ICON_SIZE} unless
                    this artwork is drawn on a different grid; apps can still pass{' '}
                    <code className="font-mono">size</code>.
                  </Notice>
                )}
              </AnimatePresence>
            </div>
          </Section>

          <Section step={3} icon={<Palette className="size-4" />} title="Colors">
            <Segmented
              className="w-full [&>button]:flex-1"
              value={mode}
              onChange={setMode}
              options={[
                { value: 'mono', label: 'Single color' },
                { value: 'multi', label: 'Keep original colors' },
              ]}
            />
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={mode}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.18 }}
                className="mt-4 space-y-3"
              >
                {mode === 'mono' ? (
                  <>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      Every color becomes <code className="font-mono">currentColor</code>, so the
                      icon follows <code className="font-mono">text-*</code> classes or the{' '}
                      <code className="font-mono">color</code> prop.
                    </p>
                    <Field label="Default color" hint="optional">
                      <div className="flex items-center gap-2">
                        <label className="relative size-10 shrink-0 cursor-pointer overflow-hidden rounded-xl ring-1 ring-zinc-200 dark:ring-white/10">
                          <span
                            className="absolute inset-0"
                            style={{
                              background:
                                defaultColor ||
                                'repeating-linear-gradient(45deg,#e4e4e7 0 4px,transparent 4px 8px)',
                            }}
                          />
                          <input
                            type="color"
                            value={defaultColor || '#000000'}
                            onChange={(event) => setDefaultColor(event.target.value)}
                            className="absolute inset-0 cursor-pointer opacity-0"
                          />
                        </label>
                        <input
                          value={defaultColor}
                          onChange={(event) => setDefaultColor(event.target.value)}
                          placeholder="inherits the text color"
                          className="field font-mono"
                        />
                      </div>
                    </Field>
                  </>
                ) : (
                  <>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      For logos and illustrations. Name a color (ending in{' '}
                      <code className="font-mono">Color</code>) to let apps override it.
                    </p>
                    {detectedColors.length === 0 && (
                      <p className="text-xs text-zinc-400">Upload an SVG to see its colors.</p>
                    )}
                    <motion.ul
                      initial="hidden"
                      animate="show"
                      variants={{ hidden: {}, show: { transition: { staggerChildren: 0.05 } } }}
                      className="space-y-2"
                    >
                      {detectedColors.map((color) => (
                        <motion.li
                          key={color}
                          variants={{ hidden: { opacity: 0, x: -8 }, show: { opacity: 1, x: 0 } }}
                          className="flex items-center gap-2.5"
                        >
                          <span
                            className="size-9 shrink-0 rounded-xl ring-1 ring-zinc-900/10 dark:ring-white/10"
                            style={{ backgroundColor: color }}
                          />
                          <code className="w-[4.5rem] shrink-0 font-mono text-[11px] text-zinc-500 dark:text-zinc-400">
                            {color}
                          </code>
                          <input
                            value={propNames[color] ?? ''}
                            onChange={(event) =>
                              setPropNames((current) => ({
                                ...current,
                                [color]: event.target.value,
                              }))
                            }
                            placeholder="not a prop"
                            className="field py-2 font-mono text-xs"
                          />
                        </motion.li>
                      ))}
                    </motion.ul>
                  </>
                )}
              </motion.div>
            </AnimatePresence>
          </Section>
        </div>

        <div className="min-w-0 space-y-5 lg:sticky lg:top-[88px] lg:self-start">
          <div className="surface overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-200/70 p-4 dark:border-white/5">
              <PreviewControls
                size={previewSize}
                onSizeChange={setPreviewSize}
                color={previewColor}
                onColorChange={setPreviewColor}
                background={background}
                onBackgroundChange={setBackground}
              />
            </div>
            <AnimatePresence>
              {previewMeta && previewMeta.colorProps.length > 0 && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden border-b border-zinc-200/70 dark:border-white/5"
                >
                  <div className="flex flex-wrap gap-2 px-4 py-3">
                    {previewMeta.colorProps.map((prop) => (
                      <label
                        key={prop.name}
                        className="flex cursor-pointer items-center gap-2 rounded-full border border-zinc-200 bg-white/60 py-1 pr-3 pl-1 text-xs dark:border-white/10 dark:bg-white/5"
                      >
                        <span className="relative size-6 overflow-hidden rounded-full ring-1 ring-zinc-900/10">
                          <span
                            className="absolute inset-0"
                            style={{ backgroundColor: colorValues[prop.name] ?? prop.value }}
                          />
                          <input
                            type="color"
                            value={colorValues[prop.name] ?? prop.value}
                            onChange={(event) =>
                              setColorValues((current) => ({
                                ...current,
                                [prop.name]: event.target.value,
                              }))
                            }
                            className="absolute inset-0 cursor-pointer opacity-0"
                          />
                        </span>
                        <code className="font-mono">{prop.name}</code>
                      </label>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div
              className={cn(
                'relative flex min-h-80 items-center justify-center overflow-hidden transition-colors duration-300',
                BACKGROUND_CLASSES[background]
              )}
            >
              <AnimatePresence mode="wait">
                {processed && previewMeta ? (
                  <motion.div
                    key={previewKey}
                    initial={{ opacity: 0, scale: 0.6, rotate: -8 }}
                    animate={{ opacity: 1, scale: 1, rotate: 0 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    transition={{ type: 'spring', bounce: 0.45, duration: 0.6 }}
                  >
                    <motion.div layout transition={{ type: 'spring', bounce: 0.3, duration: 0.4 }}>
                      <SvgPreview
                        root={processed.root}
                        iconStyle={previewMeta}
                        options={renderOptions}
                      />
                    </motion.div>
                  </motion.div>
                ) : (
                  <motion.div
                    key="empty"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex flex-col items-center gap-3 text-sm text-zinc-400"
                  >
                    {processing ? (
                      <>
                        <Spinner className="size-6 text-brand-500" />
                        Optimizing the SVG…
                      </>
                    ) : (
                      <>
                        <div className="grid size-16 place-items-center rounded-2xl border-2 border-dashed border-current opacity-50">
                          <Upload className="size-6" />
                        </div>
                        Your preview appears here
                      </>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <AnimatePresence>
              {processed && previewMeta && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className={cn(
                    'overflow-hidden border-t border-zinc-200/70 dark:border-white/5',
                    BACKGROUND_CLASSES[background]
                  )}
                >
                  <div className="flex items-end justify-center gap-7 py-5">
                    {PREVIEW_SIZES.map((size) => (
                      <div key={size} className="flex flex-col items-center gap-2">
                        <SvgPreview
                          root={processed.root}
                          iconStyle={previewMeta}
                          options={{ ...renderOptions, size }}
                        />
                        <span className="font-mono text-[10px] opacity-50">{size}</span>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950 shadow-xl shadow-zinc-950/20 dark:border-white/10">
            <div className="flex items-center gap-2 border-b border-white/5 px-3 py-2">
              <div className="mr-2 flex gap-1.5 pl-1">
                <span className="size-2.5 rounded-full bg-red-400/80" />
                <span className="size-2.5 rounded-full bg-amber-400/80" />
                <span className="size-2.5 rounded-full bg-emerald-400/80" />
              </div>
              {(
                [
                  ['component', 'Next.js', <Code2 key="c" className="size-3.5" />],
                  ['native', 'React Native', <Smartphone key="n" className="size-3.5" />],
                ] as const
              ).map(([value, label, icon]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setTab(value)}
                  className={cn(
                    'relative flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors',
                    tab === value ? 'text-white' : 'text-zinc-500 hover:text-zinc-300'
                  )}
                >
                  {tab === value && (
                    <motion.span
                      layoutId="code-tab"
                      className="absolute inset-0 rounded-lg bg-white/10"
                    />
                  )}
                  <span className="relative flex items-center gap-1.5">
                    {icon}
                    {label}
                  </span>
                </button>
              ))}
              {code && (
                <motion.button
                  type="button"
                  onClick={() => void copyCode()}
                  whileTap={{ scale: 0.92 }}
                  className="ml-auto flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs text-zinc-400 hover:bg-white/5 hover:text-white"
                >
                  {copiedCode ? (
                    <Check className="size-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="size-3.5" />
                  )}
                  {copiedCode ? 'Copied' : 'Copy'}
                </motion.button>
              )}
            </div>
            <AnimatePresence mode="wait" initial={false}>
              <motion.pre
                key={tab}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.15 }}
                className="code-highlight code-scroll max-h-[26rem] overflow-auto p-4 font-mono text-xs leading-relaxed"
              >
                <code
                  dangerouslySetInnerHTML={{
                    __html: highlightTsx(code || '// Upload an SVG to see the generated code'),
                  }}
                />
              </motion.pre>
            </AnimatePresence>
          </div>

          {previewMeta && (
            <UsagePanel
              guides={{
                web: iconUsage(previewMeta, 'web'),
                native: iconUsage(previewMeta, 'native'),
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
                    text={`Same artwork as ${duplicate.name}. Upload a different SVG`}
                  />
                ) : hasSource && issues.length > 0 ? (
                  <StatusLine
                    key="issues"
                    tone="warning"
                    text={issues[0]!}
                    more={issues.length - 1}
                  />
                ) : canSave ? (
                  <StatusLine
                    key="ready"
                    tone="ready"
                    text={`Ready to ${isEdit ? 'save' : 'add'} ${toComponentName(slug)}`}
                  />
                ) : (
                  <StatusLine key="idle" tone="idle" text="Upload an SVG and give it a name" />
                )}
              </AnimatePresence>
            </div>
            <kbd
              suppressHydrationWarning
              className="hidden rounded-md border border-zinc-200 px-1.5 py-0.5 font-mono text-[10px] text-zinc-400 sm:block dark:border-white/10"
            >
              {typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.userAgent)
                ? '⌘S'
                : 'Ctrl S'}
            </kbd>
            {isEdit && (
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                disabled={busy || readOnly}
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
              className="relative inline-flex items-center gap-2 overflow-hidden rounded-xl bg-gradient-to-r from-brand-500 to-violet-500 px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-brand-500/25 transition disabled:cursor-not-allowed disabled:from-zinc-300 disabled:to-zinc-300 disabled:shadow-none dark:disabled:from-zinc-700 dark:disabled:to-zinc-700"
            >
              {saving && <Spinner />}
              {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Add icon'}
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
        title={`Delete ${initial?.meta.name ?? 'icon'}?`}
        description={
          <>
            <code className="font-mono">{initial ? toComponentName(initial.meta.slug) : ''}</code>{' '}
            disappears from the package on the next release, and apps that import it will stop
            building.
          </>
        }
        confirmLabel="Delete icon"
      />
    </div>
  )
}
