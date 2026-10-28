import { Skeleton } from '@/components/ui/skeleton'
import { TopLoader } from '@/components/ui/top_loader'

export default function LoadingIcon() {
  return (
    <>
      <TopLoader />
      <Skeleton className="mb-6 h-4 w-20" />
      <div className="mb-8 space-y-3">
        <Skeleton className="h-3 w-28" />
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-5 w-80 max-w-full" />
      </div>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,440px)_minmax(0,1fr)]">
        <div className="space-y-5">
          {[180, 260, 160].map((height) => (
            <div key={height} className="surface space-y-4 p-5">
              <div className="flex items-center gap-2.5">
                <Skeleton className="size-7" />
                <Skeleton className="h-4 w-24" />
              </div>
              <Skeleton className="w-full rounded-xl" style={{ height }} />
            </div>
          ))}
        </div>
        <div className="space-y-5">
          <div className="surface overflow-hidden">
            <div className="flex gap-3 border-b border-zinc-200/70 p-4 dark:border-white/5">
              <Skeleton className="h-7 w-40" />
              <Skeleton className="h-7 w-48" />
              <Skeleton className="h-7 w-44" />
            </div>
            <div className="flex min-h-80 items-center justify-center">
              <Skeleton className="size-24 rounded-2xl" />
            </div>
          </div>
          <div className="h-72 rounded-2xl border border-zinc-800 bg-zinc-950 p-4 dark:border-white/10">
            <div className="space-y-2.5">
              {[70, 45, 90, 60, 80, 35].map((width, index) => (
                <Skeleton
                  key={index}
                  className="h-3 bg-white/[0.06]"
                  style={{ width: `${width}%` }}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
