import type { ImageMeta } from '@icon-studio/core/image'

export function imageUrl(image: Pick<ImageMeta, 'slug' | 'updatedAt'>) {
  return `/api/images/${image.slug}?v=${encodeURIComponent(image.updatedAt ?? '')}`
}

export function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`
}
