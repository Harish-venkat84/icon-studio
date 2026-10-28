import { z } from 'zod'
import { SLUG_PATTERN } from './meta.ts'

export const MAX_PNG_BYTES = 1024 * 1024
export const MAX_PNG_DIMENSION = 8192

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]

export const imageMetaSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(60),
  slug: z
    .string()
    .max(60)
    .regex(SLUG_PATTERN, 'Slug must be kebab-case: lowercase letters, numbers and dashes'),
  tags: z.array(z.string().trim().min(1).max(30)).max(20).default([]),
  alt: z.string().trim().max(200).default(''),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  bytes: z.number().int().positive(),
  sha256: z
    .string()
    .regex(/^[0-9a-f]{64}$/)
    .optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
})

export type ImageMeta = z.infer<typeof imageMetaSchema>
export type ImageMetaInput = z.input<typeof imageMetaSchema>

export class PngError extends Error {}

export function readPngSize(bytes: Uint8Array): { width: number; height: number } {
  if (bytes.byteLength > MAX_PNG_BYTES) {
    throw new PngError(`The PNG is larger than ${MAX_PNG_BYTES / 1024 / 1024} MB`)
  }
  if (bytes.byteLength < 33 || PNG_SIGNATURE.some((byte, index) => bytes[index] !== byte)) {
    throw new PngError('This is not a PNG file')
  }
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  const chunkType = String.fromCharCode(...bytes.subarray(12, 16))
  if (chunkType !== 'IHDR') throw new PngError('The PNG header is damaged')
  const width = view.getUint32(16)
  const height = view.getUint32(20)
  if (!width || !height || width > MAX_PNG_DIMENSION || height > MAX_PNG_DIMENSION) {
    throw new PngError(`PNG dimensions must be between 1 and ${MAX_PNG_DIMENSION} px`)
  }
  return { width, height }
}

export function toImageExportName(slug: string): string {
  const camel = slug.replace(/-([a-z0-9])/g, (_, letter: string) => letter.toUpperCase())
  return `${camel}Image`
}

export function imageFilePaths(slug: string) {
  return { png: `images/${slug}.png`, meta: `images/${slug}.json` }
}

export function serializeImageMeta(meta: ImageMeta): string {
  const { name, slug, tags, alt, width, height, bytes, sha256, createdAt, updatedAt } = meta
  return `${JSON.stringify({ name, slug, tags, alt, width, height, bytes, sha256, createdAt, updatedAt }, null, 2)}\n`
}
