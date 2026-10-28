export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string
  title: React.ReactNode
  description?: React.ReactNode
  actions?: React.ReactNode
}) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div className="space-y-2">
        {eyebrow && (
          <p className="text-xs font-semibold tracking-[0.18em] text-brand-600 uppercase dark:text-brand-400">
            {eyebrow}
          </p>
        )}
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{title}</h1>
        {description && (
          <p className="max-w-2xl text-sm text-zinc-500 sm:text-base dark:text-zinc-400">
            {description}
          </p>
        )}
      </div>
      {actions}
    </div>
  )
}
