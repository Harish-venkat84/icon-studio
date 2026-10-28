import {
  formatName,
  imageFilePaths,
  imageMetaSchema,
  MISSING_TAGS_MESSAGE,
  parseTags,
  PngError,
  readPngSize,
  serializeImageMeta,
  sha256Hex,
  SLUG_PATTERN,
  toImageExportName,
  type ImageMeta,
} from '@icon-studio/core'
import {
  commitMessage,
  getRepository,
  IMAGES_DIR,
  ValidationError,
  type DuplicateRef,
} from './icons'
import type { FileChange } from './store/types'

export async function listImages(): Promise<ImageMeta[]> {
  const files = await getRepository().listFiles(IMAGES_DIR, (file) => file.endsWith('.json'))
  return files
    .flatMap((file) => {
      const parsed = imageMetaSchema.safeParse(JSON.parse(file.content))
      return parsed.success ? [parsed.data] : []
    })
    .sort((a, b) => a.name.localeCompare(b.name))
}

export async function getImage(slug: string): Promise<ImageMeta | null> {
  if (!SLUG_PATTERN.test(slug)) return null
  const json = await getRepository().readFile(imageFilePaths(slug).meta)
  if (!json) return null
  const parsed = imageMetaSchema.safeParse(JSON.parse(json))
  return parsed.success ? parsed.data : null
}

export async function readImageBytes(slug: string): Promise<Uint8Array | null> {
  if (!SLUG_PATTERN.test(slug)) return null
  return getRepository().readBinary(imageFilePaths(slug).png)
}

/** The image with exactly these bytes, ignoring `exceptSlug` (the image being edited). */
export async function findDuplicateImage(
  bytes: Uint8Array,
  exceptSlug?: string
): Promise<DuplicateRef | null> {
  const hash = sha256Hex(bytes)
  for (const image of await listImages()) {
    if (image.slug === exceptSlug || image.bytes !== bytes.byteLength) continue
    const stored = image.sha256 ?? (await readImageBytes(image.slug).then((b) => b && sha256Hex(b)))
    if (stored === hash) return { slug: image.slug, name: image.name, updatedAt: image.updatedAt }
  }
  return null
}

function slugFromImageMeta(file: string): string | null {
  return /^images\/([^/]+)\.json$/.exec(file)?.[1] ?? null
}

export interface SaveImageInput {
  name: string
  slug: string
  tags: string[]
  alt: string
  previousSlug?: string
  png?: Uint8Array
}

export async function saveImage(input: SaveImageInput, user: string): Promise<ImageMeta> {
  const tags = parseTags(input.tags)
  if (tags.length === 0) throw new ValidationError(MISSING_TAGS_MESSAGE)
  const previous = input.previousSlug ? await getImage(input.previousSlug) : null
  if (input.previousSlug && !previous) throw new ValidationError('This image no longer exists')

  let png = input.png
  if (!png && previous) {
    png = (await readImageBytes(previous.slug)) ?? undefined
    if (!png) throw new ValidationError('The stored PNG is missing; upload it again')
  }
  if (!png) throw new ValidationError('Upload a PNG first')

  if (input.png) {
    const duplicate = await findDuplicateImage(input.png, previous?.slug)
    if (duplicate) {
      throw new ValidationError(
        `This PNG is already in the library as "${duplicate.name}" (${duplicate.slug})`
      )
    }
  }

  let size
  try {
    size = readPngSize(png)
  } catch (error) {
    if (error instanceof PngError) throw new ValidationError(error.message)
    throw error
  }

  const now = new Date().toISOString()
  const parsed = imageMetaSchema.safeParse({
    name: formatName(input.name),
    slug: input.slug,
    tags,
    alt: input.alt,
    ...size,
    bytes: png.byteLength,
    sha256: sha256Hex(png),
    createdAt: previous?.createdAt ?? now,
    updatedAt: now,
  })
  if (!parsed.success) {
    throw new ValidationError(parsed.error.issues.map((issue) => issue.message).join('. '))
  }
  const meta = parsed.data
  const paths = imageFilePaths(meta.slug)
  const renamed = previous !== null && previous.slug !== meta.slug
  const exportName = toImageExportName(meta.slug)

  const changes: FileChange[] = [{ path: paths.meta, content: serializeImageMeta(meta) }]
  if (input.png || renamed) changes.unshift({ path: paths.png, content: png })
  if (renamed) {
    const old = imageFilePaths(previous.slug)
    changes.push({ path: old.png, content: null }, { path: old.meta, content: null })
  }

  const subject = !previous
    ? `images: add ${meta.name} (${meta.slug})`
    : renamed
      ? `images: rename ${previous.slug} to ${meta.slug}`
      : `images: update ${meta.name} (${meta.slug})`

  await getRepository().commit(commitMessage(subject, user), changes, (existing) => {
    if (previous && !existing.has(imageFilePaths(previous.slug).meta)) {
      throw new ValidationError('This image was deleted in the meantime')
    }
    for (const file of existing) {
      const slug = slugFromImageMeta(file)
      if (!slug || slug === previous?.slug) continue
      if (slug === meta.slug) throw new ValidationError(`The slug "${meta.slug}" is already taken`)
      if (toImageExportName(slug) === exportName) {
        throw new ValidationError(`"${slug}" already produces the export ${exportName}`)
      }
    }
  })
  return meta
}

export async function deleteImage(slug: string, user: string) {
  const image = await getImage(slug)
  if (!image) throw new ValidationError('This image no longer exists')
  const paths = imageFilePaths(slug)
  await getRepository().commit(commitMessage(`images: delete ${image.name} (${slug})`, user), [
    { path: paths.png, content: null },
    { path: paths.meta, content: null },
  ])
}
