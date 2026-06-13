import { readdirSync, statSync } from 'node:fs'
import { join, resolve, relative } from 'node:path'
import type { FileEntry } from './types.js'
import { DEFAULT_INCLUDE_EXTS, DEFAULT_EXCLUDE_DIRS } from './types.js'

export function scanFiles(
  dir: string,
  includeExts: string[] = DEFAULT_INCLUDE_EXTS,
  excludeDirs: string[] = DEFAULT_EXCLUDE_DIRS,
): FileEntry[] {
  const results: FileEntry[] = []
  const absDir = resolve(dir)

  function walk(current: string): void {
    let entries: string[]
    try {
      entries = readdirSync(current)
    } catch {
      return
    }

    for (const name of entries) {
      const full = join(current, name)

      let stat
      try { stat = statSync(full) } catch { continue }

      if (stat.isDirectory()) {
        if (!excludeDirs.includes(name)) walk(full)
      } else {
        const ext = getExt(name)
        if (includeExts.includes(ext)) {
          results.push({
            fullPath: full,
            relativePath: relative(absDir, full),
            ext,
          })
        }
      }
    }
  }

  walk(absDir)
  return results
}

function getExt(name: string): string {
  const dot = name.lastIndexOf('.')
  if (dot === -1) return ''
  return name.slice(dot).toLowerCase()
}

export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  if (n < 1024 * 1024 * 1024) return `${(n / (1024 * 1024)).toFixed(1)} MB`
  return `${(n / (1024 * 1024 * 1024)).toFixed(2)} GB`
}

export type CompressionMethod = 'zstd' | 'gzip'
