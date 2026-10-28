import { Skeleton } from '@/components/ui/skeleton'
import { TopLoader } from '@/components/ui/top_loader'

export default function LoadingImage() {
  return (
    <>
      <TopLoader />
      <Skeleton className="mb-6 h-4 w-24" />
      <div className="mb-8 space-y-3">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-5 w-80 max-w-full" />
      </div>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,440px)_minmax(0,1fr)]">
        <div className="space-y-5">
          {[180, 300].map((height) => (
            <div key={height} className="surface space-y-4 p-5">
              <div className="flex items-center gap-2.5">
                <Skeleton className="size-7" />
                <Skeleton className="h-4 w-24" />
              </div>
              <Skeleton className="w-full rounded-xl" style={{ height }} />
            </div>
          ))}
        </div>
        <div className="surface overflow-hidden">
          <div className="flex justify-between border-b border-zinc-200/70 p-4 dark:border-white/5">
            <Skeleton className="h-7 w-40" />
            <Skeleton className="h-7 w-28" />
          </div>
          <Skeleton className="h-96 rounded-none" />
        </div>
      </div>
    </>
  )
}
