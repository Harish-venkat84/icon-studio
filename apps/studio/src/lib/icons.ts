import path from 'node:path'
import {
  bumpProblem,
  bumpVersion,
  formatName,
  iconFilePaths,
  iconMetaSchema,
  iconReleaseEntry,
  imageFilePaths,
  imageReleaseEntry,
  MISSING_TAGS_MESSAGE,
  normalizeColor,
  parseIconMeta,
  parseImageMeta,
  parseTags,
  processSvg,
  releaseImpact,
  sameArtwork,
  serializeMeta,
  sha256Hex,
  SLUG_PATTERN,
  SvgError,
  toComponentName,
  type ArtworkFingerprint,
  type IconMeta,
  type IconMetaInput,
  type IconNode,
  type ProcessedSvg,
  type ReleaseEntry,
  type VersionBump,
} from '@icon-studio/core'
import { Lru } from './lru'
import { createFsRepository } from './store/fs'
import { createGithubRepository } from './store/github'
import type { FileChange, IconRepository } from './store/types'

export const ICONS_DIR = 'icons'
export const IMAGES_DIR = 'images'
export const PACKAGE_JSON_PATH = 'packages/icons/package.json'
export const PACKAGE_NAME = '@icon-studio/icons'

let repository: IconRepository | undefined

export function getRepository(): IconRepository {
  if (repository) return repository
  if (process.env.ICONS_STORAGE === 'github') {
    const { ICONS_GITHUB_TOKEN, ICONS_GITHUB_REPOSITORY, ICONS_GITHUB_BRANCH } = process.env
    if (!ICONS_GITHUB_TOKEN || !ICONS_GITHUB_REPOSITORY) {
      throw new Error('ICONS_STORAGE=github needs ICONS_GITHUB_TOKEN and ICONS_GITHUB_REPOSITORY')
    }
    repository = createGithubRepository({
      token: ICONS_GITHUB_TOKEN,
      repository: ICONS_GITHUB_REPOSITORY,
      branch: ICONS_GITHUB_BRANCH || 'main',
    })
  } else {
    repository = createFsRepository(
      path.resolve(
        /*turbopackIgnore: true*/ process.env.ICONS_REPO_DIR || path.join(process.cwd(), '../..')
      )
    )
  }
  return repository
}

export interface IconRecord {
  meta: IconMeta
  svg: string
  root: IconNode | null
  colors: string[]
  fingerprint: ArtworkFingerprint | null
  error?: string
}

export interface DuplicateRef {
  slug: string
  name: string
  updatedAt?: string
}

const processedSvgs = new Lru<ProcessedSvg | Error>(2000)

/** processSvg for stored icons, memoized because listing icons would otherwise run SVGO on all of them. */
function processStoredSvg(svg: string, slug: string): ProcessedSvg {
  const key = `${slug}:${sha256Hex(svg)}`
  let result = processedSvgs.get(key)
  if (!result) {
    try {
      result = processSvg(svg, slug)
    } catch (error) {
      result = error as Error
    }
    processedSvgs.set(key, result)
  }
  if (result instanceof Error) throw result
  return result
}

function toRecord(meta: IconMeta, svg: string | undefined): IconRecord {
  if (svg === undefined)
    return {
      meta,
      svg: '',
      root: null,
      colors: [],
      fingerprint: null,
      error: 'SVG file is missing',
    }
  try {
    const processed = processStoredSvg(svg, meta.slug)
    return {
      meta,
      svg,
      root: processed.root,
      colors: processed.colors,
      fingerprint: processed.fingerprint,
    }
  } catch (error) {
    return { meta, svg, root: null, colors: [], fingerprint: null, error: (error as Error).message }
  }
}

export async function listIcons(): Promise<IconRecord[]> {
  const files = await getRepository().listFiles(ICONS_DIR)
  const svgs = new Map(
    files.filter((file) => file.path.endsWith('.svg')).map((file) => [file.path, file.content])
  )
  return files
    .filter((file) => file.path.endsWith('.json'))
    .flatMap((file) => {
      const parsed = iconMetaSchema.safeParse(JSON.parse(file.content))
      return parsed.success
        ? [toRecord(parsed.data, svgs.get(iconFilePaths(parsed.data.slug).svg))]
        : []
    })
    .sort((a, b) => a.meta.name.localeCompare(b.meta.name))
}

