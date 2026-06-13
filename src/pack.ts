import { readFile, writeFile, mkdtemp } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import AdmZip from 'adm-zip'
import { scanFiles, formatBytes } from './utils.js'
import { getLangTag, DEFAULT_INCLUDE_EXTS, DEFAULT_EXCLUDE_DIRS } from './types.js'
import { compressBlob, isZstdAvailable } from './dict.js'
import { serializeArchiveV2 } from './archive.js'
import type { FileEntry } from './types.js'

export interface PackOptions {
  includeExts?: string[]
  excludeDirs?: string[]
}

async function resolveInput(input: string): Promise<{ dir: string; cleanup?: () => Promise<void> }> {
  if (input.endsWith('.zip')) {
    const zip = new AdmZip(input)
    const tmp = await mkdtemp(join(tmpdir(), 'supz-zip-'))
    zip.extractAllTo(tmp, true)
    console.log(`Extracted .zip to ${tmp}`)
    return { dir: tmp, cleanup: async () => { /* tmp cleans on process exit */ } }
  }
  return { dir: input }
}

export async function pack(inputArg: string, outputFile: string, options: PackOptions = {}): Promise<void> {
  const { dir, cleanup } = await resolveInput(inputArg)
  const exts = options.includeExts ?? DEFAULT_INCLUDE_EXTS
  const files = scanFiles(dir, exts, options.excludeDirs ?? DEFAULT_EXCLUDE_DIRS)
  console.log(`Found ${files.length} supported files (extensions: ${exts.join(', ')})`)
  console.log(`(Unsupported files are ignored — only the above extensions are compressed)`)

  const zstdAvail = await isZstdAvailable()
  console.log(`Zstandard: ${zstdAvail ? 'available' : 'NOT available (falling back to brotli)'}`)

  const tagged = new Map<string, FileEntry[]>()
  for (const f of files) {
    const tag = getLangTag(f.ext)
    const list = tagged.get(tag) ?? []
    list.push(f)
    tagged.set(tag, list)
  }

  const tags: Array<{
    tag: string
    fields: Array<{ path: string; offset: number; length: number }>
    blobSize: number
    compressedBlob: Buffer
  }> = []

  let totalOriginal = 0
  let totalCompressed = 0

  for (const [tag, fileList] of tagged) {
    console.log(`  ${tag}: ${fileList.length} files`)

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

    tags.push({ tag, fields, blobSize: blob.length, compressedBlob: compressed })
    totalCompressed += compressed.length
  }

  const archive = serializeArchiveV2({ version: 2, tags })
  await writeFile(outputFile, archive)

  const ratio = totalOriginal / Math.max(totalCompressed, 1)

  console.log(`\n📊 Summary:`)
  console.log(`  Files:        ${files.length}`)
  console.log(`  Original:     ${formatBytes(totalOriginal)}`)
  console.log(`  Compressed:   ${formatBytes(totalCompressed)} (${formatBytes(archive.length)} with index)`)
  console.log(`  Overall:      ${ratio.toFixed(2)}x`)
}
