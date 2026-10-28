/** Least-recently-used cache that evicts once the summed `weigh` of its values exceeds `capacity`. */
export class Lru<V> {
  private readonly entries = new Map<string, { value: V; weight: number }>()
  private total = 0

  constructor(
    private readonly capacity: number,
    private readonly weigh: (value: V) => number = () => 1
  ) {}

  get(key: string): V | undefined {
    const entry = this.entries.get(key)
    if (!entry) return undefined
    this.entries.delete(key)
    this.entries.set(key, entry)
    return entry.value
  }

  set(key: string, value: V) {
    this.delete(key)
    const weight = this.weigh(value)
    this.entries.set(key, { value, weight })
    this.total += weight
    for (const [oldest, entry] of this.entries) {
      if (this.total <= this.capacity || this.entries.size === 1) break
      this.entries.delete(oldest)
      this.total -= entry.weight
    }
  }

  delete(key: string) {
    const entry = this.entries.get(key)
    if (!entry) return
    this.entries.delete(key)
    this.total -= entry.weight
  }
}

/** Shares one in-flight `load` between concurrent callers asking for the same key. */
export function coalesce<T>(
  inflight: Map<string, Promise<T>>,
  key: string,
  load: () => Promise<T>
): Promise<T> {
  const pending = inflight.get(key)
  if (pending) return pending
  const promise = load().finally(() => inflight.delete(key))
  inflight.set(key, promise)
  return promise
}
