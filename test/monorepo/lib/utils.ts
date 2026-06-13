export function cn(...classes: (string | boolean | undefined | null | Record<string, boolean | undefined>)[]): string {
  const result: string[] = []
  for (const cls of classes) {
    if (!cls) continue
    if (typeof cls === 'string') { result.push(cls); continue }
    if (typeof cls === 'object') {
      for (const [key, val] of Object.entries(cls)) {
        if (val) result.push(key)
      }
    }
  }
  return result.join(' ')
}

export function invariant(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`Invariant: ${message}`)
}

export function range(n: number): number[] {
  return Array.from({ length: n }, (_, i) => i)
}

export function pick<T extends Record<string, unknown>, K extends keyof T>(obj: T, keys: K[]): Pick<T, K> {
  const result = {} as Pick<T, K>
  for (const key of keys) result[key] = obj[key]
  return result
}

export function omit<T extends Record<string, unknown>, K extends keyof T>(obj: T, keys: K[]): Omit<T, K> {
  const result = { ...obj }
  for (const key of keys) delete result[key as string]
  return result
}

export function debounce<T extends (...args: unknown[]) => unknown>(fn: T, ms: number): (...args: Parameters<T>) => void {
  let timer: ReturnType<typeof setTimeout>
  return (...args: Parameters<T>) => {
    clearTimeout(timer)
    timer = setTimeout(() => fn(...args), ms)
  }
}

export function throttle<T extends (...args: unknown[]) => unknown>(fn: T, ms: number): (...args: Parameters<T>) => void {
  let last = 0
  return (...args: Parameters<T>) => {
    const now = Date.now()
    if (now - last >= ms) { last = now; fn(...args) }
  }
}
