interface BadgeProps {
  variant?: 'blue' | 'green' | 'red' | 'gray'
  children: React.ReactNode
  className?: string
}

const variants = {
  blue: 'bg-[var(--bg-badge-blue)] text-[var(--badge-blue)]',
  green: 'bg-[var(--bg-badge-green)] text-[var(--badge-green)]',
  red: 'bg-[var(--bg-badge-red)] text-[var(--badge-red)]',
  gray: 'bg-[var(--bg-hover)] text-[var(--text-secondary)]',
}

export default function Badge({ variant = 'gray', children, className = '' }: BadgeProps) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${variants[variant]} ${className}`}>
      {children}
    </span>
  )
}
