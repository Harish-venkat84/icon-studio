'use client'

import type { ReleaseEntry } from '@icon-studio/core/release'
import { Rocket, Sparkles, TriangleAlert } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { releaseAction } from '@/app/actions'
import { cn } from '@/lib/cn'
import {
  bumpProblem,
  bumpVersion as next,
  recommendedBump,
  type ReleaseImpact,
  type VersionBump as Bump,
} from '@/lib/version'
import { ConfirmDialog } from './ui/confirm_dialog'
import { Spinner } from './ui/spinner'
import { useToast } from './ui/toast'

function bumpOptions(version: string): { value: Bump; label: string; description: string }[] {
  if (version.startsWith('0.')) {
    return [
      { value: 'patch', label: 'Patch', description: 'New icons, fixed artwork, new tags' },
      { value: 'minor', label: 'Minor', description: 'Renamed or deleted icons, removed props' },
      { value: 'major', label: 'Major', description: 'Declare the icon API stable' },
    ]
  }
  return [
    { value: 'patch', label: 'Patch', description: 'Fixed artwork, new tags' },
    { value: 'minor', label: 'Minor', description: 'New icons or new props' },
    { value: 'major', label: 'Major', description: 'Renamed or deleted icons, removed props' },
  ]
}

const CHANGE_STYLES: Record<ReleaseEntry['change'], { sign: string; className: string }> = {
  added: {
    sign: '+',
    className: 'border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
  },
  updated: {
    sign: '~',
    className: 'border-brand-500/20 bg-brand-500/10 text-brand-700 dark:text-brand-300',
  },
  removed: {
    sign: '−',
    className: 'border-rose-500/20 bg-rose-500/10 text-rose-700 line-through dark:text-rose-300',
  },
}

interface ReleaseFormProps {
  version: string
  changes: ReleaseEntry[] | null
  impact: ReleaseImpact | null
  changesNote: string
}

