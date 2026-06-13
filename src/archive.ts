import type { ArchiveData, DictEntry, ChunkEntry, FileIndex } from './types.js'

const MAGIC = Buffer.from('SUPZ')

function w32(v: number): Buffer {
  const buf = Buffer.alloc(4)
  buf.writeUInt32LE(v, 0)
  return buf
}

function r32(buf: Buffer, offset: number): number {
  return buf.readUInt32LE(offset)
}

export function serializeArchive(data: ArchiveData): Buffer {
  const parts: Buffer[] = []

  const push = (b: Buffer) => parts.push(b)

  push(MAGIC)
  push(w32(1))
  push(w32(0))

  push(w32(data.dicts.length))
  for (const d of data.dicts) {
    writeStr(push, d.tag)
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
    writeStr(push, f.path)
    push(w32(f.chunkHashes.length))
    for (const h of f.chunkHashes) push(h)
  }

  return Buffer.concat(parts)
}

export function deserializeArchive(buf: Buffer): { data: ArchiveData; offset: number } {
  let o = 0

  if (buf.slice(o, o + 4).toString() !== 'SUPZ') throw new Error('Not a SUPZ archive')
  o += 4

  const version = r32(buf, o); o += 4
  if (version !== 1) throw new Error(`Unsupported version: ${version}`)

  o += 4

  const dicts: DictEntry[] = []
  const numDicts = r32(buf, o); o += 4
  for (let i = 0; i < numDicts; i++) {
    const tag = readStr(buf, o); o += tag.length + 4
    const dl = r32(buf, o); o += 4
    dicts.push({ tag, data: buf.subarray(o, o + dl) })
    o += dl
  }

  const chunks: ChunkEntry[] = []
  const numChunks = r32(buf, o); o += 4
  for (let i = 0; i < numChunks; i++) {
    const hash = buf.subarray(o, o + 32); o += 32
    const tl = buf[o]; o += 1
    const tag = buf.toString('utf-8', o, o + tl); o += tl
    const dl = r32(buf, o); o += 4
    chunks.push({ hash, langTag: tag, compressedData: buf.subarray(o, o + dl) })
    o += dl
  }

  const files: FileIndex[] = []
  const numFiles = r32(buf, o); o += 4
  for (let i = 0; i < numFiles; i++) {
    const path = readStr(buf, o); o += path.length + 4
    const nc = r32(buf, o); o += 4
    const chunkHashes: Buffer[] = []
    for (let j = 0; j < nc; j++) {
      chunkHashes.push(buf.subarray(o, o + 32))
      o += 32
    }
    files.push({ path, chunkHashes })
  }

  return { data: { dicts, chunks, files }, offset: o }
}

function writeStr(push: (b: Buffer) => void, s: string): void {
  const b = Buffer.from(s, 'utf-8')
  push(w32(b.length))
  push(b)
}

function readStr(buf: Buffer, offset: number): string {
  const len = r32(buf, offset)
  return buf.toString('utf-8', offset + 4, offset + 4 + len)
}
