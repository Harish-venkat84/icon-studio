'use client'

import { Check, Copy } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useState } from 'react'
import { highlight } from 'sugar-high'
import { cn } from '@/lib/cn'

export function highlightTsx(code: string) {
  return highlight(code)
}

interface CodeBlockProps {
  code: string
  language: 'bash' | 'tsx'
  className?: string
}

export function CodeBlock({ code, language, className }: CodeBlockProps) {
  const [copied, setCopied] = useState(false)

  const copy = async () => {
    await navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div
      className={cn(
        'group relative overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950 dark:border-white/10',
        className
      )}
    >
      <motion.button
        type="button"
        onClick={() => void copy()}
        whileTap={{ scale: 0.9 }}
        aria-label="Copy code"
        className="absolute top-2 right-2 z-10 flex items-center gap-1 rounded-lg border border-white/10 bg-zinc-900/90 px-2 py-1 text-[11px] text-zinc-400 opacity-0 transition group-hover:opacity-100 hover:text-white focus:opacity-100"
      >
        <AnimatePresence mode="wait" initial={false}>
          <motion.span
            key={copied ? 'done' : 'copy'}
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.5, opacity: 0 }}
            transition={{ duration: 0.12 }}
            className="flex items-center gap-1"
          >
            {copied ? <Check className="size-3 text-emerald-400" /> : <Copy className="size-3" />}
            {copied ? 'Copied' : 'Copy'}
          </motion.span>
        </AnimatePresence>
      </motion.button>
      {language === 'bash' ? (
        <pre className="code-scroll overflow-x-auto px-4 py-3 font-mono text-xs leading-relaxed text-zinc-200">
          {code.split('\n').map((line, index) => (
            <div key={index}>
              <span className="mr-2 text-emerald-400 select-none">$</span>
              {line}
            </div>
          ))}
        </pre>
      ) : (
        <pre className="code-highlight code-scroll overflow-x-auto px-4 py-3 font-mono text-xs leading-relaxed">
          <code dangerouslySetInnerHTML={{ __html: highlightTsx(code) }} />
        </pre>
      )}
    </div>
  )
}
