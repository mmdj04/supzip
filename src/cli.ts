#!/usr/bin/env node

import { Command } from 'commander'
import { pack } from './pack.js'
import { unpack } from './unpack.js'
import { DEFAULT_EXCLUDE_DIRS } from './types.js'

const program = new Command()

program
  .name('supz')
  .description('Ultra-efficient code compressor — compresses text per-language with Zstd, passes through binaries as-is')
  .version('0.3.0')

program
  .command('pack')
  .description('Pack a directory or .zip into a .supz archive')
  .argument('<input>', 'Input directory or .zip file to compress')
  .option('-o, --output <file>', 'Output archive file', 'archive.supz')
  .option('-x, --exclude <dirs>', 'Comma-separated directories to exclude', (v) => v.split(',').map(s => s.trim()))
  .action(async (input, options) => {
    try {
      await pack(input, options.output, {
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
