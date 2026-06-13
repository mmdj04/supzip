import { readFile, writeFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { chunkData, DEFAULT_CHUNK_OPTIONS } from './chunker.js'
import { trainDictionary, compressWithDict, isZstdAvailable } from './dict.js'
import { serializeArchive } from './archive.js'
import { scanFiles, formatBytes } from './utils.js'
import type { FileIndex, ChunkEntry, DictEntry, Stats } from './types.js'
import { getLangTag } from './types.js'

export interface PackOptions {
  output?: string
  includeExts?: string[]
  excludeDirs?: string[]
  avgChunkSize?: number
}

export async function pack(inputDir: string, options: PackOptions = {}): Promise<Stats> {
  const outPath = options.output ?? 'archive.supz'
  const chunkOpts = { ...DEFAULT_CHUNK_OPTIONS }
  if (options.avgChunkSize) chunkOpts.avgChunkSize = options.avgChunkSize

  console.log(`Scanning ${inputDir}...`)
  const files = scanFiles(inputDir, options.includeExts, options.excludeDirs)
  if (files.length === 0) throw new Error('No matching files found')

  console.log(`Found ${files.length} files`)

  const fileContents = await Promise.all(
    files.map(async (f) => ({
      ...f,
      data: await readFile(f.fullPath),
      tag: getLangTag(f.ext),
    })),
  )

  const zstdOk = await isZstdAvailable()
  console.log(`Zstandard: ${zstdOk ? 'available' : 'NOT available (falling back to gzip)'}`)

  console.log('Training dictionaries...')
  const grouped = new Map<string, Buffer[]>()
  for (const f of fileContents) {
    const list = grouped.get(f.tag) ?? []
    list.push(f.data)
    grouped.set(f.tag, list)
  }

  const dicts = new Map<string, Buffer>()
  for (const [tag, samples] of grouped) {
    if (samples.length >= 5) {
      const dict = await trainDictionary(samples, tag)
      if (dict) {
        dicts.set(tag, dict)
        console.log(`  ${tag}: dict ${formatBytes(dict.length)} (${samples.length} samples)`)
      }
    }
  }
  if (dicts.size > 0) {
    console.log(`  Total: ${dicts.size} dictionaries trained`)
  }

  console.log('Chunking files (CDC)...')
  const uniqueChunks = new Map<string, { data: Buffer; tag: string }>()
  const fileIndexes: FileIndex[] = []
  let totalOriginalBytes = 0

  for (const f of fileContents) {
    totalOriginalBytes += f.data.length
    const chunks = [...chunkData(f.data, chunkOpts)]
    const chunkHashes: Buffer[] = []

    for (const chunk of chunks) {
      const hash = createHash('sha256').update(chunk).digest()
      const hex = hash.toString('hex')
      if (!uniqueChunks.has(hex)) {
        uniqueChunks.set(hex, { data: chunk, tag: f.tag })
      }
      chunkHashes.push(hash)
    }

    fileIndexes.push({ path: f.relativePath, chunkHashes })
  }

  const uniqueBytes = [...uniqueChunks.values()].reduce((s, c) => s + c.data.length, 0)
  const dedupRatio = totalOriginalBytes / Math.max(uniqueBytes, 1)

  console.log(`  ${uniqueChunks.size} unique chunks from ${fileContents.length} files`)
  console.log(`  Original: ${formatBytes(totalOriginalBytes)} → Unique: ${formatBytes(uniqueBytes)} (${dedupRatio.toFixed(2)}x dedup)`)

  console.log('Compressing chunks...')
  const compressedChunks: ChunkEntry[] = []
  let i = 0
  for (const [hex, { data, tag }] of uniqueChunks) {
    const dict = dicts.get(tag) ?? null
    const compressed = await compressWithDict(data, dict, tag)
    compressedChunks.push({ hash: Buffer.from(hex, 'hex'), langTag: tag, compressedData: compressed })
    i++
    if (i % 100 === 0) process.stdout.write(`  ${i}/${uniqueChunks.size} chunks\r`)
  }
  process.stdout.write(`  ${uniqueChunks.size}/${uniqueChunks.size} chunks\n`)

  const compressedBytes = compressedChunks.reduce((s, c) => s + c.compressedData.length, 0)
  const dictBytes = [...dicts.values()].reduce((s, d) => s + d.length, 0)
  const compressionRatio = uniqueBytes / Math.max(compressedBytes, 1)
  const overallRatio = totalOriginalBytes / Math.max(compressedBytes + dictBytes, 1)

  console.log(`  Compressed: ${formatBytes(compressedBytes)} (${compressionRatio.toFixed(2)}x compression)`)
  console.log(`  Dicts: ${formatBytes(dictBytes)}`)

  const archiveData = serializeArchive({
    dicts: [...dicts.entries()].map(([tag, data]): DictEntry => ({ tag, data })),
    chunks: compressedChunks,
    files: fileIndexes,
  })

  await writeFile(outPath, archiveData)

  const stats: Stats = {
    fileCount: files.length,
    originalBytes: totalOriginalBytes,
    uniqueChunkBytes: uniqueBytes,
    compressedBytes,
    dictBytes,
    dedupRatio,
    compressionRatio,
    overallRatio,
  }

  console.log(`\nWritten to ${outPath} (${formatBytes(archiveData.length)})`)
  return stats
}
