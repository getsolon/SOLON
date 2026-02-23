interface ChatEmptyStateProps {
  modelName: string
  onSuggestion: (text: string) => void
}

const suggestions = [
  'Explain quantum computing in simple terms',
  'Write a Python function to check if a number is prime',
  'What are the pros and cons of microservices?',
  'Help me write a professional email',
]

export default function ChatEmptyState({ modelName, onSuggestion }: ChatEmptyStateProps) {
  return (
    <div className="flex-1 flex items-center justify-center p-4">
      <div className="text-center max-w-md">
        <div className="mx-auto mb-4 h-14 w-14 rounded-2xl bg-brand flex items-center justify-center">
          <span className="text-white font-bold text-2xl">S</span>
        </div>
        <h2 className="text-xl font-semibold text-[var(--text)] mb-1">
          Start a conversation
        </h2>
        <p className="text-sm text-[var(--text-secondary)] mb-8">
          Using <span className="font-medium text-[var(--text)]">{modelName}</span>
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {suggestions.map((text) => (
            <button
              key={text}
              onClick={() => onSuggestion(text)}
              className="text-left p-3 rounded-xl border border-[var(--border)] bg-[var(--bg-card)] text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text)] transition-colors"
            >
              {text}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
