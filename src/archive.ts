import type { ArchiveDataV3 } from './types.js'
import { FLAG_COMPRESSED } from './types.js'

const MAGIC = Buffer.from('SUPZ')

function w32(v: number): Buffer {
  const buf = Buffer.alloc(4)
  buf.writeUInt32LE(v, 0)
  return buf
}

function r32(buf: Buffer, offset: number): number {
  return buf.readUInt32LE(offset)
}

export function serializeArchiveV3(data: ArchiveDataV3): Buffer {
  const parts: Buffer[] = []
  const push = (b: Buffer) => parts.push(b)
  const wstr = (s: string) => { const b = Buffer.from(s, 'utf-8'); push(w32(b.length)); push(b) }

  push(MAGIC)
  push(w32(3))
  push(w32(0))

  for (const tag of data.tags) {
    wstr(tag.tag)
    push(w32(tag.flags))
    push(w32(tag.blobSize))
    push(w32(tag.fields.length))
    for (const f of tag.fields) {
      wstr(f.path)
      push(w32(f.offset))
      push(w32(f.length))
    }
    push(w32(tag.data.length))
    push(tag.data)
  }

  return Buffer.concat(parts)
}

export function deserializeArchiveV3(buf: Buffer): ArchiveDataV3 {
  let o = 0

  if (buf.slice(o, o + 4).toString() !== 'SUPZ') throw new Error('Not a SUPZ archive')
  o += 4

  const version = r32(buf, o); o += 4
  if (version < 3) throw new Error(`Unsupported version: ${version}. Need v3+.`)

  o += 4

  const tags: ArchiveDataV3['tags'] = []

  while (o < buf.length) {
    const tagLen = r32(buf, o); o += 4
    const tag = buf.toString('utf-8', o, o + tagLen); o += tagLen
    const flags = r32(buf, o); o += 4
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

    const dataLen = r32(buf, o); o += 4
    const data = buf.subarray(o, o + dataLen); o += dataLen

    tags.push({ tag, flags, fields, blobSize, data })
  }

  return { version: 3, tags }
}

export function detectArchiveVersion(buf: Buffer): number {
  if (buf.slice(0, 4).toString() !== 'SUPZ') throw new Error('Not a SUPZ archive')
  return buf.readUInt32LE(4)
}
