import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { readFile } from 'node:fs/promises'
import { decompressBlob } from './dict.js'
import { detectArchiveVersion, deserializeArchiveV3 } from './archive.js'
import { FLAG_COMPRESSED } from './types.js'

export async function unpack(archiveFile: string, outputDir: string): Promise<void> {
  const archive = await readFile(archiveFile)
  const version = detectArchiveVersion(archive)

  if (version >= 3) {
    await unpackV3(archive, outputDir)
  } else {
    throw new Error(`Unsupported archive version: ${version}. Only v3+ is supported.`)
  }
}

async function unpackV3(archive: Buffer, outputDir: string): Promise<void> {
  const data = deserializeArchiveV3(archive)
  let totalFiles = 0

  for (const tag of data.tags) {
    const isCompressed = (tag.flags & FLAG_COMPRESSED) !== 0
    const blob = isCompressed ? await decompressBlob(tag.data) : tag.data

    for (const f of tag.fields) {
      const fileData = blob.subarray(f.offset, f.offset + f.length)
      const outPath = join(outputDir, f.path)
      await mkdir(dirname(outPath), { recursive: true })
      await writeFile(outPath, fileData)
      totalFiles++
    }
  }

  console.log(`Extracted ${totalFiles} files to ${outputDir}`)
}
