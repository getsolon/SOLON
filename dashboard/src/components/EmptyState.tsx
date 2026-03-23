interface EmptyStateProps {
  icon?: React.ReactNode
  title: string
  description?: string
  action?: React.ReactNode
}

export default function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center animate-fade-in">
      {icon && <div className="mb-4 text-[var(--text-tertiary)]">{icon}</div>}
      <h3 className="text-lg font-medium text-[var(--text)]">{title}</h3>
      {description && <p className="mt-1 text-sm text-[var(--text-secondary)] max-w-sm">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}