export function ReleaseForm({ version, changes, impact, changesNote }: ReleaseFormProps) {
  const router = useRouter()
  const toast = useToast()
  const recommended = impact ? recommendedBump(version, impact) : null
  const [bump, setBump] = useState<Bump>(recommended ?? 'patch')
  const [confirming, setConfirming] = useState(false)
  const [released, setReleased] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const target = next(version, bump)
  const problem = bumpProblem(version, bump, impact)
  const breakingNotes = (changes ?? [])
    .filter((entry) => entry.impact === 'breaking')
    .flatMap((entry) => entry.notes)

  const release = () => {
    startTransition(async () => {
      const result = await releaseAction(bump)
      setConfirming(false)
      if (!result.ok) {
        toast(result.error, 'error')
        return
      }
      setReleased(result.data.version)
      toast(`Version ${result.data.version} committed`)
      router.refresh()
    })
  }

  return (
    <div className="surface relative overflow-hidden">
      <div className="pointer-events-none absolute -top-24 -right-24 size-64 rounded-full bg-brand-500/15 blur-3xl" />
      <div className="relative grid gap-6 p-6 sm:grid-cols-[auto_1fr] sm:items-center sm:p-8">
        <div>
          <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Current version</p>
          <div className="mt-1 flex items-baseline gap-3 font-mono">
            <span className="text-4xl font-semibold tracking-tight">{version}</span>
            <span className="text-zinc-400">→</span>
            <span className="relative inline-block min-w-[5ch] overflow-hidden text-4xl font-semibold tracking-tight">
              <AnimatePresence mode="popLayout" initial={false}>
                <motion.span
                  key={target}
                  initial={{ y: '100%', opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: '-100%', opacity: 0 }}
                  transition={{ type: 'spring', bounce: 0.3, duration: 0.45 }}
                  className="inline-block bg-gradient-to-r from-brand-500 to-violet-500 bg-clip-text text-transparent"
                >
                  {target}
                </motion.span>
              </AnimatePresence>
            </span>
          </div>
        </div>
        <div className="sm:justify-self-end">
          {changes === null ? (
            <p className="text-sm text-zinc-500 dark:text-zinc-400">{changesNote}</p>
          ) : changes.length === 0 ? (
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              No icon changes since v{version}.
            </p>
          ) : (
            <div className="space-y-2">
              <p className="text-xs font-medium text-zinc-500 sm:text-right dark:text-zinc-400">
                {changes.length} change{changes.length === 1 ? '' : 's'} since v{version}
              </p>
              <motion.ul
                initial="hidden"
                animate="show"
                variants={{ hidden: {}, show: { transition: { staggerChildren: 0.04 } } }}
                className="flex flex-wrap gap-1.5 sm:justify-end"
              >
                {changes.map((entry) => {
                  const style = CHANGE_STYLES[entry.change]
                  return (
                    <motion.li
                      key={`${entry.kind}:${entry.slug}`}
                      variants={{
                        hidden: { opacity: 0, scale: 0.8 },
                        show: { opacity: 1, scale: 1 },
                      }}
                      title={entry.notes.join('\n') || undefined}
                      className={cn(
                        'rounded-full border px-2.5 py-0.5 font-mono text-xs',
                        style.className
                      )}
                    >
                      {style.sign} {entry.kind === 'image' ? `image: ${entry.slug}` : entry.slug}
                    </motion.li>
                  )
                })}
              </motion.ul>
            </div>
          )}
        </div>
      </div>

      <div className="relative border-t border-zinc-200/70 p-6 sm:p-8 dark:border-white/5">
        {breakingNotes.length > 0 && (
          <div className="mb-6 flex gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-800 dark:text-amber-200">
            <TriangleAlert className="mt-0.5 size-4 shrink-0" />
            <div>
              <p className="font-medium">This release breaks apps that use:</p>
              <ul className="mt-1 list-disc pl-5">
                {breakingNotes.map((note) => (
                  <li key={note}>{note}</li>
                ))}
              </ul>
              <p className="mt-2 text-amber-700 dark:text-amber-300">
                It needs a {recommended} release, and apps upgrade to it on purpose.
              </p>
            </div>
          </div>
        )}
        <div role="radiogroup" className="grid gap-3 sm:grid-cols-3">
          {bumpOptions(version).map((option) => {
            const active = bump === option.value
            const blocked = bumpProblem(version, option.value, impact) !== null
            return (
              <motion.button
                key={option.value}
                type="button"
                role="radio"
                aria-checked={active}
                disabled={blocked}
                onClick={() => setBump(option.value)}
                whileHover={blocked ? undefined : { y: -2 }}
                whileTap={blocked ? undefined : { scale: 0.98 }}
                className={cn(
                  'relative rounded-xl border p-4 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-40',
                  active
                    ? 'border-transparent'
                    : 'border-zinc-200 hover:border-zinc-300 dark:border-white/10 dark:hover:border-white/20'
                )}
              >
                {active && (
                  <motion.span
                    layoutId="bump-active"
                    className="absolute inset-0 rounded-xl bg-brand-500/[0.07] ring-2 ring-brand-500"
                    transition={{ type: 'spring', bounce: 0.2, duration: 0.4 }}
                  />
                )}
                <span className="relative block text-sm font-semibold">
                  {option.label}{' '}
                  <span className="font-mono font-normal text-zinc-500 dark:text-zinc-400">
                    {next(version, option.value)}
                  </span>
                  {option.value === recommended && (
                    <span className="ml-1.5 rounded-full bg-brand-500/10 px-1.5 py-0.5 text-[10px] font-medium text-brand-700 dark:text-brand-300">
                      Recommended
                    </span>
                  )}
                </span>
                <span className="relative mt-0.5 block text-xs text-zinc-500 dark:text-zinc-400">
                  {option.description}
                </span>
              </motion.button>
            )
          })}
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-4">
          <motion.button
            type="button"
            onClick={() => setConfirming(true)}
            disabled={pending || problem !== null}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            className="group inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-brand-500 to-violet-500 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-brand-500/25 disabled:opacity-60"
          >
            {pending ? (
              <Spinner />
            ) : (
              <Rocket className="size-4 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            )}
            Release {target}
          </motion.button>
          <AnimatePresence>
            {released && (
              <motion.p
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0 }}
                className="flex items-center gap-1.5 text-sm font-medium text-emerald-600 dark:text-emerald-400"
              >
                <Sparkles className="size-4" />
                {released} committed. It publishes once it is on main.
              </motion.p>
            )}
          </AnimatePresence>
        </div>
      </div>

      <ConfirmDialog
        open={confirming}
        onClose={() => setConfirming(false)}
        onConfirm={release}
        pending={pending}
        title={`Release ${target}?`}
        description={
          <>
            This commits version <code className="font-mono">{target}</code> to the studio branch.
            It is published when that commit is on <code className="font-mono">main</code>.
          </>
        }
        confirmLabel={`Release ${target}`}
      />
    </div>
  )
}
