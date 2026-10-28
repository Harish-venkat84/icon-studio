'use client'

import { parseTags } from '@icon-studio/core/meta'
import { Plus } from 'lucide-react'

const MAX_SUGGESTIONS = 10

interface TagFieldProps {
  value: string
  onChange: (value: string) => void
  /** Tags already used in the library, most used first. */
  suggestions: string[]
  placeholder: string
}

export function TagField({ value, onChange, suggestions, placeholder }: TagFieldProps) {
  const current = parseTags(value)
  const available = suggestions.filter((tag) => !current.includes(tag)).slice(0, MAX_SUGGESTIONS)

  return (
    <>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onBlur={() => onChange(current.join(', '))}
        placeholder={placeholder}
        className="field"
      />
      {available.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {available.map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={() => onChange([...current, tag].join(', '))}
              className="inline-flex items-center gap-1 rounded-full border border-zinc-200 px-2 py-0.5 font-mono text-[11px] text-zinc-600 transition hover:border-brand-500/40 hover:bg-brand-500/10 hover:text-brand-700 dark:border-white/10 dark:text-zinc-400 dark:hover:text-brand-300"
            >
              <Plus className="size-3" />
              {tag}
            </button>
          ))}
        </div>
      )}
    </>
  )
}
