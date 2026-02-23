import type { ChatMessage } from '../../api/types'
import { useAutoScroll } from '../../hooks/useAutoScroll'
import MessageBubble from './MessageBubble'
import TypingIndicator from './TypingIndicator'

interface MessageListProps {
  messages: ChatMessage[]
  streaming: boolean
  streamingContent: string
}

export default function MessageList({ messages, streaming, streamingContent }: MessageListProps) {
  const { containerRef, userScrolledUp, scrollToBottom } = useAutoScroll([messages, streamingContent])

  // Create a virtual message for the streaming content
  const streamingMessage: ChatMessage | null = streaming && streamingContent ? {
    id: '__streaming__',
    role: 'assistant',
    content: streamingContent,
    createdAt: Date.now(),
  } : null

  return (
    <div ref={containerRef} className="flex-1 overflow-y-auto px-4 py-6">
      <div className="mx-auto max-w-3xl">
        {messages.map(msg => (
          <MessageBubble key={msg.id} message={msg} />
        ))}
        {streamingMessage && (
          <MessageBubble message={streamingMessage} isStreaming />
        )}
        {streaming && !streamingContent && (
          <div className="flex justify-start mb-4">
            <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl rounded-bl-md">
              <TypingIndicator />
            </div>
          </div>
        )}
      </div>

      {/* Scroll to bottom FAB */}
      {userScrolledUp && (
        <button
          onClick={scrollToBottom}
          className="fixed bottom-24 right-8 z-10 h-10 w-10 rounded-full bg-[var(--bg-card)] border border-[var(--border)] shadow-lg flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text)] transition-colors"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>
      )}
    </div>
  )
}
