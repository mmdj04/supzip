import { readFile, writeFile, mkdtemp } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { readdirSync, statSync } from 'node:fs'
import { resolve, relative } from 'node:path'
import AdmZip from 'adm-zip'
import { formatBytes } from './utils.js'
import { getLangTag, SUPPORTED_EXTS, RAW_TAG, DEFAULT_EXCLUDE_DIRS, FLAG_COMPRESSED } from './types.js'
import type { ArchiveDataV3 } from './types.js'
import { compressBlob, isZstdAvailable } from './dict.js'
import { serializeArchiveV3 } from './archive.js'

export interface PackOptions {
  excludeDirs?: string[]
}

async function resolveInput(input: string): Promise<string> {
  if (input.endsWith('.zip')) {
    const zip = new AdmZip(input)
    const tmp = await mkdtemp(join(tmpdir(), 'supz-zip-'))
    zip.extractAllTo(tmp, true)
    console.log(`Extracted .zip to ${tmp}`)
    return tmp
  }
  return input
}

function scanAllFiles(dir: string, excludeDirs: string[]): Array<{ fullPath: string; relativePath: string; ext: string }> {
  const results: Array<{ fullPath: string; relativePath: string; ext: string }> = []
  const absDir = resolve(dir)

  function walk(current: string): void {
    let entries: string[]
    try { entries = readdirSync(current) } catch { return }
    for (const name of entries) {
      const full = join(current, name)
      let stat: import('node:fs').Stats
      try { stat = statSync(full) } catch { continue }
      if (stat.isDirectory()) {
        if (!excludeDirs.includes(name)) walk(full)
      } else {
        const dot = name.lastIndexOf('.')
        const ext = dot === -1 ? '' : name.slice(dot).toLowerCase()
        results.push({ fullPath: full, relativePath: relative(absDir, full), ext })
      }
    }
  }

  walk(absDir)
  return results
}

export async function pack(inputArg: string, outputFile: string, options: PackOptions = {}): Promise<void> {
  const dir = await resolveInput(inputArg)
  const allFiles = scanAllFiles(dir, options.excludeDirs ?? DEFAULT_EXCLUDE_DIRS)
  console.log(`Found ${allFiles.length} total files`)

  const zstdAvail = await isZstdAvailable()
  console.log(`Zstandard: ${zstdAvail ? 'available' : 'NOT available (falling back to brotli)'}`)

  // Group all files by tag (text gets language tag, others get extension)
  const groups = new Map<string, typeof allFiles>()
  for (const f of allFiles) {
    const tag = SUPPORTED_EXTS.has(f.ext) ? getLangTag(f.ext) : f.ext || '__'
    const list = groups.get(tag) ?? []
    list.push(f)
    groups.set(tag, list)
  }

  const tags: ArchiveDataV3['tags'] = []
  let totalOriginal = 0
  let totalCompressed = 0

  for (const [tag, fileList] of groups) {
    const blobs: Buffer[] = []
    const fields: Array<{ path: string; offset: number; length: number }> = []
    let offset = 0

    for (const f of fileList) {
      const data = await readFile(f.fullPath)
      blobs.push(data)
      fields.push({ path: f.relativePath, offset, length: data.length })
      offset += data.length
      totalOriginal += data.length
    }

    const blob = Buffer.concat(blobs)
    const compressed = await compressBlob(blob)
    tags.push({ tag, flags: FLAG_COMPRESSED, fields, blobSize: blob.length, data: compressed })
    totalCompressed += compressed.length
    console.log(`  ${tag}: ${fileList.length} files, ${formatBytes(blob.length)} → ${formatBytes(compressed.length)} (${(blob.length / compressed.length).toFixed(2)}x)`)
  }

  const archive = serializeArchiveV3({ version: 3, tags })
  await writeFile(outputFile, archive)

  const ratio = totalOriginal / Math.max(totalCompressed, 1)

  console.log(`\n📊 Summary:`)
  console.log(`  Files:        ${allFiles.length}`)
  console.log(`  Original:     ${formatBytes(totalOriginal)}`)
  console.log(`  Compressed:   ${formatBytes(totalCompressed)} (${formatBytes(archive.length)} with index)`)
  console.log(`  Overall:      ${ratio.toFixed(2)}x`)
}
