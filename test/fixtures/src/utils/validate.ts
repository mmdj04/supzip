interface ValidationRule {
  field: string
  type: 'string' | 'number' | 'email' | 'required'
  min?: number
  max?: number
  pattern?: RegExp
}

export function validate<T extends Record<string, unknown>>(data: T, rules?: ValidationRule[]): T {
  const errors: string[] = []

  if (rules) {
    for (const rule of rules) {
      const value = data[rule.field]

      if (rule.type === 'required' && (value === undefined || value === null || value === '')) {
        errors.push(`${rule.field} is required`)
        continue
      }

      if (value === undefined || value === null) continue

      if (rule.type === 'string') {
        if (typeof value !== 'string') errors.push(`${rule.field} must be a string`)
        else if (rule.min !== undefined && (value as string).length < rule.min) errors.push(`${rule.field} must be at least ${rule.min} characters`)
        else if (rule.max !== undefined && (value as string).length > rule.max) errors.push(`${rule.field} must be at most ${rule.max} characters`)
        else if (rule.pattern && !rule.pattern.test(value as string)) errors.push(`${rule.field} format is invalid`)
      }

      if (rule.type === 'number') {
        if (typeof value !== 'number') errors.push(`${rule.field} must be a number`)
        else if (rule.min !== undefined && value < rule.min) errors.push(`${rule.field} must be at least ${rule.min}`)
        else if (rule.max !== undefined && value > rule.max) errors.push(`${rule.field} must be at most ${rule.max}`)
      }

      if (rule.type === 'email') {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        if (typeof value !== 'string' || !emailRegex.test(value)) errors.push(`${rule.field} must be a valid email`)
      }
    }
  }

  if (errors.length > 0) {
    throw new ValidationError(errors)
  }

  return data
}

export class ValidationError extends Error {
  constructor(public errors: string[]) {
    super(errors.join('; '))
    this.name = 'ValidationError'
  }
}
