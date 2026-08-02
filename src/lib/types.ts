export type AIModel = 'openai' | 'opensource'

export interface Message {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: number
  model?: AIModel
}

export interface Conversation {
  id: string
  title: string
  messages: Message[]
  model: AIModel
  createdAt: number
  updatedAt: number
}

export interface ChatRequest {
  messages: Message[]
  model: AIModel
}

export interface StreamChunk {
  content: string
}
