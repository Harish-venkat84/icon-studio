import { Skeleton } from '@/components/ui/skeleton'
import { TopLoader } from '@/components/ui/top_loader'

export default function LoadingIcons() {
  return (
    <>
      <TopLoader />
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-3">
          <Skeleton className="h-3 w-32" />
          <Skeleton className="h-10 w-72" />
          <Skeleton className="h-4 w-96 max-w-full" />
        </div>
        <Skeleton className="h-10 w-32 rounded-xl" />
      </div>
      <div className="surface mb-6 flex flex-col gap-3 p-4 sm:flex-row">
        <Skeleton className="h-10 w-full rounded-xl sm:w-80" />
        <Skeleton className="h-9 w-56 rounded-xl" />
        <Skeleton className="h-9 w-full rounded-xl sm:ml-auto sm:w-96" />
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
        {Array.from({ length: 12 }, (_, index) => (
          <div
            key={index}
            className="surface overflow-hidden"
            style={{ opacity: 1 - index * 0.06 }}
          >
            <div className="flex h-36 items-center justify-center">
              <Skeleton className="size-10 rounded-xl" />
            </div>
            <div className="space-y-2 border-t border-zinc-200/70 px-3.5 py-3 dark:border-white/5">
              <Skeleton className="h-3.5 w-2/3" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          </div>
        ))}
      </div>
    </>
  )
}
