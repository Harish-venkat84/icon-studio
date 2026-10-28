import { imageMetaSchema, toImageExportName, type ImageMeta } from './image.ts'
import { iconMetaSchema, toComponentName, type IconMeta } from './meta.ts'
import type { ReleaseImpact } from './version.ts'

export interface ReleaseEntry {
  kind: 'icon' | 'image'
  slug: string
  change: 'added' | 'updated' | 'removed'
  impact: ReleaseImpact
  /** What apps notice: lost or new exports and props. */
  notes: string[]
}

export function parseIconMeta(json: string | null): IconMeta | null {
  if (!json) return null
  try {
    const parsed = iconMetaSchema.safeParse(JSON.parse(json))
    return parsed.success ? parsed.data : null
  } catch {
    return null
  }
}

export function parseImageMeta(json: string | null): ImageMeta | null {
  if (!json) return null
  try {
    const parsed = imageMetaSchema.safeParse(JSON.parse(json))
    return parsed.success ? parsed.data : null
  } catch {
    return null
  }
}

/** Compares an icon's metadata at the last release (`before`) with now (`after`). */
export function iconReleaseEntry(
  slug: string,
  before: IconMeta | null,
  after: IconMeta | null
): ReleaseEntry | null {
  const component = toComponentName(slug)
  if (!before && !after) return null
  if (!before) {
    return { kind: 'icon', slug, change: 'added', impact: 'feature', notes: [`New ${component}`] }
  }
  if (!after) {
    return {
      kind: 'icon',
      slug,
      change: 'removed',
      impact: 'breaking',
      notes: [`${component} is no longer exported`],
    }
  }
  const beforeProps = new Set(before.colorProps.map((prop) => prop.name))
  const afterProps = new Set(after.colorProps.map((prop) => prop.name))
  const lost = [...beforeProps].filter((name) => !afterProps.has(name))
  const gained = [...afterProps].filter((name) => !beforeProps.has(name))
  const notes = [
    ...lost.map((name) => `${component} no longer has the ${name} prop`),
    ...gained.map((name) => `${component} has a new ${name} prop`),
  ]
  const impact: ReleaseImpact = lost.length ? 'breaking' : gained.length ? 'feature' : 'fix'
  return { kind: 'icon', slug, change: 'updated', impact, notes }
}

export function imageReleaseEntry(
  slug: string,
  before: ImageMeta | null,
  after: ImageMeta | null
): ReleaseEntry | null {
  const exportName = toImageExportName(slug)
  if (!before && !after) return null
  if (!before) {
    return { kind: 'image', slug, change: 'added', impact: 'feature', notes: [`New ${exportName}`] }
  }
  if (!after) {
    return {
      kind: 'image',
      slug,
      change: 'removed',
      impact: 'breaking',
      notes: [`${exportName} is no longer exported`],
    }
  }
  return { kind: 'image', slug, change: 'updated', impact: 'fix', notes: [] }
}

export function releaseImpact(entries: ReleaseEntry[]): ReleaseImpact | null {
  if (entries.some((entry) => entry.impact === 'breaking')) return 'breaking'
  if (entries.some((entry) => entry.impact === 'feature')) return 'feature'
  return entries.length ? 'fix' : null
}
