#!/usr/bin/env node

import { Command } from 'commander'
import { pack } from './pack.js'
import { unpack } from './unpack.js'
import { formatBytes } from './utils.js'
import { DEFAULT_INCLUDE_EXTS, DEFAULT_EXCLUDE_DIRS } from './types.js'

const program = new Command()

program
  .name('supz')
  .description('Ultra-efficient code compressor — CDC dedup + per-language Zstd dictionaries')
  .version('0.1.0')

program
  .command('pack')
  .description('Pack a directory into a .supz archive')
  .argument('<input>', 'Input directory to compress')
  .option('-o, --output <file>', 'Output archive file', 'archive.supz')
  .option('-e, --extensions <exts>', 'Comma-separated extensions to include', (v) => v.split(',').map(s => s.trim().startsWith('.') ? s.trim() : `.${s.trim()}`))
  .option('-x, --exclude <dirs>', 'Comma-separated directories to exclude', (v) => v.split(',').map(s => s.trim()))
  .option('--chunk-size <bytes>', 'Average chunk size in bytes (default 4096)', parseInt)
  .action(async (input, options) => {
    try {
      const stats = await pack(input, {
        output: options.output,
        includeExts: options.extensions ?? DEFAULT_INCLUDE_EXTS,
        excludeDirs: options.exclude ?? DEFAULT_EXCLUDE_DIRS,
        avgChunkSize: options.chunkSize ?? 4096,
      })
      console.log(`\n📊 Summary:`)
      console.log(`  Files:        ${stats.fileCount}`)
      console.log(`  Original:     ${formatBytes(stats.originalBytes)}`)
      console.log(`  Unique:       ${formatBytes(stats.uniqueChunkBytes)} (${stats.dedupRatio.toFixed(2)}x dedup)`)
      console.log(`  Compressed:   ${formatBytes(stats.compressedBytes)} (${stats.compressionRatio.toFixed(2)}x)`)
      console.log(`  Dicts:        ${formatBytes(stats.dictBytes)}`)
      console.log(`  Overall:      ${stats.overallRatio.toFixed(2)}x`)
    } catch (err) {
      console.error(`Error: ${(err as Error).message}`)
      process.exit(1)
    }
  })

program
  .command('unpack')
  .description('Extract a .supz archive')
  .argument('<archive>', 'Archive file to extract')
  .option('-o, --output <dir>', 'Output directory', './extracted')
  .action(async (archive, options) => {
    try {
      await unpack(archive, { output: options.output })
    } catch (err) {
      console.error(`Error: ${(err as Error).message}`)
      process.exit(1)
    }
  })

program.parse()
