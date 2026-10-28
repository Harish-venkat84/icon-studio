import { Skeleton } from '@/components/ui/skeleton'
import { TopLoader } from '@/components/ui/top_loader'

export default function LoadingImages() {
  return (
    <>
      <TopLoader />
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-3">
          <Skeleton className="h-3 w-40" />
          <Skeleton className="h-10 w-56" />
          <Skeleton className="h-4 w-96 max-w-full" />
        </div>
        <Skeleton className="h-10 w-32 rounded-xl" />
      </div>
      <div className="surface mb-6 flex flex-col gap-3 p-4 sm:flex-row sm:justify-between">
        <Skeleton className="h-10 w-full rounded-xl sm:w-80" />
        <Skeleton className="h-9 w-44 rounded-xl" />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 8 }, (_, index) => (
          <div
            key={index}
            className="surface overflow-hidden"
            style={{ opacity: 1 - index * 0.08 }}
          >
            <Skeleton className="h-48 rounded-none" />
            <div className="space-y-2 px-3.5 py-3">
              <Skeleton className="h-3.5 w-2/3" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          </div>
        ))}
      </div>
    </>
  )
}
