import { spawn, execFile } from 'node:child_process'
import { readFile, writeFile, mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { gzip, gunzip } from 'node:zlib'
import { promisify } from 'node:util'

const gzipAsync = promisify(gzip)
const gunzipAsync = promisify(gunzip)
const execFileAsync = promisify(execFile)

export const ZSTD_COMP_LEVEL = 19

let _zstdPath: string | null | undefined = undefined

async function findZstd(): Promise<string | null> {
  if (_zstdPath !== undefined) return _zstdPath
  try {
    const { stdout } = await execFileAsync('which', ['zstd'])
    _zstdPath = stdout.trim()
  } catch {
    _zstdPath = null
  }
  return _zstdPath
}

export async function isZstdAvailable(): Promise<boolean> {
  return (await findZstd()) !== null
}

export async function trainDictionary(samples: Buffer[], tag: string): Promise<Buffer | null> {
  const zstdPath = await findZstd()
  if (!zstdPath || samples.length < 4) return null

  const tmpDir = await mkdtemp(join(tmpdir(), 'supz-dict-'))
  try {
    const sampleFiles: string[] = []
    for (let i = 0; i < samples.length; i++) {
      const f = join(tmpDir, `s${i}`)
      await writeFile(f, samples[i])
      sampleFiles.push(f)
    }

    const dictFile = join(tmpDir, `dict-${tag}`)
    const sampleArg = sampleFiles.length <= 50
      ? sampleFiles
      : [`--train-sets=${sampleFiles.slice(0, 50).join(',')}`]

    await execFileAsync(zstdPath, [
      '--train',
      ...sampleFiles.slice(0, 100),
      '-o', dictFile,
      '--maxdict', '65536',
      '--fast',
    ], { timeout: 30000 })

    return readFile(dictFile)
  } catch {
    return null
  } finally {
    rm(tmpDir, { recursive: true, force: true }).catch(() => {})
  }
}

export async function compressWithDict(data: Buffer, dict: Buffer | null, tag: string): Promise<Buffer> {
  const zstdPath = await findZstd()

  if (zstdPath && dict) {
    return zstdCompress(data, zstdPath, dict, tag)
  }

  return gzipAsync(data, { level: 9 })
}

function detectCompression(data: Buffer): 'gzip' | 'zstd' {
  if (data[0] === 0x1F && data[1] === 0x8B) return 'gzip'
  if (data[0] === 0x28 && data[1] === 0xB5) return 'zstd'
  return 'gzip'
}

export async function decompressWithDict(data: Buffer, dict: Buffer | null, tag: string): Promise<Buffer> {
  const fmt = detectCompression(data)

  if (fmt === 'zstd') {
    const zstdPath = await findZstd()
    if (zstdPath && dict) {
      return zstdDecompress(data, zstdPath, dict)
    }
  }

  return gunzipAsync(data)
}

function zstdCompress(data: Buffer, zstdPath: string, dict: Buffer, _tag: string): Promise<Buffer> {
  const tmpDir = join(tmpdir(), `supz-comp-${process.pid}-${Date.now()}`)

  return new Promise<Buffer>(async (resolve, reject) => {
    try {
      await writeFile(tmpDir, dict)
    } catch (e) { reject(e); return }

    const proc = spawn(zstdPath, [`-${ZSTD_COMP_LEVEL}`, '-D', tmpDir, '-c', '--ultra'], {
      stdio: ['pipe', 'pipe', 'pipe'],
    })

    const chunks: Buffer[] = []
    proc.stdout.on('data', (c: Buffer) => chunks.push(c))
    proc.stderr.on('data', () => {})

    let closed = false
    proc.on('close', async (code) => {
      if (closed) return
      closed = true
      await rm(tmpDir, { force: true }).catch(() => {})
      if (code === 0) resolve(Buffer.concat(chunks))
      else reject(new Error(`zstd compress exited ${code}`))
    })
    proc.on('error', async (e) => {
      if (closed) return
      closed = true
      await rm(tmpDir, { force: true }).catch(() => {})
      reject(e)
    })

    proc.stdin.write(data)
    proc.stdin.end()
  })
}

function zstdDecompress(data: Buffer, zstdPath: string, dict: Buffer): Promise<Buffer> {
  const tmpDir = join(tmpdir(), `supz-decomp-${process.pid}-${Date.now()}`)

  return new Promise<Buffer>(async (resolve, reject) => {
    try {
      await writeFile(tmpDir, dict)
    } catch (e) { reject(e); return }

    const proc = spawn(zstdPath, ['-D', tmpDir, '-d', '-c'], {
      stdio: ['pipe', 'pipe', 'pipe'],
    })

    const chunks: Buffer[] = []
    proc.stdout.on('data', (c: Buffer) => chunks.push(c))
    proc.stderr.on('data', () => {})

    let closed = false
    proc.on('close', async (code) => {
      if (closed) return
      closed = true
      await rm(tmpDir, { force: true }).catch(() => {})
      if (code === 0) resolve(Buffer.concat(chunks))
      else reject(new Error(`zstd decompress exited ${code}`))
    })
    proc.on('error', async (e) => {
      if (closed) return
      closed = true
      await rm(tmpDir, { force: true }).catch(() => {})
      reject(e)
    })

    proc.stdin.write(data)
    proc.stdin.end()
  })
}
