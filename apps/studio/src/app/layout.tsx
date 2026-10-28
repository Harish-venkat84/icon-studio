import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import Link from 'next/link'
import { NavLinks } from '@/components/nav_links'
import { Providers } from '@/components/providers'
import { ThemeToggle } from '@/components/theme_toggle'
import { getRepository } from '@/lib/icons'
import { isReadOnly, READ_ONLY_MESSAGE } from '@/lib/read_only'
import { themeInitScript } from '@/lib/theme'
import { currentUser } from '@/lib/user'
import './globals.css'

const geistSans = Geist({ subsets: ['latin'], variable: '--font-geist-sans' })
const geistMono = Geist_Mono({ subsets: ['latin'], variable: '--font-geist-mono' })

export const metadata: Metadata = {
  title: 'Icon Studio',
  description: 'Upload, preview and publish your SVG icons',
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const user = await currentUser()
  const readOnly = isReadOnly()
  const repository = (() => {
    try {
      return getRepository()
    } catch {
      return null
    }
  })()

  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable}`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="min-h-dvh">
        <Backdrop />
        <Providers readOnly={readOnly}>
          {readOnly && (
            <div className="border-b border-amber-500/20 bg-amber-500/10 px-4 py-2 text-center text-sm text-amber-800 dark:text-amber-300">
              {READ_ONLY_MESSAGE}
            </div>
          )}
          <header className="sticky top-0 z-40 border-b border-zinc-200/60 bg-zinc-50/70 backdrop-blur-xl dark:border-white/5 dark:bg-zinc-950/60">
            <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-6 gap-y-3 px-4 py-3 sm:px-6">
              <Link href="/" className="group flex items-center gap-2.5">
                <Logo />
                <span className="font-semibold tracking-tight">
                  Icon <span className="text-zinc-400 dark:text-zinc-500">Studio</span>
                </span>
              </Link>
              <div className="order-last w-full sm:order-none sm:w-auto">
                <NavLinks />
              </div>
              <div className="ml-auto flex items-center gap-3">
                {repository && (
                  <span
                    title={repository.location}
                    className="hidden max-w-56 items-center gap-1.5 truncate rounded-full border border-zinc-200/80 bg-white/60 px-2.5 py-1 font-mono text-[11px] text-zinc-500 md:flex dark:border-white/10 dark:bg-white/5 dark:text-zinc-400"
                  >
                    <span className="size-1.5 shrink-0 rounded-full bg-emerald-500 shadow-[0_0_8px] shadow-emerald-500/60" />
                    <span className="truncate">{repository.location}</span>
                  </span>
                )}
                <ThemeToggle />
                <span
                  title={user}
                  className="grid size-8 place-items-center rounded-full bg-gradient-to-br from-brand-400 to-brand-700 text-xs font-semibold text-white uppercase shadow-sm shadow-brand-500/30"
                >
                  {user.slice(0, 2)}
                </span>
              </div>
            </div>
          </header>
          <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10">{children}</main>
        </Providers>
      </body>
    </html>
  )
}

function Logo() {
  return (
    <span className="grid size-8 place-items-center rounded-xl bg-zinc-900 shadow-sm transition-transform duration-300 group-hover:rotate-6 dark:bg-white">
      <svg viewBox="0 0 16 16" className="size-4" aria-hidden>
        <rect x="2" y="2" width="5" height="5" rx="1.2" className="fill-brand-500" />
        <rect x="9" y="2" width="5" height="5" rx="1.2" className="fill-white dark:fill-zinc-900" />
        <rect x="2" y="9" width="5" height="5" rx="1.2" className="fill-white dark:fill-zinc-900" />
        <rect x="9" y="9" width="5" height="5" rx="2.5" className="fill-white dark:fill-zinc-900" />
      </svg>
    </span>
  )
}

function Backdrop() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div className="dot-grid absolute inset-0 [mask-image:radial-gradient(ellipse_at_top,black_20%,transparent_70%)] opacity-60 dark:opacity-40" />
      <div className="absolute -top-40 -left-32 size-[36rem] animate-drift rounded-full bg-brand-400/25 blur-[120px] dark:bg-brand-500/20" />
      <div className="absolute top-20 -right-40 size-[32rem] animate-drift-slow rounded-full bg-violet-400/20 blur-[120px] dark:bg-violet-500/15" />
    </div>
  )
}
