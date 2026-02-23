import type { ChatCompletionChunk } from './types'

export interface StreamCallbacks {
  onToken: (content: string) => void
  onDone: () => void
  onError: (error: Error) => void
}

/**
 * Streams a chat completion request via SSE.
 * Returns an AbortController to cancel the stream.
 */
export function streamChatCompletion(
  url: string,
  body: object,
  callbacks: StreamCallbacks,
): AbortController {
  const controller = new AbortController()

  ;(async () => {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: controller.signal,
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: { message: res.statusText } }))
        throw new Error(err.error?.message || res.statusText)
      }

      const reader = res.body?.getReader()
      if (!reader) throw new Error('No response body')

      const decoder = new TextDecoder()
      let buffer = ''
      let tokenBuffer = ''
      let rafId: number | null = null

      const flushTokens = () => {
        if (tokenBuffer) {
          callbacks.onToken(tokenBuffer)
          tokenBuffer = ''
        }
        rafId = null
      }

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })

        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          const trimmed = line.trim()
          if (!trimmed || trimmed.startsWith(':')) continue

          if (trimmed === 'data: [DONE]') {
            flushTokens()
            callbacks.onDone()
            return
          }

          if (trimmed.startsWith('data: ')) {
            try {
              const chunk: ChatCompletionChunk = JSON.parse(trimmed.slice(6))
              const content = chunk.choices[0]?.delta?.content
              if (content) {
                tokenBuffer += content
                if (!rafId) {
                  rafId = requestAnimationFrame(flushTokens)
                }
              }
            } catch {
              // skip malformed chunks
            }
          }
        }
      }

      // Flush remaining
      flushTokens()
      callbacks.onDone()
    } catch (err) {
      if ((err as Error).name === 'AbortError') return
      callbacks.onError(err as Error)
    }
  })()

  return controller
}
