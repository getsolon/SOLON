import { useUIStore } from '../store/ui'

export default function TopBar({ title }: { title?: string }) {
  const { setSidebarOpen } = useUIStore()

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between border-b border-[var(--border)] backdrop-blur-lg bg-[var(--bg)]/80 px-4 py-3 lg:hidden">
      <div className="flex items-center gap-3">
        <button
          onClick={() => setSidebarOpen(true)}
          className="p-1.5 rounded-lg text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] transition-colors"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>
        {title && <h1 className="text-lg font-semibold text-[var(--text)]">{title}</h1>}
      </div>
    </header>
  )
}
