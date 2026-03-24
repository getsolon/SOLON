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

  async function fallbackToSSE() {
    const modelList = await fetchJSON<{ models: ModelInfo[] }>('/api/v1/models').then(r => r.models || []).catch(() => [])
    setModels(modelList)
    if (modelList.length > 0 && !selectedModel) {
      setSelectedModel(modelList[0].name)
    }
    setMode(modelList.length > 0 ? 'sse' : 'disconnected')
  }

  let wsReqCounter = 0

  function connectWebSocket() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const ws = new WebSocket(`${protocol}//${window.location.host}/api/v1/openclaw/ws`)
    wsRef.current = ws
    wsReqCounter = 0

    ws.onopen = () => {
      // Send OpenClaw connect handshake (must be the first frame, protocol v3)
      const connectFrame = {
        type: 'req',
        id: `req_${++wsReqCounter}`,
        method: 'connect',
        params: {
          minProtocol: 3,
          maxProtocol: 3,
          client: {
            id: 'gateway-client',
            displayName: 'Solon',
            version: '2026.3.24',
            platform: 'linux',
            mode: 'backend',
            instanceId: crypto.randomUUID(),
          },
          caps: ['tool_events'],
          scopes: ['operator.admin'],
        },
      }
      ws.send(JSON.stringify(connectFrame))
    }

    ws.onmessage = (event) => {
      handleWSMessage(event.data)
    }

    ws.onclose = () => {
      wsRef.current = null
      fallbackToSSE()
    }

    ws.onerror = () => {
      wsRef.current = null
      fallbackToSSE()
    }
  }

  function handleWSMessage(data: string) {
    try {
      const frame = JSON.parse(data)

      // Handle connect response
      if (frame.type === 'res' && frame.ok) {
        // Check if this is the connect response (first response)
        if (mode !== 'ws') {
          setMode('ws')
          setError('')
          // Load chat history
          sendWSRequest('chat.history', { limit: 50 })
        }
        return
      }

      // Handle connect error
      if (frame.type === 'res' && !frame.ok) {
        console.warn('[ws] error response:', frame.error)
        return
      }

      // Handle events from OpenClaw (streaming agent output)
      if (frame.type === 'event') {
        handleOpenClawEvent(frame.event, frame.payload)
        return
      }
    } catch {
      // Non-JSON message — display as-is
      setMessages(prev => [...prev, {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: data,
        timestamp: Date.now(),
      }])
    }
  }

  function handleOpenClawEvent(event: string, payload: unknown) {
    const p = payload as Record<string, unknown> | undefined

    if (event === 'chat.message' || event === 'sessions.message') {
      const role = (p?.role as string) || 'assistant'
      const content = (p?.content as string) || (p?.text as string) || ''
      if (role === 'assistant' && content) {
        setMessages(prev => [...prev, {
          id: crypto.randomUUID(),
          role: 'assistant',
          content,
          timestamp: Date.now(),
        }])
      }
    } else if (event === 'chat.delta' || event === 'sessions.delta') {
      const delta = (p?.delta as string) || (p?.content as string) || ''
      if (delta) {
        setMessages(prev => {
          const last = prev[prev.length - 1]
          if (last && last.role === 'assistant' && last.isStreaming) {
            return [...prev.slice(0, -1), { ...last, content: last.content + delta }]
          }
          return [...prev, {
            id: crypto.randomUUID(),
            role: 'assistant',
            content: delta,
            timestamp: Date.now(),
            isStreaming: true,
          }]
        })
      }
    } else if (event === 'chat.done' || event === 'sessions.done' || event === 'agent.done') {
      // Mark streaming as complete
      setMessages(prev => prev.map(m => m.isStreaming ? { ...m, isStreaming: false } : m))
    } else if (event === 'agent.tool_use' || event === 'tool.start') {
      const tool = (p?.tool as string) || (p?.name as string) || 'tool'
      setMessages(prev => {
        const last = prev[prev.length - 1]
        if (last && last.role === 'assistant' && last.isStreaming) {
          return [...prev.slice(0, -1), { ...last, content: last.content + `\n[Using ${tool}...]\n` }]
        }
        return prev
      })
    }
  }

  function sendWSRequest(method: string, params?: unknown) {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return
    const frame = {
      type: 'req',
      id: `req_${++wsReqCounter}`,
      method,
      params,
    }
    wsRef.current.send(JSON.stringify(frame))
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
      // Send via OpenClaw protocol
      // Add streaming placeholder
      setMessages(prev => [...prev, {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: '',
        timestamp: Date.now(),
        isStreaming: true,
      }])
      sendWSRequest('chat.send', {
        sessionKey: 'main',
        message: text,
        idempotencyKey: crypto.randomUUID(),
      })
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
