import { create } from 'zustand'
import type { ChatMessage, Conversation } from '../api/types'

const STORAGE_KEY = 'solon-conversations'

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}

function loadConversations(): Conversation[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function saveConversations(conversations: Conversation[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(conversations))
}

interface ChatState {
  conversations: Conversation[]
  activeId: string | null
  streaming: boolean
  streamingContent: string
  error: string | null

  // Actions
  newConversation: (model: string) => string
  setActive: (id: string | null) => void
  deleteConversation: (id: string) => void
  renameConversation: (id: string, title: string) => void
  addMessage: (conversationId: string, message: ChatMessage) => void
  updateModel: (conversationId: string, model: string) => void
  setStreaming: (streaming: boolean) => void
  setStreamingContent: (content: string) => void
  appendStreamingContent: (content: string) => void
  setError: (error: string | null) => void
  getActiveConversation: () => Conversation | undefined
}

export const useChatStore = create<ChatState>((set, get) => ({
  conversations: loadConversations(),
  activeId: null,
  streaming: false,
  streamingContent: '',
  error: null,

  newConversation: (model: string) => {
    const id = generateId()
    const conversation: Conversation = {
      id,
      title: 'New conversation',
      model,
      messages: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }
    const conversations = [conversation, ...get().conversations]
    saveConversations(conversations)
    set({ conversations, activeId: id, error: null })
    return id
  },

  setActive: (id) => set({ activeId: id, error: null }),

  deleteConversation: (id) => {
    const conversations = get().conversations.filter(c => c.id !== id)
    saveConversations(conversations)
    const activeId = get().activeId === id ? (conversations[0]?.id || null) : get().activeId
    set({ conversations, activeId })
  },

  renameConversation: (id, title) => {
    const conversations = get().conversations.map(c =>
      c.id === id ? { ...c, title } : c
    )
    saveConversations(conversations)
    set({ conversations })
  },

  addMessage: (conversationId, message) => {
    const conversations = get().conversations.map(c => {
      if (c.id !== conversationId) return c
      const messages = [...c.messages, message]
      // Auto-title from first user message
      const title = c.messages.length === 0 && message.role === 'user'
        ? message.content.slice(0, 50) + (message.content.length > 50 ? '...' : '')
        : c.title
      return { ...c, messages, title, updatedAt: Date.now() }
    })
    saveConversations(conversations)
    set({ conversations })
  },

  updateModel: (conversationId, model) => {
    const conversations = get().conversations.map(c =>
      c.id === conversationId ? { ...c, model } : c
    )
    saveConversations(conversations)
    set({ conversations })
  },

  setStreaming: (streaming) => set({ streaming }),
  setStreamingContent: (content) => set({ streamingContent: content }),
  appendStreamingContent: (content) => set({ streamingContent: get().streamingContent + content }),
  setError: (error) => set({ error }),

  getActiveConversation: () => {
    const { conversations, activeId } = get()
    return conversations.find(c => c.id === activeId)
  },
}))
