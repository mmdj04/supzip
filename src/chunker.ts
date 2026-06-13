const WINDOW_SIZE = 48

const TABLE = new Uint32Array(256)
const ROT_TABLE = new Uint32Array(256)

function initTables(): void {
  if (TABLE[0] !== 0) return

  for (let i = 0; i < 256; i++) {
    let v = (i * 1103515245 + 12345) >>> 0
    v = ((v << 16) | (v >>> 16)) >>> 0
    TABLE[i] = v

    let rv = v
    for (let j = 0; j < WINDOW_SIZE - 1; j++) {
      rv = ((rv << 1) | (rv >>> 31)) >>> 0
    }
    ROT_TABLE[i] = rv
  }
}

initTables()

export interface ChunkerOptions {
  avgChunkSize: number
  minChunkSize: number
  maxChunkSize: number
}

export const DEFAULT_CHUNK_OPTIONS: ChunkerOptions = {
  avgChunkSize: 4096,
  minChunkSize: 1024,
  maxChunkSize: 16384,
}

export function* chunkData(data: Buffer, options: ChunkerOptions = DEFAULT_CHUNK_OPTIONS): Generator<Buffer> {
  const { avgChunkSize, minChunkSize, maxChunkSize } = options
  const bits = Math.round(Math.log2(avgChunkSize))
  const mask = (1 << bits) - 1
  const len = data.length

  if (len <= maxChunkSize) {
    yield data
    return
  }

  let cut = 0
  while (cut < len) {
    const end = findChunkBoundary(data, cut, len, minChunkSize, maxChunkSize, mask)
    yield data.subarray(cut, end)
    cut = end
  }
}

function findChunkBoundary(
  data: Buffer, start: number, end: number,
  minSize: number, maxSize: number, mask: number,
): number {
  if (start + maxSize >= end) return end

  const searchStart = start + minSize
  const searchEnd = Math.min(start + maxSize, end)

  if (searchStart >= searchEnd) return searchEnd

  let hash = initWindowHash(data, searchStart)
  let pos = searchStart

  while (pos < searchEnd) {
    if ((hash & mask) === 0) return pos

    pos++
    if (pos < searchEnd) {
      hash = slideHash(hash, data[pos - WINDOW_SIZE - 1], data[pos - 1])
    }
  }

  return searchEnd
}

function initWindowHash(data: Buffer, pos: number): number {
  const win = Buffer.alloc(WINDOW_SIZE)
  data.copy(win, 0, pos - WINDOW_SIZE, pos)
  return buzhashDirect(win)
}

function buzhashDirect(buf: Buffer): number {
  let h = 0
  for (let i = 0; i < buf.length; i++) {
    h = ((h << 1) | (h >>> 31)) >>> 0
    h ^= TABLE[buf[i]]
  }
  return h >>> 0
}

function slideHash(h: number, outByte: number, inByte: number): number {
  h ^= ROT_TABLE[outByte]
  h = ((h << 1) | (h >>> 31)) >>> 0
  h ^= TABLE[inByte]
  return h >>> 0
}
