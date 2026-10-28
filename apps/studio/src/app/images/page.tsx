import { ImagePlus } from 'lucide-react'
import Link from 'next/link'
import { connection } from 'next/server'
import { ImageGallery } from '@/components/image_gallery'
import { PageHeader } from '@/components/page_header'
import { StorageProblem } from '@/components/storage_problem'
import { loadSafely } from '@/lib/icons'
import { listImages } from '@/lib/images'

export default async function ImagesPage() {
  await connection()
  const result = await loadSafely(listImages)
  if (!result.ok) return <StorageProblem message={result.error} />
  const images = result.data

  return (
    <>
      <PageHeader
        eyebrow="@icon-studio/icons/images"
        title={
          <>
            Images{' '}
            <span className="bg-gradient-to-r from-emerald-500 to-brand-500 bg-clip-text text-transparent">
              {images.length}
            </span>
          </>
        }
        description="PNG assets (up to 1 MB) that ship in the package next to the icons. Apps import them and pass them to next/image."
        actions={
          <Link
            href="/images/new"
            className="group inline-flex items-center gap-2 rounded-xl bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white shadow-lg shadow-zinc-900/10 transition hover:-translate-y-0.5 hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 dark:shadow-white/5 dark:hover:bg-zinc-200"
          >
            <ImagePlus className="size-4 transition-transform duration-300 group-hover:scale-110" />
            New image
          </Link>
        }
      />
      <ImageGallery images={images} />
    </>
  )
}
