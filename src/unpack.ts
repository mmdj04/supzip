import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { readFile } from 'node:fs/promises'
import { decompressBlob } from './dict.js'
import { detectArchiveVersion, deserializeArchiveV2 } from './archive.js'

export async function unpack(archiveFile: string, outputDir: string): Promise<void> {
  const archive = await readFile(archiveFile)
  const version = detectArchiveVersion(archive)

  if (version === 2) {
    await unpackV2(archive, outputDir)
  } else {
    throw new Error(`Unsupported archive version: ${version}. Only version 2 is supported by this tool.`)
  }
}

async function unpackV2(archive: Buffer, outputDir: string): Promise<void> {
  const data = deserializeArchiveV2(archive)
  let totalFiles = 0

  for (const tag of data.tags) {
    const blob = await decompressBlob(tag.compressedBlob)
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
