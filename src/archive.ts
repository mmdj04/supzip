import type { ArchiveData, ArchiveDataV2 } from './types.js'

const MAGIC = Buffer.from('SUPZ')

function w32(v: number): Buffer {
  const buf = Buffer.alloc(4)
  buf.writeUInt32LE(v, 0)
  return buf
}

function r32(buf: Buffer, offset: number): number {
  return buf.readUInt32LE(offset)
}

export function serializeArchiveV2(data: ArchiveDataV2): Buffer {
  const parts: Buffer[] = []
  const push = (b: Buffer) => parts.push(b)
  const wstr = (s: string) => { const b = Buffer.from(s, 'utf-8'); push(w32(b.length)); push(b) }

  push(MAGIC)
  push(w32(2))
  push(w32(0))

  for (const tag of data.tags) {
    wstr(tag.tag)
    push(w32(tag.blobSize))
    push(w32(tag.fields.length))
    for (const f of tag.fields) {
      wstr(f.path)
      push(w32(f.offset))
      push(w32(f.length))
    }
    push(w32(tag.compressedBlob.length))
    push(tag.compressedBlob)
  }

  return Buffer.concat(parts)
}

export function deserializeArchiveV2(buf: Buffer): ArchiveDataV2 {
  let o = 0

  if (buf.slice(o, o + 4).toString() !== 'SUPZ') throw new Error('Not a SUPZ archive')
  o += 4

  const version = r32(buf, o); o += 4
  if (version !== 2) throw new Error(`Unsupported version: ${version}`)

  o += 4

  const tags: ArchiveDataV2['tags'] = []

  while (o < buf.length) {
    const tagLen = r32(buf, o); o += 4
    const tag = buf.toString('utf-8', o, o + tagLen); o += tagLen

    const blobSize = r32(buf, o); o += 4
    const numFiles = r32(buf, o); o += 4

    const fields: Array<{ path: string; offset: number; length: number }> = []
    for (let i = 0; i < numFiles; i++) {
      const pathLen = r32(buf, o); o += 4
      const path = buf.toString('utf-8', o, o + pathLen); o += pathLen
      const offset = r32(buf, o); o += 4
      const length = r32(buf, o); o += 4
      fields.push({ path, offset, length })
    }

    const compLen = r32(buf, o); o += 4
    const compressedBlob = buf.subarray(o, o + compLen); o += compLen

    tags.push({ tag, fields, blobSize, compressedBlob })
  }

  return { version: 2, tags }
}

export function serializeArchive(data: ArchiveData): Buffer {
  const parts: Buffer[] = []
  const push = (b: Buffer) => parts.push(b)
  const wstr = (s: string) => { const b = Buffer.from(s, 'utf-8'); push(w32(b.length)); push(b) }

  push(MAGIC)
  push(w32(1))
  push(w32(0))

  push(w32(data.dicts.length))
  for (const d of data.dicts) {
    wstr(d.tag)
    push(w32(d.data.length))
    push(d.data)
  }

  push(w32(data.chunks.length))
  for (const c of data.chunks) {
    push(c.hash)
    const tagBuf = Buffer.from(c.langTag, 'utf-8')
    push(Buffer.from([tagBuf.length]))
    push(tagBuf)
    push(w32(c.compressedData.length))
    push(c.compressedData)
  }

  push(w32(data.files.length))
  for (const f of data.files) {
    wstr(f.path)
    push(w32(f.chunkHashes.length))
    for (const h of f.chunkHashes) push(h)
  }

  return Buffer.concat(parts)
}

export function deserializeArchive(buf: Buffer): { version: 1; data: ArchiveData } {
  let o = 0

  if (buf.slice(o, o + 4).toString() !== 'SUPZ') throw new Error('Not a SUPZ archive')
  o += 4

  const version = r32(buf, o); o += 4
  if (version !== 1) throw new Error(`Unsupported version: ${version}`)

  o += 4

  const dicts: ArchiveData['dicts'] = []
  const numDicts = r32(buf, o); o += 4
  for (let i = 0; i < numDicts; i++) {
    const tagLen = r32(buf, o); o += 4
    const tag = buf.toString('utf-8', o, o + tagLen); o += tagLen
    const dl = r32(buf, o); o += 4
    dicts.push({ tag, data: buf.subarray(o, o + dl) })
    o += dl
  }

  const chunks: ArchiveData['chunks'] = []
  const numChunks = r32(buf, o); o += 4
  for (let i = 0; i < numChunks; i++) {
    const hash = buf.subarray(o, o + 32); o += 32
    const tl = buf[o]; o += 1
    const tag = buf.toString('utf-8', o, o + tl); o += tl
    const dl = r32(buf, o); o += 4
    chunks.push({ hash, langTag: tag, compressedData: buf.subarray(o, o + dl) })
    o += dl
  }

  const files: ArchiveData['files'] = []
  const numFiles = r32(buf, o); o += 4
  for (let i = 0; i < numFiles; i++) {
    const pathLen = r32(buf, o); o += 4
    const path = buf.toString('utf-8', o, o + pathLen); o += pathLen
    const nc = r32(buf, o); o += 4
    const chunkHashes: Buffer[] = []
    for (let j = 0; j < nc; j++) {
      chunkHashes.push(buf.subarray(o, o + 32))
      o += 32
    }
    files.push({ path, chunkHashes })
  }

  return { version: 1, data: { version: 1 as const, dicts, chunks, files } }
}

export function detectArchiveVersion(buf: Buffer): number {
  if (buf.slice(0, 4).toString() !== 'SUPZ') throw new Error('Not a SUPZ archive')
  return buf.readUInt32LE(4)
}