/** The icon whose artwork matches `fingerprint`, ignoring `exceptSlug` (the icon being edited). */
export async function findDuplicateIcon(
  fingerprint: ArtworkFingerprint,
  exceptSlug?: string
): Promise<DuplicateRef | null> {
  const match = (await listIcons()).find(
    (icon) =>
      icon.fingerprint !== null &&
      sameArtwork(icon.fingerprint, fingerprint) &&
      icon.meta.slug !== exceptSlug
  )
  return match
    ? { slug: match.meta.slug, name: match.meta.name, updatedAt: match.meta.updatedAt }
    : null
}

export async function getIcon(slug: string): Promise<IconRecord | null> {
  if (!SLUG_PATTERN.test(slug)) return null
  const repo = getRepository()
  const paths = iconFilePaths(slug)
  const [metaJson, svg] = await Promise.all([repo.readFile(paths.meta), repo.readFile(paths.svg)])
  if (!metaJson) return null
  const parsed = iconMetaSchema.safeParse(JSON.parse(metaJson))
  return parsed.success ? toRecord(parsed.data, svg ?? undefined) : null
}

export class ValidationError extends Error {}

/** Every tag used by icons and images, most used first, for suggestions in the editors. */
export async function listTags(): Promise<string[]> {
  const repo = getRepository()
  const isJson = (file: string) => file.endsWith('.json')
  const files = (
    await Promise.all([repo.listFiles(ICONS_DIR, isJson), repo.listFiles(IMAGES_DIR, isJson)])
  ).flat()
  const counts = new Map<string, number>()
  for (const file of files) {
    let tags: unknown
    try {
      tags = (JSON.parse(file.content) as { tags?: unknown }).tags
    } catch {
      continue
    }
    if (!Array.isArray(tags)) continue
    for (const tag of parseTags(tags.filter((value) => typeof value === 'string'))) {
      counts.set(tag, (counts.get(tag) ?? 0) + 1)
    }
  }
  return [...counts].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([tag]) => tag)
}

function slugFromMetaPath(file: string): string | null {
  const match = /^icons\/([^/]+)\.json$/.exec(file)
  return match?.[1] ?? null
}

export function commitMessage(subject: string, user: string) {
  return `${subject}\n\nStudio-User: ${user}`
}

export interface SaveIconInput {
  raw: string
  meta: IconMetaInput
  previousSlug?: string
}

export async function saveIcon(input: SaveIconInput, user: string): Promise<IconMeta> {
  const tags = parseTags(input.meta.tags ?? [])
  if (tags.length === 0) throw new ValidationError(MISSING_TAGS_MESSAGE)
  const parsed = iconMetaSchema.safeParse({
    ...input.meta,
    name: formatName(input.meta.name),
    tags,
  })
  if (!parsed.success) {
    throw new ValidationError(parsed.error.issues.map((issue) => issue.message).join('. '))
  }
  const draft = parsed.data

  let processed
  try {
    processed = processSvg(input.raw, draft.slug)
  } catch (error) {
    if (error instanceof SvgError) throw new ValidationError(error.message)
    throw error
  }
  const unknownColor = draft.colorProps.find(
    (prop) => !processed.colors.includes(normalizeColor(prop.value))
  )
  if (unknownColor) {
    throw new ValidationError(`${unknownColor.value} is not a color used in this SVG`)
  }

  const repo = getRepository()
  const previous = input.previousSlug ? await getIcon(input.previousSlug) : null
  if (input.previousSlug && !previous) throw new ValidationError('This icon no longer exists')

  const duplicate = await findDuplicateIcon(processed.fingerprint, previous?.meta.slug)
  if (duplicate) {
    throw new ValidationError(
      `This SVG is already in the library as "${duplicate.name}" (${duplicate.slug})`
    )
  }

  const now = new Date().toISOString()
  const meta: IconMeta = {
    ...draft,
    colorProps: draft.colorProps.map((prop) => ({ ...prop, value: normalizeColor(prop.value) })),
    createdAt: previous?.meta.createdAt ?? now,
    updatedAt: now,
  }
  const paths = iconFilePaths(meta.slug)
  const renamed = previous !== null && previous.meta.slug !== meta.slug
  const componentName = toComponentName(meta.slug)

  const changes: FileChange[] = [
    { path: paths.svg, content: processed.svg },
    { path: paths.meta, content: serializeMeta(meta) },
  ]
  if (renamed) {
    const old = iconFilePaths(previous.meta.slug)
    changes.push({ path: old.svg, content: null }, { path: old.meta, content: null })
  }

  const subject = !previous
    ? `icons: add ${meta.name} (${meta.slug})`
    : renamed
      ? `icons: rename ${previous.meta.slug} to ${meta.slug}`
      : `icons: update ${meta.name} (${meta.slug})`

  await repo.commit(commitMessage(subject, user), changes, (existing) => {
    if (previous && !existing.has(iconFilePaths(previous.meta.slug).meta)) {
      throw new ValidationError('This icon was deleted in the meantime')
    }
    for (const file of existing) {
      const slug = slugFromMetaPath(file)
      if (!slug || slug === previous?.meta.slug) continue
      if (slug === meta.slug) throw new ValidationError(`The slug "${meta.slug}" is already taken`)
      if (toComponentName(slug) === componentName) {
        throw new ValidationError(`"${slug}" already produces the component ${componentName}`)
      }
    }
  })
  return meta
}

