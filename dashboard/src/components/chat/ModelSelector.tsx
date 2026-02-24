import { useState, useRef, useEffect } from 'react'
import type { ModelInfo } from '../../api/types'

interface ModelSelectorProps {
  models: ModelInfo[]
  selected: string
  onSelect: (model: string) => void
  disabled?: boolean
  isOpen?: boolean
  onOpenChange?: (open: boolean) => void
}

export default function ModelSelector({ models, selected, onSelect, disabled, isOpen, onOpenChange }: ModelSelectorProps) {
  const [internalOpen, setInternalOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  // Controlled takes precedence over internal state
  const open = isOpen !== undefined ? isOpen : internalOpen
  const setOpen = (v: boolean) => {
    if (onOpenChange) onOpenChange(v)
    setInternalOpen(v)
  }

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const displayName = selected || 'Select model'

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => !disabled && setOpen(!open)}
        disabled={disabled}
        className="flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg bg-[var(--bg-input)] border border-[var(--border)] text-[var(--text)] hover:bg-[var(--bg-hover)] transition-colors disabled:opacity-50"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="12 2 2 7 12 12 22 7 12 2" /><polyline points="2 17 12 22 22 17" /><polyline points="2 12 12 17 22 12" />
        </svg>
        <span className="max-w-[200px] truncate">{displayName}</span>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {open && (
        <div className="absolute top-full mt-1 left-0 z-50 min-w-[200px] max-h-[300px] overflow-y-auto bg-[var(--bg-card)] border border-[var(--border)] rounded-lg shadow-lg">
          {models.length === 0 ? (
            <div className="px-3 py-2 text-sm text-[var(--text-tertiary)]">
              No models loaded
            </div>
          ) : (
            models.map(m => (
              <button
                key={m.name}
                onClick={() => { onSelect(m.name); setOpen(false) }}
                className={`w-full text-left px-3 py-2 text-sm hover:bg-[var(--bg-hover)] transition-colors ${
                  m.name === selected ? 'text-brand-light font-medium' : 'text-[var(--text)]'
                }`}
              >
                <div>{m.name}</div>
                <div className="text-xs text-[var(--text-tertiary)]">{m.params} &middot; {m.quantization}</div>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  )
}
