import { toComponentName } from '@icon-studio/core/meta'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { connection } from 'next/server'
import { IconEditor } from '@/components/icon_editor'
import { PageHeader } from '@/components/page_header'
import { StorageProblem } from '@/components/storage_problem'
import { getIcon, listTags, loadSafely } from '@/lib/icons'

export default async function EditIconPage({ params }: { params: Promise<{ slug: string }> }) {
  await connection()
  const { slug } = await params
  const [result, tags] = await Promise.all([
    loadSafely(() => getIcon(slug)),
    listTags().catch(() => []),
  ])
  if (!result.ok) return <StorageProblem message={result.error} />
  const icon = result.data
  if (!icon) notFound()

  const updated = icon.meta.updatedAt
    ? new Date(icon.meta.updatedAt).toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    : null

  return (
    <>
      <Link
        href="/"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-zinc-500 transition hover:-translate-x-0.5 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white"
      >
        <ArrowLeft className="size-4" /> All icons
      </Link>
      <PageHeader
        eyebrow={icon.meta.mode === 'multi' ? 'Multi-color icon' : 'Single-color icon'}
        title={icon.meta.name}
        description={
          <span className="flex flex-wrap items-center gap-2">
            <code className="rounded-md bg-zinc-900/5 px-2 py-0.5 font-mono text-xs dark:bg-white/10">
              {toComponentName(icon.meta.slug)}
            </code>
            <code className="font-mono text-xs">{icon.meta.slug}</code>
            {updated && <span className="text-xs">· updated {updated}</span>}
          </span>
        }
      />
      <IconEditor
        key={icon.meta.updatedAt}
        initial={{ meta: icon.meta, svg: icon.svg }}
        knownTags={tags}
      />
    </>
  )
}
