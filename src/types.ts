export interface FileEntry {
  fullPath: string
  relativePath: string
  ext: string
}

export interface TagBlob {
  tag: string
  files: Array<{ path: string; data: Buffer }>
}

export interface ArchiveDataV2 {
  version: 2
  tags: Array<{
    tag: string
    fields: Array<{
      path: string
      offset: number
      length: number
    }>
    blobSize: number
    compressedBlob: Buffer
  }>
}

export interface ArchiveData {
  version: 1
  dicts: DictEntry[]
  chunks: ChunkEntry[]
  files: FileIndex[]
}

export interface DictEntry {
  tag: string
  data: Buffer
}

export interface ChunkEntry {
  hash: Buffer
  langTag: string
  compressedData: Buffer
}

export interface FileIndex {
  path: string
  chunkHashes: Buffer[]
}

export interface Stats {
  fileCount: number
  originalBytes: number
  compressedBytes: number
  ratio: number
}

export const LANG_TAGS: Record<string, string> = {
  '.ts': '.ts',
  '.tsx': '.tsx',
  '.js': '.js',
  '.jsx': '.jsx',
  '.mjs': '.js',
  '.cjs': '.js',
  '.mts': '.ts',
  '.cts': '.ts',
  '.md': '.md',
  '.mdx': '.md',
  '.html': '.html',
  '.htm': '.html',
  '.css': '.css',
  '.scss': '.scss',
  '.less': '.less',
  '.json': '.json',
  '.yaml': '.yaml',
  '.yml': '.yaml',
  '.xml': '.xml',
  '.svg': '.svg',
  '.py': '.py',
  '.rb': '.rb',
  '.java': '.java',
  '.kt': '.kt',
  '.swift': '.swift',
  '.go': '.go',
  '.rs': '.rs',
  '.c': '.c',
  '.h': '.c',
  '.cpp': '.cpp',
  '.hpp': '.cpp',
  '.cs': '.cs',
  '.php': '.php',
  '.r': '.r',
  '.sh': '.sh',
  '.bash': '.sh',
  '.zsh': '.sh',
  '.dockerfile': 'dockerfile',
  '.tf': '.tf',
  '.toml': '.toml',
}

export function getLangTag(ext: string): string {
  const lower = ext.toLowerCase()
  return LANG_TAGS[lower] ?? '__'
}

export const DEFAULT_INCLUDE_EXTS = [
  '.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs',
  '.md', '.mdx',
  '.html', '.htm', '.css', '.scss', '.less',
  '.json', '.yaml', '.yml', '.xml', '.svg',
  '.py', '.rb', '.java', '.kt', '.swift', '.go', '.rs',
  '.c', '.h', '.cpp', '.hpp', '.cs', '.php',
  '.r', '.sh', '.bash', '.zsh',
  '.toml', '.tf',
]

export const DEFAULT_EXCLUDE_DIRS = ['node_modules', '.git', 'dist', 'build', '.next', '.nuxt', '.cache', '__pycache__', '.venv', 'venv', '.tox']
