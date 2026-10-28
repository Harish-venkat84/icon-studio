import { Skeleton } from '@/components/ui/skeleton'
import { TopLoader } from '@/components/ui/top_loader'

export default function LoadingRelease() {
  return (
    <div className="mx-auto max-w-3xl">
      <TopLoader />
      <div className="mb-8 space-y-3">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-10 w-72" />
        <Skeleton className="h-4 w-full" />
      </div>
      <div className="surface overflow-hidden">
        <div className="space-y-3 p-8">
          <Skeleton className="h-3 w-28" />
          <Skeleton className="h-10 w-64" />
        </div>
        <div className="grid gap-3 border-t border-zinc-200/70 p-8 sm:grid-cols-3 dark:border-white/5">
          {[0, 1, 2].map((index) => (
            <Skeleton key={index} className="h-20 rounded-xl" />
          ))}
        </div>
      </div>
    </div>
  )
}
