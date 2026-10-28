'use client'

import type { UsageGuide, UsagePlatform } from '@icon-studio/core/usage'
import { BookOpen, Globe, Smartphone } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useState } from 'react'
import { CodeBlock } from './ui/code_block'
import { Segmented } from './ui/segmented'

interface UsagePanelProps {
  guides: Record<UsagePlatform, UsageGuide>
}

export function UsagePanel({ guides }: UsagePanelProps) {
  const [platform, setPlatform] = useState<UsagePlatform>('web')
  const guide = guides[platform]

  return (
    <section className="surface overflow-hidden">
      <div className="flex flex-wrap items-center gap-3 border-b border-zinc-200/70 px-5 py-4 dark:border-white/5">
        <span className="grid size-7 place-items-center rounded-lg bg-zinc-900/5 text-zinc-600 dark:bg-white/10 dark:text-zinc-300">
          <BookOpen className="size-4" />
        </span>
        <h2 className="text-sm font-semibold">How to use it</h2>
        <Segmented
          size="sm"
          className="ml-auto"
          value={platform}
          onChange={setPlatform}
          options={[
            {
              value: 'web',
              label: (
                <>
                  <Globe className="size-3.5" /> Next.js
                </>
              ),
            },
            {
              value: 'native',
              label: (
                <>
                  <Smartphone className="size-3.5" /> React Native
                </>
              ),
            },
          ]}
        />
      </div>

      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={platform}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.2 }}
          className="space-y-6 p-5"
        >
          <p className="text-sm text-zinc-600 dark:text-zinc-400">{guide.intro}</p>

          <ol className="space-y-6">
            {guide.steps.map((step, index) => (
              <motion.li
                key={step.title}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.06 }}
                className="relative pl-10"
              >
                <span className="absolute top-0 left-0 grid size-7 place-items-center rounded-full bg-gradient-to-br from-brand-500 to-violet-500 text-xs font-semibold text-white shadow-sm shadow-brand-500/30">
                  {index + 1}
                </span>
                {index < guide.steps.length - 1 && (
                  <span className="absolute top-8 bottom-[-1.25rem] left-[13px] w-px bg-gradient-to-b from-brand-500/40 to-transparent" />
                )}
                <h3 className="text-sm font-semibold">{step.title}</h3>
                <p className="mt-0.5 mb-3 text-xs text-zinc-500 dark:text-zinc-400">
                  {step.description}
                </p>
                <CodeBlock code={step.code} language={step.language} />
              </motion.li>
            ))}
          </ol>

          <div>
            <h3 className="mb-2 text-sm font-semibold">{guide.table.title}</h3>
            <div className="overflow-x-auto rounded-xl border border-zinc-200/80 dark:border-white/10">
              <table className="w-full text-left text-xs">
                <thead className="bg-zinc-50 text-zinc-500 dark:bg-white/[0.03] dark:text-zinc-400">
                  <tr>
                    <th className="px-3 py-2 font-medium">Name</th>
                    <th className="px-3 py-2 font-medium">Type</th>
                    <th className="px-3 py-2 font-medium">Default / value</th>
                    <th className="px-3 py-2 font-medium">Description</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200/70 dark:divide-white/5">
                  {guide.table.rows.map((row) => (
                    <tr key={row.name}>
                      <td className="px-3 py-2 font-mono font-medium text-brand-700 dark:text-brand-300">
                        {row.name}
                      </td>
                      <td className="px-3 py-2 font-mono text-zinc-500 dark:text-zinc-400">
                        {row.type}
                      </td>
                      <td className="px-3 py-2 font-mono">
                        {/^#[0-9a-f]{6}$/i.test(row.value) && (
                          <span
                            className="mr-1.5 inline-block size-2.5 rounded-full align-middle ring-1 ring-zinc-900/10"
                            style={{ backgroundColor: row.value }}
                          />
                        )}
                        {row.value}
                      </td>
                      <td className="px-3 py-2 text-zinc-600 dark:text-zinc-400">
                        {row.description}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </section>
  )
}
