import { Plus } from 'lucide-react'
import Link from 'next/link'
import { connection } from 'next/server'
import { Gallery } from '@/components/gallery'
import { PageHeader } from '@/components/page_header'
import { StorageProblem } from '@/components/storage_problem'
import { listIcons, loadSafely } from '@/lib/icons'

export default async function IconsPage() {
  await connection()
  const result = await loadSafely(listIcons)
  if (!result.ok) return <StorageProblem message={result.error} />
  const icons = result.data

  return (
    <>
      <PageHeader
        eyebrow="@icon-studio/icons"
        title={
          <>
            Icon library{' '}
            <span className="bg-gradient-to-r from-brand-500 to-violet-500 bg-clip-text text-transparent">
              {icons.length}
            </span>
          </>
        }
        description="Every icon here ships as a typed React component on the next release. Click one to edit it, or copy its import."
        actions={
          <Link
            href="/icons/new"
            className="group inline-flex items-center gap-2 rounded-xl bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white shadow-lg shadow-zinc-900/10 transition hover:-translate-y-0.5 hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 dark:shadow-white/5 dark:hover:bg-zinc-200"
          >
            <Plus className="size-4 transition-transform duration-300 group-hover:rotate-90" />
            New icon
          </Link>
        }
      />
      <Gallery
        icons={icons.map(({ meta, root, error }) => ({ meta, root, ...(error ? { error } : {}) }))}
      />
    </>
  )
}
