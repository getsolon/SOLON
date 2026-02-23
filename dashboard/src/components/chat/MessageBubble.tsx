import type { ChatMessage } from '../../api/types'
import MarkdownRenderer from './MarkdownRenderer'

interface MessageBubbleProps {
  message: ChatMessage
  isStreaming?: boolean
}

export default function MessageBubble({ message, isStreaming }: MessageBubbleProps) {
  const isUser = message.role === 'user'

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}>
      <div className={`max-w-[85%] lg:max-w-[75%] ${
        isUser
          ? 'bg-brand text-white rounded-2xl rounded-br-md px-4 py-3'
          : 'bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text)] rounded-2xl rounded-bl-md px-4 py-3'
      }`}>
        {isUser ? (
          <p className="whitespace-pre-wrap text-sm leading-relaxed">{message.content}</p>
        ) : (
          <div className="text-sm leading-relaxed">
            <MarkdownRenderer content={message.content} />
            {isStreaming && (
              <span className="inline-block w-0.5 h-4 ml-0.5 bg-brand-light animate-pulse align-text-bottom" />
            )}
          </div>
        )}
      </div>
    </div>
  )
}
