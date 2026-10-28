import { z } from 'zod'

export const SLUG_PATTERN = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/
export const COLOR_PROP_PATTERN = /^[a-z][a-zA-Z0-9]*Color$/

export const colorPropSchema = z.object({
  name: z
    .string()
    .regex(COLOR_PROP_PATTERN, 'Prop names are camelCase and end with "Color", e.g. accentColor'),
  value: z.string().min(1),
})

export const iconMetaSchema = z
  .object({
    name: z.string().trim().min(1, 'Name is required').max(60),
    slug: z
      .string()
      .max(60)
      .regex(SLUG_PATTERN, 'Slug must be kebab-case: lowercase letters, numbers and dashes'),
    tags: z.array(z.string().trim().min(1).max(30)).max(20).default([]),
    mode: z.enum(['mono', 'multi']).default('mono'),
    defaults: z
      .object({
        size: z.number().positive().max(1024).default(24),
        color: z.string().min(1).optional(),
      })
      .default({ size: 24 }),
    colorProps: z.array(colorPropSchema).max(10).default([]),
    createdAt: z.string().optional(),
    updatedAt: z.string().optional(),
  })
  .superRefine((meta, ctx) => {
    const names = new Set<string>()
    const values = new Set<string>()
    meta.colorProps.forEach((prop, index) => {
      if (names.has(prop.name)) {
        ctx.addIssue({
          code: 'custom',
          path: ['colorProps', index, 'name'],
          message: 'Duplicate prop name',
        })
      }
      if (values.has(prop.value.toLowerCase())) {
        ctx.addIssue({
          code: 'custom',
          path: ['colorProps', index, 'value'],
          message: 'This color is already mapped to a prop',
        })
      }
      names.add(prop.name)
      values.add(prop.value.toLowerCase())
    })
    if (meta.mode === 'mono' && meta.colorProps.length > 0) {
      ctx.addIssue({
        code: 'custom',
        path: ['colorProps'],
        message: 'Color props are only available in multi-color mode',
      })
    }
  })

export type IconMeta = z.infer<typeof iconMetaSchema>
export type IconMetaInput = z.input<typeof iconMetaSchema>
export type ColorProp = z.infer<typeof colorPropSchema>

export function slugify(name: string): string {
  return name
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^[^a-z]+/, '')
    .replace(/-+$/, '')
}

export function toComponentName(slug: string): string {
  const pascal = slug
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('')
  return `${pascal}Icon`
}

export function iconFilePaths(slug: string) {
  return { svg: `icons/${slug}.svg`, meta: `icons/${slug}.json` }
}

export function serializeMeta(meta: IconMeta): string {
  const { name, slug, tags, mode, defaults, colorProps, createdAt, updatedAt } = meta
  return `${JSON.stringify({ name, slug, tags, mode, defaults, colorProps, createdAt, updatedAt }, null, 2)}\n`
}

/** The size most icons are drawn at; other defaults get a warning in the studio. */
export const STANDARD_ICON_SIZE = 24

/**
 * Sentence-case display name. A name without spaces that uses dashes or underscores
 * (a slug or file name) is split into words, and a lowercase first word is capitalized.
 * Words that already have capitals, like USB or iOS, are kept as typed.
 */
export function formatName(value: string): string {
  const trimmed = value.trim()
  const spaced = /\s/.test(trimmed) ? trimmed : trimmed.replace(/[-_]+/g, ' ')
  const words = spaced.split(/\s+/).filter(Boolean)
  const first = words[0]
  if (first && first === first.toLowerCase()) {
    words[0] = first.charAt(0).toUpperCase() + first.slice(1)
  }
  return words.join(' ')
}

/** Tags are kebab-case: "Merchant Dashboard" becomes "merchant-dashboard". */
export function normalizeTag(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

/** Normalized, de-duplicated tags from a comma separated string or a list. */
export function parseTags(value: string | string[]): string[] {
  const parts = Array.isArray(value) ? value : value.split(',')
  return [...new Set(parts.map(normalizeTag).filter(Boolean))]
}

export const MISSING_TAGS_MESSAGE = 'Add at least one tag so people can find it in search'
