import { useState, useEffect, useCallback } from 'react'
import { useChatStore } from '../../store/chat'
import { useChatStream } from '../../hooks/useChatStream'
import { useInstanceContext } from '../../contexts/InstanceContext'
import { useUIStore } from '../../store/ui'
import ChatInput from '../../components/chat/ChatInput'
import MessageList from '../../components/chat/MessageList'
import ModelSelector from '../../components/chat/ModelSelector'
import ConversationList from '../../components/chat/ConversationList'
import ChatEmptyState from '../../components/chat/ChatEmptyState'

export default function Chat() {
  const { api } = useInstanceContext()
  const [models, setModels] = useState<{ name: string; size: number; format: string; family: string; params: string; quantization: string; modified: string }[]>([])
  const [conversationsOpen, setConversationsOpen] = useState(false)
  const setSidebarOpen = useUIStore(s => s.setSidebarOpen)

  const {
    conversations,
    activeId,
    streaming,
    streamingContent,
    error,
    newConversation,
    setActive,
    updateModel,
    getActiveConversation,
    setError,
  } = useChatStore()

  const { send, stop } = useChatStream()

  const conversation = getActiveConversation()
  const messages = conversation?.messages || []
  const selectedModel = conversation?.model || models[0]?.name || ''

  // Load models
  useEffect(() => {
    api.models().then(setModels).catch(() => {})
  }, [api])

  // Auto-create first conversation if none exists
  useEffect(() => {
    if (models.length > 0 && conversations.length === 0) {
      newConversation(models[0].name)
    } else if (models.length > 0 && !activeId && conversations.length > 0) {
      setActive(conversations[0].id)
    }
  }, [models, conversations.length, activeId, newConversation, setActive])

  const handleSend = useCallback((content: string) => {
    if (!activeId && models.length > 0) {
      newConversation(models[0].name)
    }
    // Small delay to ensure store is updated after newConversation
    setTimeout(() => send(content), 0)
  }, [activeId, models, newConversation, send])

  const handleNewConversation = useCallback(() => {
    if (models.length > 0) {
      newConversation(models[0].name)
    }
  }, [models, newConversation])

  const handleModelChange = useCallback((model: string) => {
    if (conversation) {
      updateModel(conversation.id, model)
    }
  }, [conversation, updateModel])

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey

      // Ctrl/Cmd+N: new conversation
      if (mod && e.key === 'n') {
        e.preventDefault()
        handleNewConversation()
      }

      // Ctrl/Cmd+K: focus model selector (handled by ModelSelector opening)
      if (mod && e.key === 'k') {
        e.preventDefault()
        // Toggle model selector - let component handle it
      }

      // Ctrl/Cmd+Shift+S: toggle conversation sidebar
      if (mod && e.shiftKey && e.key === 'S') {
        e.preventDefault()
        setConversationsOpen(v => !v)
      }

      // / to focus chat input (when not in an input already)
      if (e.key === '/' && !['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) {
        e.preventDefault()
        document.getElementById('chat-input')?.focus()
      }
    }

    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [handleNewConversation])

  return (
    <div className="flex flex-col h-screen lg:h-screen">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)] bg-[var(--bg)]">
        <div className="flex items-center gap-3">
          {/* Mobile menu button */}
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden text-[var(--text-secondary)] hover:text-[var(--text)] transition-colors"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>

          {/* Conversations toggle */}
          <button
            onClick={() => setConversationsOpen(!conversationsOpen)}
            className="flex items-center gap-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text)] transition-colors"
            title="Toggle conversations (Ctrl+Shift+S)"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
            <span className="hidden sm:inline">Conversations</span>
          </button>

          {/* New conversation */}
          <button
            onClick={handleNewConversation}
            className="p-1.5 text-[var(--text-secondary)] hover:text-[var(--text)] hover:bg-[var(--bg-hover)] rounded-lg transition-colors"
            title="New conversation (Ctrl+N)"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </button>
        </div>

        <ModelSelector
          models={models}
          selected={selectedModel}
          onSelect={handleModelChange}
          disabled={streaming}
        />
      </div>

      {/* Conversation sidebar panel */}
      <ConversationList open={conversationsOpen} onClose={() => setConversationsOpen(false)} />

      {/* Error banner */}
      {error && (
        <div className="mx-4 mt-2 px-4 py-2 rounded-lg bg-[var(--bg-error)] border border-red-200 dark:border-red-800 text-sm text-[var(--red)]">
          {error}
          <button onClick={() => setError(null)} className="ml-2 underline">Dismiss</button>
        </div>
      )}

      {/* Messages or empty state */}
      {messages.length === 0 && !streaming ? (
        <ChatEmptyState modelName={selectedModel} onSuggestion={handleSend} />
      ) : (
        <MessageList messages={messages} streaming={streaming} streamingContent={streamingContent} />
      )}

      {/* Input */}
      <ChatInput
        onSend={handleSend}
        onStop={stop}
        streaming={streaming}
        disabled={models.length === 0}
      />
    </div>
  )
}
