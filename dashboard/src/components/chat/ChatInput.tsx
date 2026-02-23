import { useState, useRef, useEffect, useCallback } from 'react'

interface ChatInputProps {
  onSend: (message: string) => void
  onStop: () => void
  streaming: boolean
  disabled?: boolean
}

export default function ChatInput({ onSend, onStop, streaming, disabled }: ChatInputProps) {
  const [value, setValue] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const resize = useCallback(() => {
    const el = textareaRef.current
    if (el) {
      el.style.height = 'auto'
      el.style.height = Math.min(el.scrollHeight, 192) + 'px' // max 6 lines ~192px
    }
  }, [])

  useEffect(() => {
    resize()
  }, [value, resize])

  // Focus on mount and expose for keyboard shortcut
  useEffect(() => {
    textareaRef.current?.focus()
  }, [])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleSend = () => {
    const trimmed = value.trim()
    if (!trimmed || streaming || disabled) return
    onSend(trimmed)
    setValue('')
  }

  return (
    <div className="border-t border-[var(--border)] bg-[var(--bg)] p-4">
      <div className="mx-auto max-w-3xl flex items-end gap-3">
        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            value={value}
            onChange={e => setValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Send a message..."
            disabled={disabled}
            rows={1}
            className="w-full resize-none rounded-xl border border-[var(--border-input)] bg-[var(--bg-input)] px-4 py-3 text-sm text-[var(--text)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:ring-2 focus:ring-brand-light/30 focus:border-brand-light transition-colors disabled:opacity-50"
            id="chat-input"
          />
        </div>
        {streaming ? (
          <button
            onClick={onStop}
            className="flex-shrink-0 h-10 w-10 rounded-xl bg-red-500 hover:bg-red-600 text-white flex items-center justify-center transition-colors"
            title="Stop generating"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <rect x="6" y="6" width="12" height="12" rx="2" />
            </svg>
          </button>
        ) : (
          <button
            onClick={handleSend}
            disabled={!value.trim() || disabled}
            className="flex-shrink-0 h-10 w-10 rounded-xl bg-brand hover:bg-brand/90 text-white flex items-center justify-center transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            title="Send message"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          </button>
        )}
      </div>
    </div>
  )
}
