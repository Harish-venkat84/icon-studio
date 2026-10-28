import { TriangleAlert } from 'lucide-react'

export function StorageProblem({ message }: { message: string }) {
  return (
    <div className="surface mx-auto max-w-2xl border-red-200/80 p-6 dark:border-red-500/20">
      <div className="flex gap-4">
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-red-500/10 text-red-600 dark:text-red-400">
          <TriangleAlert className="size-5" />
        </span>
        <div className="min-w-0 space-y-2 text-sm">
          <p className="font-semibold text-red-700 dark:text-red-300">
            The icon storage could not be read.
          </p>
          <p className="rounded-lg bg-red-500/5 px-3 py-2 font-mono text-xs break-all text-red-700 dark:text-red-300">
            {message}
          </p>
          <p className="text-zinc-600 dark:text-zinc-400">
            Check ICONS_STORAGE, ICONS_GITHUB_TOKEN (Contents read and write),
            ICONS_GITHUB_REPOSITORY and ICONS_GITHUB_BRANCH.
          </p>
        </div>
      </div>
    </div>
  )
}
