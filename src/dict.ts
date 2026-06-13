import { spawn, execFile } from 'node:child_process'
import { brotliCompress, brotliDecompress, gunzip, constants as ZLIB } from 'node:zlib'
import { join } from 'node:path'
import { promisify } from 'node:util'

const brCompress = promisify(brotliCompress)
const brDecompress = promisify(brotliDecompress)
const gunzipAsync = promisify(gunzip)
const execFileAsync = promisify(execFile)

export const ZSTD_COMP_LEVEL = 19

let _zstdAvailable: boolean | null = null

export async function isZstdAvailable(): Promise<boolean> {
  if (_zstdAvailable !== null) return _zstdAvailable
  _zstdAvailable = await checkZstd()
  return _zstdAvailable
}

async function checkZstd(): Promise<boolean> {
  for (const candidate of ['zstd', '/usr/local/bin/zstd', join(process.env.HOME || '', '.local/bin/zstd')]) {
    try { await execFileAsync(candidate, ['--version']); return true } catch {}
  }
  try {
    const { stdout } = await execFileAsync('python3', ['-c', 'import zstandard; print(1)'])
    return stdout.trim() === '1'
  } catch { return false }
}

function pythonCompress(data: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const proc = spawn('python3', ['-c', `
import sys, zstandard as zstd
sys.stdout.buffer.write(zstd.ZstdCompressor(level=${ZSTD_COMP_LEVEL}).compress(sys.stdin.buffer.read()))
`])
    const out: Buffer[] = []
    proc.stdout.on('data', (c: Buffer) => out.push(c))
    proc.on('close', (code) => {
      if (code === 0) resolve(Buffer.concat(out))
      else reject(new Error(`zstd compress exited ${code}`))
    })
    proc.on('error', reject)
    proc.stdin.end(data)
  })
}

export async function compressBlob(data: Buffer): Promise<Buffer> {
  const haveZstd = await isZstdAvailable()
  if (!haveZstd) {
    return brCompress(data, { params: { [ZLIB.BROTLI_PARAM_QUALITY]: 11 } })
  }

  try {
    return await pythonCompress(data)
  } catch {
    return brCompress(data, { params: { [ZLIB.BROTLI_PARAM_QUALITY]: 11 } })
  }
}

function pythonDecompress(data: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const proc = spawn('python3', ['-c', `
import sys, zstandard as zstd
sys.stdout.buffer.write(zstd.ZstdDecompressor().decompress(sys.stdin.buffer.read()))
`])
    const out: Buffer[] = []
    proc.stdout.on('data', (c: Buffer) => out.push(c))
    proc.on('close', (code) => {
      if (code === 0) resolve(Buffer.concat(out))
      else reject(new Error(`zstd decompress exited ${code}`))
    })
    proc.on('error', reject)
    proc.stdin.end(data)
  })
}

export async function decompressBlob(data: Buffer): Promise<Buffer> {
  const isZstd = data[0] === 0x28 && data[1] === 0xB5
  const isBrotli = data[0] === 0xCE && data[1] === 0xB2
  const isGzip = data[0] === 0x1F && data[1] === 0x8B

  if (isZstd) {
    return pythonDecompress(data)
  }
  if (isBrotli) return brDecompress(data)
  if (isGzip) return gunzipAsync(data)

  if (data.length < 100) {
    const asStr = data.toString('utf-8').slice(0, 50)
    throw new Error(`Unknown compression format. First bytes: ${data.slice(0, 8).toString('hex')}, preview: ${asStr}`)
  }
  throw new Error(`Unknown compression format. First bytes: ${data.slice(0, 8).toString('hex')}`)
}
