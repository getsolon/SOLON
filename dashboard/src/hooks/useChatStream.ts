import { useRef, useCallback } from 'react'
import { streamChatCompletion } from '../api/streaming'
import { useChatStore } from '../store/chat'
import type { ChatMessage } from '../api/types'

function messageId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}

export function useChatStream() {
  const abortRef = useRef<AbortController | null>(null)

  const {
    getActiveConversation,
    addMessage,
    setStreaming,
    setStreamingContent,
    appendStreamingContent,
    setError,
  } = useChatStore()

  const send = useCallback((content: string) => {
    const conversation = getActiveConversation()
    if (!conversation) return

    // Add user message
    const userMsg: ChatMessage = {
      id: messageId(),
      role: 'user',
      content,
      createdAt: Date.now(),
    }
    addMessage(conversation.id, userMsg)

    // Prepare messages for API
    const apiMessages = [...conversation.messages, userMsg].map(m => ({
      role: m.role,
      content: m.content,
    }))

    setStreaming(true)
    setStreamingContent('')
    setError(null)

    abortRef.current = streamChatCompletion(
      '/v1/chat/completions',
      {
        model: conversation.model,
        messages: apiMessages,
        stream: true,
      },
      {
        onToken: (token) => {
          appendStreamingContent(token)
        },
        onDone: () => {
          // Finalize: add assistant message from accumulated content
          const finalContent = useChatStore.getState().streamingContent
          if (finalContent) {
            const assistantMsg: ChatMessage = {
              id: messageId(),
              role: 'assistant',
              content: finalContent,
              createdAt: Date.now(),
            }
            addMessage(conversation.id, assistantMsg)
          }
          setStreaming(false)
          setStreamingContent('')
        },
        onError: (error) => {
          setStreaming(false)
          setStreamingContent('')
          setError(error.message)
        },
      },
    )
  }, [getActiveConversation, addMessage, setStreaming, setStreamingContent, appendStreamingContent, setError])

  const stop = useCallback(() => {
    if (abortRef.current) {
      abortRef.current.abort()
      abortRef.current = null
    }

    // Save whatever was streamed so far
    const content = useChatStore.getState().streamingContent
    const conversation = getActiveConversation()
    if (content && conversation) {
      const assistantMsg: ChatMessage = {
        id: messageId(),
        role: 'assistant',
        content,
        createdAt: Date.now(),
      }
      addMessage(conversation.id, assistantMsg)
    }
    setStreaming(false)
    setStreamingContent('')
  }, [getActiveConversation, addMessage, setStreaming, setStreamingContent])

  return { send, stop }
}