export async function deleteIcon(slug: string, user: string) {
  const icon = await getIcon(slug)
  if (!icon) throw new ValidationError('This icon no longer exists')
  const paths = iconFilePaths(slug)
  await getRepository().commit(commitMessage(`icons: delete ${icon.meta.name} (${slug})`, user), [
    { path: paths.svg, content: null },
    { path: paths.meta, content: null },
  ])
}

async function readPackageJson() {
  const content = await getRepository().readFile(PACKAGE_JSON_PATH)
  if (!content) throw new Error(`${PACKAGE_JSON_PATH} is missing`)
  return JSON.parse(content) as { version: string } & Record<string, unknown>
}

const CHANGED_FILE = /^(icons|images)\/([^/]+)\.(?:svg|png|json)$/

/** Icons and images changed since the `v<version>` tag, or null when that can't be worked out. */
async function changesSinceRelease(version: string): Promise<ReleaseEntry[] | null> {
  const repo = getRepository()
  const diff = await repo.changesSince(`v${version}`, [ICONS_DIR, IMAGES_DIR])
  if (!diff) return null
  const changed = new Map<string, { kind: 'icon' | 'image'; slug: string }>()
  for (const file of diff.paths) {
    const match = CHANGED_FILE.exec(file)
    if (!match) continue
    const kind = match[1] === ICONS_DIR ? 'icon' : 'image'
    changed.set(`${kind}:${match[2]}`, { kind, slug: match[2]! })
  }
  const entries = await Promise.all(
    [...changed.values()].map(async ({ kind, slug }) => {
      const metaPath = kind === 'icon' ? iconFilePaths(slug).meta : imageFilePaths(slug).meta
      const [before, after] = await Promise.all([
        repo.readFileAt(diff.base, metaPath),
        repo.readFileAt(diff.head, metaPath),
      ])
      return kind === 'icon'
        ? iconReleaseEntry(slug, parseIconMeta(before), parseIconMeta(after))
        : imageReleaseEntry(slug, parseImageMeta(before), parseImageMeta(after))
    })
  )
  return entries
    .filter((entry): entry is ReleaseEntry => entry !== null)
    .sort((a, b) => a.kind.localeCompare(b.kind) || a.slug.localeCompare(b.slug))
}

export async function getReleaseInfo() {
  const repo = getRepository()
  const { version } = await readPackageJson()
  const changes = await changesSinceRelease(version)
  return { version, changes, impact: changes && releaseImpact(changes), storage: repo.kind }
}

export async function releaseVersion(bump: VersionBump, user: string) {
  const pkg = await readPackageJson()
  const changes = await changesSinceRelease(pkg.version)
  const problem = changes && bumpProblem(pkg.version, bump, releaseImpact(changes))
  if (problem) throw new ValidationError(problem)
  const version = bumpVersion(pkg.version, bump)
  await getRepository().commit(commitMessage(`release: ${PACKAGE_NAME} v${version}`, user), [
    { path: PACKAGE_JSON_PATH, content: `${JSON.stringify({ ...pkg, version }, null, 2)}\n` },
  ])
  return version
}

export async function loadSafely<T>(
  load: () => Promise<T>
): Promise<{ ok: true; data: T } | { ok: false; error: string }> {
  try {
    return { ok: true, data: await load() }
  } catch (error) {
    console.error(error)
    return { ok: false, error: (error as Error).message }
  }
}
