type Level = 'debug' | 'info' | 'warn' | 'error'

interface LogEntry {
  level: Level
  context: string
  message: string
  timestamp: string
  data?: unknown
}

class Logger {
  private entries: LogEntry[] = []
  private maxEntries = 1000
  private level: Level = 'info'

  setLevel(l: Level) { this.level = l }
  
  private log(level: Level, context: string, message: string, data?: unknown) {
    if (this.shouldLog(level)) {
      const entry: LogEntry = { level, context, message, timestamp: new Date().toISOString(), data }
      this.entries.push(entry)
      if (this.entries.length > this.maxEntries) this.entries.shift()
      
      switch (level) {
        case 'debug': console.debug(`[${context}]`, message, data ?? ''); break
        case 'info': console.info(`[${context}]`, message, data ?? ''); break
        case 'warn': console.warn(`[${context}]`, message, data ?? ''); break
        case 'error': console.error(`[${context}]`, message, data ?? ''); break
      }
    }
  }

  private shouldLog(l: Level): boolean {
    const order: Level[] = ['debug', 'info', 'warn', 'error']
    return order.indexOf(l) >= order.indexOf(this.level)
  }

  debug(context: string, message: string, data?: unknown) { this.log('debug', context, message, data) }
  info(context: string, message: string, data?: unknown) { this.log('info', context, message, data) }
  warn(context: string, message: string, data?: unknown) { this.log('warn', context, message, data) }
  error(context: string, message: string, data?: unknown) { this.log('error', context, message, data) }
  getEntries() { return [...this.entries] }
  clear() { this.entries = [] }
}

export const logger = new Logger()
