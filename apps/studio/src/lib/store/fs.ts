import { mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import type { FileChange, IconRepository, RepoFile } from './types'

export function createFsRepository(rootDir: string): IconRepository {
  const resolve = (relative: string) => {
    const absolute = path.resolve(rootDir, relative)
    if (!absolute.startsWith(path.resolve(rootDir) + path.sep)) {
      throw new Error(`Path escapes the repository: ${relative}`)
    }
    return absolute
  }

  const listPaths = async (directory: string) => {
    const entries = await readdir(resolve(directory), { withFileTypes: true }).catch(() => [])
    return entries.filter((entry) => entry.isFile()).map((entry) => `${directory}/${entry.name}`)
  }

  let queue: Promise<unknown> = Promise.resolve()

  return {
    kind: 'fs',
    location: rootDir,

    async listFiles(directory, include = () => true) {
      const paths = (await listPaths(directory)).filter(include)
      return Promise.all(
        paths.map(async (file): Promise<RepoFile> => ({
          path: file,
          content: await readFile(resolve(file), 'utf8'),
        }))
      )
    },

    async readFile(file) {
      return readFile(resolve(file), 'utf8').catch(() => null)
    },

    async readBinary(file) {
      return readFile(resolve(file)).catch(() => null)
    },

    commit(_message, changes: FileChange[], precondition) {
      const run = queue.then(async () => {
        if (precondition) {
          const directories = [...new Set(changes.map((change) => path.posix.dirname(change.path)))]
          const existing = (await Promise.all(directories.map(listPaths))).flat()
          precondition(new Set(existing))
        }
        for (const change of changes) {
          const target = resolve(change.path)
          if (change.content === null) {
            await rm(target, { force: true })
          } else {
            await mkdir(path.dirname(target), { recursive: true })
            await writeFile(target, change.content)
          }
        }
      })
      queue = run.catch(() => undefined)
      return run
    },

    async changesSince() {
      return null
    },

    async readFileAt() {
      return null
    },
  }
}
