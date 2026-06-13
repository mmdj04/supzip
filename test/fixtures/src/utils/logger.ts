type LogLevel = 'debug' | 'info' | 'warn' | 'error'

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
}

class Logger {
  private level: LogLevel = 'info'

  setLevel(level: LogLevel) {
    this.level = level
  }

  debug(context: string, ...args: unknown[]) {
    if (LOG_LEVELS[this.level] <= LOG_LEVELS.debug) {
      console.debug(`[${context}]`, ...args)
    }
  }

  info(context: string, ...args: unknown[]) {
    if (LOG_LEVELS[this.level] <= LOG_LEVELS.info) {
      console.info(`[${context}]`, ...args)
    }
  }

  warn(context: string, ...args: unknown[]) {
    if (LOG_LEVELS[this.level] <= LOG_LEVELS.warn) {
      console.warn(`[${context}]`, ...args)
    }
  }

  error(context: string, ...args: unknown[]) {
    if (LOG_LEVELS[this.level] <= LOG_LEVELS.error) {
      console.error(`[${context}]`, ...args)
    }
  }
}

export const logger = new Logger()
