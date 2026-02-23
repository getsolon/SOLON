import { useState } from 'react'
import { useChatStore } from '../../store/chat'

interface ConversationListProps {
  open: boolean
  onClose: () => void
}

export default function ConversationList({ open, onClose }: ConversationListProps) {
  const { conversations, activeId, setActive, deleteConversation, renameConversation } = useChatStore()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState('')

  const startRename = (id: string, title: string) => {
    setEditingId(id)
    setEditTitle(title)
  }

  const commitRename = () => {
    if (editingId && editTitle.trim()) {
      renameConversation(editingId, editTitle.trim())
    }
    setEditingId(null)
  }

  if (!open) return null

  return (
    <>
      {/* Mobile overlay */}
      <div className="fixed inset-0 z-30 bg-black/30 lg:hidden" onClick={onClose} />

      <div className="fixed top-0 left-0 lg:left-60 z-30 h-full w-72 bg-[var(--bg)] border-r border-[var(--border)] flex flex-col shadow-xl lg:shadow-none transition-transform">
        <div className="flex items-center justify-between px-4 py-4 border-b border-[var(--border)]">
          <h2 className="text-sm font-semibold text-[var(--text)]">Conversations</h2>
          <button onClick={onClose} className="text-[var(--text-tertiary)] hover:text-[var(--text)] transition-colors">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {conversations.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-[var(--text-tertiary)]">
              No conversations yet
            </div>
          ) : (
            conversations.map(c => (
              <div
                key={c.id}
                className={`group flex items-center gap-2 px-4 py-3 cursor-pointer transition-colors ${
                  c.id === activeId ? 'bg-[var(--bg-hover)]' : 'hover:bg-[var(--bg-hover)]'
                }`}
                onClick={() => { setActive(c.id); onClose() }}
              >
                <div className="flex-1 min-w-0">
                  {editingId === c.id ? (
                    <input
                      value={editTitle}
                      onChange={e => setEditTitle(e.target.value)}
                      onBlur={commitRename}
                      onKeyDown={e => { if (e.key === 'Enter') commitRename(); if (e.key === 'Escape') setEditingId(null) }}
                      onClick={e => e.stopPropagation()}
                      autoFocus
                      className="w-full text-sm bg-[var(--bg-input)] border border-[var(--border-input)] rounded px-2 py-0.5 text-[var(--text)] focus:outline-none"
                    />
                  ) : (
                    <>
                      <div className="text-sm text-[var(--text)] truncate">{c.title}</div>
                      <div className="text-xs text-[var(--text-tertiary)]">
                        {c.messages.length} messages &middot; {c.model}
                      </div>
                    </>
                  )}
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={e => { e.stopPropagation(); startRename(c.id, c.title) }}
                    className="p-1 text-[var(--text-tertiary)] hover:text-[var(--text)] transition-colors"
                    title="Rename"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                    </svg>
                  </button>
                  <button
                    onClick={e => { e.stopPropagation(); deleteConversation(c.id) }}
                    className="p-1 text-[var(--text-tertiary)] hover:text-[var(--red)] transition-colors"
                    title="Delete"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                    </svg>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </>
  )
}
