import { useState, useEffect, useRef, useCallback } from 'react'
import { fetchJSON } from '../../api/client'
import type { ModelInfo } from '../../api/types'

interface ChatMessage {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: number
  isStreaming?: boolean
}

type ConnectionMode = 'ws' | 'sse' | 'connecting' | 'disconnected'

export default function Chat() {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [mode, setMode] = useState<ConnectionMode>('connecting')
  const [error, setError] = useState('')
  const [models, setModels] = useState<ModelInfo[]>([])
  const [selectedModel, setSelectedModel] = useState('')
  const [sending, setSending] = useState(false)
  const wsRef = useRef<WebSocket | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Focus input on mode change
  useEffect(() => {
    if (mode === 'ws' || mode === 'sse') inputRef.current?.focus()
  }, [mode])

  // On mount: detect mode and connect
  const connect = useCallback(async () => {
    setMode('connecting')
    setError('')

    try {
      const status = await fetchJSON<{ available: boolean; running: boolean }>('/api/v1/openclaw/status')

      if (status.running) {
        connectWebSocket()
      } else {
        // Load models for SSE fallback
        const modelList = await fetchJSON<{ models: ModelInfo[] }>('/api/v1/models').then(r => r.models || []).catch(() => [])
        setModels(modelList)
        if (modelList.length > 0 && !selectedModel) {
          setSelectedModel(modelList[0].name)
        }
        setMode('sse')
      }
    } catch {
      setMode('sse')
      // Try loading models anyway
      const modelList = await fetchJSON<{ models: ModelInfo[] }>('/api/v1/models').then(r => r.models || []).catch(() => [])
      setModels(modelList)
      if (modelList.length > 0 && !selectedModel) {
        setSelectedModel(modelList[0].name)
      }
    }
  }, [selectedModel])

  useEffect(() => { connect() }, [])

  function connectWebSocket() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const ws = new WebSocket(`${protocol}//${window.location.host}/api/v1/openclaw/ws`)
    wsRef.current = ws

    ws.onopen = () => {
      setMode('ws')
      setError('')
    }

    ws.onmessage = (event) => {
      handleWSMessage(event.data)
    }

    ws.onclose = (event) => {
      wsRef.current = null
      if (event.code !== 1000) {
        setError('Agent disconnected')
      }
      setMode('disconnected')
    }

    ws.onerror = () => {
      wsRef.current = null
      setMode('disconnected')
    }
  }

  function handleWSMessage(data: string) {
    // OpenClaw sends JSON messages — try to parse and extract content
    try {
      const msg = JSON.parse(data)
      // Adapt based on OpenClaw's actual protocol
      if (msg.content || msg.text || msg.message) {
        const content = msg.content || msg.text || msg.message
        setMessages(prev => {
          // If last message is a streaming assistant message, append
          const last = prev[prev.length - 1]
          if (last && last.role === 'assistant' && last.isStreaming) {
            return [...prev.slice(0, -1), { ...last, content: last.content + content }]
          }
          return [...prev, {
            id: crypto.randomUUID(),
            role: 'assistant',
            content,
            timestamp: Date.now(),
          }]
        })
      }
    } catch {
      // Raw text message
      setMessages(prev => [...prev, {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: data,
        timestamp: Date.now(),
      }])
    }
  }

  async function handleSend() {
    const text = input.trim()
    if (!text || sending) return

    setInput('')

    // Add user message
    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: text,
      timestamp: Date.now(),
    }
    setMessages(prev => [...prev, userMsg])

    if (mode === 'ws' && wsRef.current?.readyState === WebSocket.OPEN) {
      // Send via WebSocket to OpenClaw
      wsRef.current.send(JSON.stringify({ type: 'message', content: text }))
    } else {
      // Send via SSE to Solon's inference API
      await sendViaSSE(text)
    }
  }

  async function sendViaSSE(text: string) {
    if (!selectedModel) {
      setError('No model selected')
      return
    }

    setSending(true)
    const assistantId = crypto.randomUUID()

    // Add empty streaming message
    setMessages(prev => [...prev, {
      id: assistantId,
      role: 'assistant',
      content: '',
      timestamp: Date.now(),
      isStreaming: true,
    }])

    try {
      const allMessages = messages.filter(m => m.role !== 'system').map(m => ({
        role: m.role,
        content: m.content,
      }))
      allMessages.push({ role: 'user', content: text })

      const response = await fetch('/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: selectedModel,
          messages: allMessages,
          stream: true,
        }),
      })

      if (!response.ok) {
        const err = await response.json().catch(() => ({ error: { message: response.statusText } }))
        throw new Error((err as { error?: { message?: string } }).error?.message || `HTTP ${response.status}`)
      }

      const reader = response.body?.getReader()
      if (!reader) throw new Error('No response body')

      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          const trimmed = line.trim()
          if (!trimmed || !trimmed.startsWith('data: ')) continue
          const payload = trimmed.slice(6)
          if (payload === '[DONE]') break

          try {
            const chunk = JSON.parse(payload) as {
              choices?: { delta?: { content?: string } }[]
            }
            const delta = chunk.choices?.[0]?.delta?.content
            if (delta) {
              setMessages(prev => prev.map(m =>
                m.id === assistantId ? { ...m, content: m.content + delta } : m
              ))
            }
          } catch { /* skip malformed */ }
        }
      }

      // Mark as done streaming
      setMessages(prev => prev.map(m =>
        m.id === assistantId ? { ...m, isStreaming: false } : m
      ))
    } catch (e) {
      setError((e as Error).message)
      // Remove the empty assistant message on error
      setMessages(prev => prev.filter(m => m.id !== assistantId || m.content !== ''))
    } finally {
      setSending(false)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const modeLabel = {
    ws: 'Agent',
    sse: 'Direct',
    connecting: 'Connecting...',
    disconnected: 'Disconnected',
  }[mode]

  const modeColor = {
    ws: 'text-green-400',
    sse: 'text-blue-400',
    connecting: 'text-yellow-400',
    disconnected: 'text-red-400',
  }[mode]

  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem)]">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-[var(--border)] bg-[var(--bg-card)]">
        <div className="flex items-center gap-3">
          <h1 className="text-sm font-semibold text-[var(--text)]">Chat</h1>
          <span className={`flex items-center gap-1.5 text-xs ${modeColor}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${mode === 'ws' ? 'bg-green-400' : mode === 'sse' ? 'bg-blue-400' : mode === 'connecting' ? 'bg-yellow-400 animate-pulse' : 'bg-red-400'}`} />
            {modeLabel}
          </span>
          {mode === 'sse' && models.length > 0 && (
            <select
              value={selectedModel}
              onChange={e => setSelectedModel(e.target.value)}
              className="text-xs px-2 py-1 rounded border border-[var(--border)] bg-[var(--bg)] text-[var(--text)]"
            >
              {models.map(m => (
                <option key={m.name} value={m.name}>{m.name}</option>
              ))}
            </select>
          )}
        </div>
        <div className="flex items-center gap-2">
          {(mode === 'disconnected') && (
            <button onClick={connect} className="text-xs text-[var(--accent)] hover:underline">
              Reconnect
            </button>
          )}
          {messages.length > 0 && (
            <button
              onClick={() => setMessages([])}
              className="text-xs text-[var(--text-tertiary)] hover:text-[var(--text)]"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div className="px-4 py-2 bg-red-500/10 text-red-400 text-xs flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError('')} className="underline">dismiss</button>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center max-w-sm">
              <p className="text-4xl mb-4">&#x1F99E;</p>
              <p className="text-[var(--text-secondary)] text-sm">
                {mode === 'ws'
                  ? 'Connected to OpenClaw agent. Type a message to start.'
                  : 'Type a message to chat with your AI model.'}
              </p>
              {mode === 'sse' && (
                <p className="text-xs text-[var(--text-tertiary)] mt-2">
                  Start OpenClaw for the full agent experience with tools and code execution.
                </p>
              )}
            </div>
          </div>
        ) : (
          messages.map(msg => (
            <div
              key={msg.id}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] rounded-xl px-4 py-2.5 text-sm whitespace-pre-wrap ${
                  msg.role === 'user'
                    ? 'bg-[var(--accent)] text-white rounded-br-sm'
                    : 'bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text)] rounded-bl-sm'
                }`}
              >
                {msg.content || (msg.isStreaming ? (
                  <span className="inline-flex gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-[var(--text-tertiary)] animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-[var(--text-tertiary)] animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-[var(--text-tertiary)] animate-bounce" style={{ animationDelay: '300ms' }} />
                  </span>
                ) : '')}
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t border-[var(--border)] bg-[var(--bg-card)] px-4 py-3">
        <div className="flex gap-2 max-w-3xl mx-auto">
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={mode === 'ws' ? 'Message your agent...' : 'Message...'}
            rows={1}
            className="flex-1 px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg)] text-[var(--text)] text-sm resize-none focus:outline-none focus:border-[var(--accent)]"
            disabled={mode === 'connecting' || mode === 'disconnected'}
            style={{ minHeight: '40px', maxHeight: '120px' }}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || sending || mode === 'connecting' || mode === 'disconnected'}
            className="px-4 py-2 rounded-lg text-sm font-medium bg-[var(--accent)] text-white hover:opacity-90 transition-opacity disabled:opacity-30"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  )
}
