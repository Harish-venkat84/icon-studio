import { ArrowLeft, Ghost } from 'lucide-react'
import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="surface mx-auto flex max-w-lg flex-col items-center gap-4 px-6 py-16 text-center">
      <span className="grid size-14 place-items-center rounded-2xl bg-zinc-900/5 text-zinc-500 dark:bg-white/5 dark:text-zinc-400">
        <Ghost className="size-7" />
      </span>
      <div className="space-y-1">
        <p className="text-lg font-semibold">This icon does not exist</p>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          It may have been renamed or deleted.
        </p>
      </div>
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-600 hover:underline dark:text-brand-400"
      >
        <ArrowLeft className="size-4" /> Back to all icons
      </Link>
    </div>
  )
}
