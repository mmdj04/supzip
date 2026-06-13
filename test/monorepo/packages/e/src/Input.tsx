import React, { forwardRef, useCallback, useMemo } from 'react'
import { cn } from '../../lib/utils'
import { logger } from '../../lib/logger'
import type { VariantProps } from 'class-variance-authority'
import { cva } from 'class-variance-authority'

const inputVariants = cva('base-class', {
  variants: {
    variant: {
      default: 'bg-primary text-white',
      secondary: 'bg-secondary text-gray-900',
      outline: 'border-2 border-primary text-primary',
      ghost: 'text-primary hover:bg-gray-100',
    },
    size: {
      sm: 'px-2 py-1 text-sm',
      md: 'px-4 py-2 text-base',
      lg: 'px-6 py-3 text-lg',
      xl: 'px-8 py-4 text-xl',
    },
  },
  defaultVariants: {
    variant: 'default',
    size: 'md',
  },
})

interface Props extends VariantProps<typeof inputVariants> {
  children?: React.ReactNode
  className?: string
  disabled?: boolean
  onClick?: () => void
  id?: string
  testId?: string
}

const  = forwardRef<HTMLDivElement, Props>(({
  children,
  className,
  variant,
  size,
  disabled = false,
  onClick,
  id,
  testId,
}, ref) => {
  const handleClick = useCallback(() => {
    if (!disabled && onClick) {
      logger.info('', 'clicked', id ?? 'unknown')
      onClick()
    }
  }, [disabled, onClick, id])

  const classes = useMemo(() => {
    return cn(inputVariants({ variant, size }), className, {
      'opacity-50 cursor-not-allowed': disabled,
    })
  }, [variant, size, className, disabled])

  return (
    <div
      ref={ref}
      id={id}
      data-testid={testId}
      className={classes}
      onClick={handleClick}
      role="button"
      tabIndex={disabled ? -1 : 0}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleClick() }}
    >
      {children}
    </div>
  )
})

.displayName = ''

export { , type Props }
