import { coalesce, Lru } from '../lru'
import type { FileChange, IconRepository, RepoFile } from './types'

interface GithubConfig {
  token: string
  repository: string
  branch: string
}

interface TreeEntry {
  path: string
  type: 'blob' | 'tree' | 'commit'
  sha: string
}

interface Head {
  commitSha: string
  treeSha: string
}

class GithubError extends Error {
  constructor(
    readonly status: number,
    message: string
  ) {
    super(message)
  }
}

/** How long a branch head lookup is reused, so one page render doesn't look it up once per file. */
const HEAD_TTL_MS = 1500
const BLOB_CACHE_BYTES = 64 * 1024 * 1024

export function createGithubRepository(config: GithubConfig): IconRepository {
  const base = `https://api.github.com/repos/${config.repository}`

  let cachedHead: { head: Head; expires: number } | null = null
  let commitsMade = 0
  const commitTrees = new Lru<string>(256)
  const trees = new Lru<TreeEntry[]>(8)
  const blobs = new Lru<Buffer>(BLOB_CACHE_BYTES, (content) => content.byteLength)
  const inflightHeads = new Map<string, Promise<Head>>()
  const inflightTrees = new Map<string, Promise<TreeEntry[]>>()
  const inflightBlobs = new Map<string, Promise<Buffer>>()

  const request = async <T>(pathname: string, init: RequestInit = {}): Promise<T> => {
    const response = await fetch(`${base}${pathname}`, {
      ...init,
      cache: 'no-store',
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: `Bearer ${config.token}`,
        'X-GitHub-Api-Version': '2022-11-28',
        ...(init.body ? { 'Content-Type': 'application/json' } : {}),
      },
    })
    if (!response.ok) {
      const body = (await response.json().catch(() => ({}))) as { message?: string }
      throw new GithubError(
        response.status,
        `GitHub ${init.method ?? 'GET'} ${pathname} failed (${response.status}): ${body.message ?? response.statusText}`
      )
    }
    return (await response.json()) as T
  }

  const treeOfCommit = async (commitSha: string) => {
    const cached = commitTrees.get(commitSha)
    if (cached) return cached
    const commit = await request<{ tree: { sha: string } }>(`/git/commits/${commitSha}`)
    commitTrees.set(commitSha, commit.tree.sha)
    return commit.tree.sha
  }

  const rememberHead = (head: Head) => {
    commitTrees.set(head.commitSha, head.treeSha)
    cachedHead = { head, expires: Date.now() + HEAD_TTL_MS }
  }

  /** The branch head; `fresh` skips the short-lived cache, as commits must. */
  const branchHead = (fresh = false): Promise<Head> => {
    if (!fresh && cachedHead && cachedHead.expires > Date.now()) {
      return Promise.resolve(cachedHead.head)
    }
    return coalesce(inflightHeads, fresh ? 'fresh' : 'cached', async () => {
      const generation = commitsMade
      const ref = await request<{ object: { sha: string } }>(
        `/git/ref/heads/${encodeURIComponent(config.branch)}`
      )
      const head = { commitSha: ref.object.sha, treeSha: await treeOfCommit(ref.object.sha) }
      if (generation === commitsMade) rememberHead(head)
      return head
    })
  }

  const treeEntries = (treeSha: string): Promise<TreeEntry[]> => {
    const cached = trees.get(treeSha)
    if (cached) return Promise.resolve(cached)
    return coalesce(inflightTrees, treeSha, async () => {
      const tree = await request<{ tree: TreeEntry[]; truncated: boolean }>(
        `/git/trees/${treeSha}?recursive=1`
      )
      if (tree.truncated) throw new Error('Repository tree is too large to list')
      const entries = tree.tree.filter((entry) => entry.type === 'blob')
      trees.set(treeSha, entries)
      return entries
    })
  }

  const blob = (sha: string): Promise<Buffer> => {
    const cached = blobs.get(sha)
    if (cached) return Promise.resolve(cached)
    return coalesce(inflightBlobs, sha, async () => {
      const data = await request<{ content: string; encoding: string }>(`/git/blobs/${sha}`)
      const content = Buffer.from(data.content, data.encoding as BufferEncoding)
      blobs.set(sha, content)
      return content
    })
  }

  const findBlob = async (treeSha: string, file: string) => {
    const entry = (await treeEntries(treeSha)).find((candidate) => candidate.path === file)
    return entry ? blob(entry.sha) : null
  }

  const treeEntryFor = async (change: FileChange) => {
    if (change.content === null) {
      return { path: change.path, mode: '100644', type: 'blob', sha: null }
    }
    if (typeof change.content === 'string') {
      return { path: change.path, mode: '100644', type: 'blob', content: change.content }
    }
    const created = await request<{ sha: string }>('/git/blobs', {
      method: 'POST',
      body: JSON.stringify({
        content: Buffer.from(change.content).toString('base64'),
        encoding: 'base64',
      }),
    })
    return { path: change.path, mode: '100644', type: 'blob', sha: created.sha }
  }

  return {
    kind: 'github',
    location: `${config.repository}@${config.branch}`,

    async listFiles(directory, include = () => true) {
      const { treeSha } = await branchHead()
      const entries = (await treeEntries(treeSha)).filter(
        (entry) =>
          entry.path.startsWith(`${directory}/`) &&
          !entry.path.slice(directory.length + 1).includes('/') &&
          include(entry.path)
      )
      return Promise.all(
        entries.map(async (entry): Promise<RepoFile> => ({
          path: entry.path,
          content: (await blob(entry.sha)).toString('utf8'),
        }))
      )
    },

    async readFile(file) {
      const { treeSha } = await branchHead()
      return (await findBlob(treeSha, file))?.toString('utf8') ?? null
    },

    async readBinary(file) {
      const { treeSha } = await branchHead()
      return findBlob(treeSha, file)
    },

    async readFileAt(sha, file) {
      return (await findBlob(await treeOfCommit(sha), file))?.toString('utf8') ?? null
    },

    async commit(message, changes: FileChange[], precondition) {
      for (let attempt = 0; ; attempt++) {
        const head = await branchHead(true)
        const existing = new Set((await treeEntries(head.treeSha)).map((entry) => entry.path))
        precondition?.(existing)

        const tree = await request<{ sha: string }>('/git/trees', {
          method: 'POST',
          body: JSON.stringify({
            base_tree: head.treeSha,
            tree: await Promise.all(
              changes
                .filter((change) => change.content !== null || existing.has(change.path))
                .map(treeEntryFor)
            ),
          }),
        })
        const commit = await request<{ sha: string }>('/git/commits', {
          method: 'POST',
          body: JSON.stringify({ message, tree: tree.sha, parents: [head.commitSha] }),
        })
        try {
          await request(`/git/refs/heads/${encodeURIComponent(config.branch)}`, {
            method: 'PATCH',
            body: JSON.stringify({ sha: commit.sha, force: false }),
          })
          commitsMade++
          rememberHead({ commitSha: commit.sha, treeSha: tree.sha })
          return
        } catch (error) {
          const retryable = error instanceof GithubError && error.status === 422 && attempt < 2
          if (!retryable) throw error
        }
      }
    },

    async changesSince(ref, directories) {
      const head = await branchHead()
      try {
        const comparison = await request<{
          merge_base_commit: { sha: string }
          files?: { filename: string; previous_filename?: string }[]
        }>(`/compare/${encodeURIComponent(ref)}...${head.commitSha}`)
        const paths = (comparison.files ?? [])
          .flatMap((file) =>
            file.previous_filename ? [file.previous_filename, file.filename] : [file.filename]
          )
          .filter((file) => directories.some((directory) => file.startsWith(`${directory}/`)))
        return { base: comparison.merge_base_commit.sha, head: head.commitSha, paths }
      } catch (error) {
        if (error instanceof GithubError && error.status === 404) return null
        throw error
      }
    },
  }
}
