import { HTMLAttributes, forwardRef } from 'react'
import { cn } from '../../lib/utils'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'glass'
}

const Card = forwardRef<HTMLDivElement, CardProps>(({
  className,
  variant = 'default',
  ...props
}, ref) => {
  const variantClasses = {
    default: 'bg-white dark:bg-gray-800 rounded-lg shadow-md',
    glass: 'glass dark:glass-dark rounded-lg'
  }

  return (
    <div
      ref={ref}
      className={cn(
        'p-6',
        variantClasses[variant],
        className
      )}
      {...props}
    />
  )
})

Card.displayName = 'Card'

export { Card }