import { toImageExportName } from '@icon-studio/core/image'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { connection } from 'next/server'
import { ImageEditor } from '@/components/image_editor'
import { PageHeader } from '@/components/page_header'
import { StorageProblem } from '@/components/storage_problem'
import { listTags, loadSafely } from '@/lib/icons'
import { getImage } from '@/lib/images'

export default async function EditImagePage({ params }: { params: Promise<{ slug: string }> }) {
  await connection()
  const { slug } = await params
  const [result, tags] = await Promise.all([
    loadSafely(() => getImage(slug)),
    listTags().catch(() => []),
  ])
  if (!result.ok) return <StorageProblem message={result.error} />
  const image = result.data
  if (!image) notFound()

  const updated = image.updatedAt
    ? new Date(image.updatedAt).toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    : null

  return (
    <>
      <Link
        href="/images"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-zinc-500 transition hover:-translate-x-0.5 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white"
      >
        <ArrowLeft className="size-4" /> All images
      </Link>
      <PageHeader
        eyebrow="PNG image"
        title={image.name}
        description={
          <span className="flex flex-wrap items-center gap-2">
            <code className="rounded-md bg-zinc-900/5 px-2 py-0.5 font-mono text-xs dark:bg-white/10">
              {toImageExportName(image.slug)}
            </code>
            <code className="font-mono text-xs">{image.slug}</code>
            {updated && <span className="text-xs">· updated {updated}</span>}
          </span>
        }
      />
      <ImageEditor key={image.updatedAt} initial={image} knownTags={tags} />
    </>
  )
}
