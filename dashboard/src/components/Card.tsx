interface CardProps {
  title?: string
  value?: string | number
  subtitle?: string
  children?: React.ReactNode
  className?: string
}

export default function Card({ title, value, subtitle, children, className = '' }: CardProps) {
  return (
    <div className={`rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-5 shadow-[var(--shadow)] ${className}`}>
      {title && !children && (
        <>
          <p className="text-sm text-[var(--text-secondary)]">{title}</p>
          <p className="mt-1 text-2xl font-semibold text-[var(--text)]">{value}</p>
          {subtitle && <p className="mt-0.5 text-xs text-[var(--text-tertiary)]">{subtitle}</p>}
        </>
      )}
      {children}
    </div>
  )
}
