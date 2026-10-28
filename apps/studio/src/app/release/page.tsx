import { GitBranch, Package } from 'lucide-react'
import { connection } from 'next/server'
import { PageHeader } from '@/components/page_header'
import { ReleaseForm } from '@/components/release_form'
import { StorageProblem } from '@/components/storage_problem'
import { getReleaseInfo, loadSafely, PACKAGE_NAME } from '@/lib/icons'

export default async function ReleasePage() {
  await connection()
  const result = await loadSafely(getReleaseInfo)
  if (!result.ok) return <StorageProblem message={result.error} />
  const { version, changes, impact, storage } = result.data

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        eyebrow="Release"
        title="Ship a new version"
        description={
          <>
            Bumping the version commits{' '}
            <code className="font-mono text-sm">packages/icons/package.json</code> to the
            studio&apos;s branch. When it reaches <code className="font-mono text-sm">main</code>,
            CI builds and publishes <code className="font-mono text-sm">{PACKAGE_NAME}</code>.
          </>
        }
      />
      <ReleaseForm
        version={version}
        changes={changes}
        impact={impact}
        changesNote={
          storage === 'github'
            ? `Tag v${version} was not found, so changes can't be listed yet.`
            : 'Change tracking is only available with GitHub storage.'
        }
      />
      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        <Step icon={<GitBranch className="size-4" />} title="1. Release here">
          Commits the new version to the studio branch.
        </Step>
        <Step icon={<Package className="size-4" />} title="2. Publish from main">
          Once the commit is on main, the publish workflow builds the components, publishes the
          package and tags it.
        </Step>
      </div>
    </div>
  )
}

function Step({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode
  title: string
  children: React.ReactNode
}) {
  return (
    <div className="surface flex gap-3 p-4">
      <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-brand-500/10 text-brand-600 dark:text-brand-400">
        {icon}
      </span>
      <div className="text-sm">
        <p className="font-medium">{title}</p>
        <p className="text-zinc-500 dark:text-zinc-400">{children}</p>
      </div>
    </div>
  )
}
