import { cn } from '@/lib/cn'

export function Skeleton({
  className,
  style,
}: {
  className?: string
  style?: React.CSSProperties
}) {
  return (
    <div
      style={style}
      className={cn(
        'relative overflow-hidden rounded-lg bg-zinc-200/70 dark:bg-white/[0.06]',
        'after:absolute after:inset-0 after:-translate-x-full after:animate-shimmer after:bg-gradient-to-r after:from-transparent after:via-white/60 after:to-transparent dark:after:via-white/[0.07]',
        className
      )}
    />
  )
}
