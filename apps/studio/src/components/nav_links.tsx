'use client'

import { motion } from 'motion/react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/cn'

const LINKS = [
  {
    href: '/',
    label: 'Icons',
    match: (path: string) => path === '/' || /^\/icons\/(?!new)/.test(path),
  },
  { href: '/icons/new', label: 'New icon', match: (path: string) => path === '/icons/new' },
  { href: '/images', label: 'Images', match: (path: string) => path.startsWith('/images') },
  { href: '/release', label: 'Release', match: (path: string) => path.startsWith('/release') },
]

export function NavLinks() {
  const pathname = usePathname()
  return (
    <nav className="flex items-center gap-1 text-sm">
      {LINKS.map((link) => {
        const active = link.match(pathname)
        return (
          <Link
            key={link.href}
            href={link.href}
            className={cn(
              'relative rounded-full px-3.5 py-1.5 font-medium transition-colors',
              active
                ? 'text-zinc-900 dark:text-white'
                : 'text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white'
            )}
          >
            {active && (
              <motion.span
                layoutId="nav-pill"
                className="absolute inset-0 rounded-full bg-zinc-900/[0.06] ring-1 ring-zinc-900/10 dark:bg-white/10 dark:ring-white/10"
                transition={{ type: 'spring', bounce: 0.25, duration: 0.5 }}
              />
            )}
            <span className="relative">{link.label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
