#!/usr/bin/env node

import { Command } from 'commander'
import { pack } from './pack.js'
import { unpack } from './unpack.js'
import { DEFAULT_INCLUDE_EXTS, DEFAULT_EXCLUDE_DIRS } from './types.js'

const program = new Command()

program
  .name('supz')
  .description(`Ultra-efficient code compressor — per-language concatenation + Zstd
Supported: ${DEFAULT_INCLUDE_EXTS.join(', ')}`)
  .version('0.2.0')

program
  .command('pack')
  .description('Pack a directory or .zip into a .supz archive')
  .argument('<input>', 'Input directory or .zip file to compress')
  .option('-o, --output <file>', 'Output archive file', 'archive.supz')
  .option('-e, --extensions <exts>', 'Comma-separated extensions to include', (v) => v.split(',').map(s => s.trim().startsWith('.') ? s.trim() : `.${s.trim()}`))
  .option('-x, --exclude <dirs>', 'Comma-separated directories to exclude', (v) => v.split(',').map(s => s.trim()))
  .action(async (input, options) => {
    try {
      await pack(input, options.output, {
        includeExts: options.extensions ?? DEFAULT_INCLUDE_EXTS,
        excludeDirs: options.exclude ?? DEFAULT_EXCLUDE_DIRS,
      })
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
      await unpack(archive, options.output)
    } catch (err) {
      console.error(`Error: ${(err as Error).message}`)
      process.exit(1)
    }
  })

program.parse()
