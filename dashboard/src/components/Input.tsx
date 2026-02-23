import type { InputHTMLAttributes } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
}

export default function Input({ label, error, className = '', id, ...props }: InputProps) {
  const inputId = id || label?.toLowerCase().replace(/\s+/g, '-')

  return (
    <div className="space-y-1">
      {label && (
        <label htmlFor={inputId} className="block text-sm font-medium text-[var(--text)]">
          {label}
        </label>
      )}
      <input
        id={inputId}
        className={`w-full px-3 py-2 rounded-lg border bg-[var(--bg-input)] text-[var(--text)] placeholder:text-[var(--text-tertiary)] transition-colors focus:outline-none focus:ring-2 focus:ring-brand-light/50 focus:border-brand-light ${
          error ? 'border-[var(--red)]' : 'border-[var(--border-input)]'
        } ${className}`}
        {...props}
      />
      {error && <p className="text-xs text-[var(--red)]">{error}</p>}
    </div>
  )
}
