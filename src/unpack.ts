import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { deserializeArchive } from './archive.js'
import { decompressWithDict } from './dict.js'
import { formatBytes } from './utils.js'

export interface UnpackOptions {
  output?: string
}

export async function unpack(archivePath: string, options: UnpackOptions = {}): Promise<void> {
  const outDir = resolve(options.output ?? './extracted')

  console.log(`Reading ${archivePath}...`)
  const buf = await readFile(archivePath)
  const { data: archive } = deserializeArchive(buf)

  const dictMap = new Map(archive.dicts.map(d => [d.tag, d.data]))
  const chunkMap = new Map(archive.chunks.map(c => [c.hash.toString('hex'), c]))

  console.log(`Archive: ${archive.files.length} files, ${archive.chunks.length} unique chunks, ${archive.dicts.length} dictionaries`)

  for (let i = 0; i < archive.files.length; i++) {
    const file = archive.files[i]
    const filePath = join(outDir, file.path)
    await mkdir(dirname(filePath), { recursive: true })

    const chunks: Buffer[] = []
    for (const hash of file.chunkHashes) {
      const hex = hash.toString('hex')
      const entry = chunkMap.get(hex)
      if (!entry) throw new Error(`Chunk ${hex} not found for ${file.path}`)

      const dict = dictMap.get(entry.langTag) ?? null
      const decompressed = await decompressWithDict(entry.compressedData, dict, entry.langTag)
      chunks.push(decompressed)
    }

    await writeFile(filePath, Buffer.concat(chunks))

    if ((i + 1) % 100 === 0 || i === archive.files.length - 1) {
      process.stdout.write(`  Extracted ${i + 1}/${archive.files.length} files\r`)
    }
  }

  process.stdout.write('\n')
  console.log(`Extracted ${archive.files.length} files to ${outDir}`)
}
