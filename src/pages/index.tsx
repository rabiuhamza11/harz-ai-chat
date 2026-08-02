import { useState, useRef, useEffect, useCallback } from 'react'
import Head from 'next/head'
import Sidebar from '../components/Sidebar'
import ChatMessage from '../components/ChatMessage'
import ChatInput from '../components/ChatInput'
import WelcomeScreen from '../components/WelcomeScreen'
import { Conversation, Message, AIModel } from '../lib/types'
import { v4 } from '../lib/utils'

export default function Home() {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [currentConvId, setCurrentConvId] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [model, setModel] = useState<AIModel>('openai')
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  // Load conversations from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('harz-conversations')
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        setConversations(parsed)
      } catch (e) {
        console.error('Failed to load conversations', e)
      }
    }
  }, [])

  // Save conversations to localStorage
  useEffect(() => {
    if (conversations.length > 0) {
      localStorage.setItem('harz-conversations', JSON.stringify(conversations))
    }
  }, [conversations])

  // Load messages when conversation changes
  useEffect(() => {
    if (currentConvId) {
      const conv = conversations.find(c => c.id === currentConvId)
      if (conv) {
        setMessages(conv.messages)
      }
    } else {
      setMessages([])
    }
  }, [currentConvId])

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isLoading])

  const createNewConversation = useCallback((): string => {
    const newId = v4()
    const newConv: Conversation = {
      id: newId,
      title: 'New Chat',
      messages: [],
      model,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }
    setConversations(prev => [newConv, ...prev])
    setCurrentConvId(newId)
    setMessages([])
    return newId
  }, [model])

  const handleSendMessage = useCallback(async (content: string) => {
    if (!content.trim() || isLoading) return

    let convId = currentConvId
    if (!convId) {
      convId = createNewConversation()
    }

    const userMessage: Message = {
      id: v4(),
      role: 'user',
      content,
      timestamp: Date.now(),
    }

    const updatedMessages = [...messages, userMessage]
    setMessages(updatedMessages)

    // Update conversation title if it's the first message
    const newTitle = messages.length === 0 
      ? content.slice(0, 40) + (content.length > 40 ? '...' : '')
      : conversations.find(c => c.id === convId)?.title

    setConversations(prev => prev.map(c => 
      c.id === convId 
        ? { ...c, title: newTitle || c.title, messages: updatedMessages, updatedAt: Date.now() }
        : c
    ))

    setIsLoading(true)
    abortControllerRef.current = new AbortController()

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: updatedMessages,
          model,
        }),
        signal: abortControllerRef.current.signal,
      })

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`)
      }

      const reader = response.body?.getReader()
      if (!reader) throw new Error('No response body')

      const decoder = new TextDecoder()
      let aiContent = ''
      const aiMessageId = v4()

      // Add empty AI message
      const aiMessage: Message = {
        id: aiMessageId,
        role: 'assistant',
        content: '',
        timestamp: Date.now(),
        model,
      }
      setMessages(prev => [...prev, aiMessage])

      // Stream response
      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value, { stream: true })
        const lines = chunk.split('\n')

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6)
            if (data === '[DONE]') continue
            try {
              const parsed = JSON.parse(data)
              if (parsed.content) {
                aiContent += parsed.content
                setMessages(prev => prev.map(m =>
                  m.id === aiMessageId ? { ...m, content: aiContent } : m
                ))
              }
            } catch (e) {
              // Skip invalid JSON
            }
          }
        }
      }

      // Update conversation with final messages
      const finalMessages = [...updatedMessages, { ...aiMessage, content: aiContent }]
      setConversations(prev => prev.map(c =>
        c.id === convId
          ? { ...c, messages: finalMessages, updatedAt: Date.now() }
          : c
      ))

    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.log('Request aborted')
      } else {
        console.error('Chat error:', error)
        const errorMessage: Message = {
          id: v4(),
          role: 'assistant',
          content: `Sorry, an error occurred: ${error.message}`,
          timestamp: Date.now(),
          model,
        }
        setMessages(prev => [...prev, errorMessage])
      }
    } finally {
      setIsLoading(false)
      abortControllerRef.current = null
    }
  }, [currentConvId, messages, isLoading, model, conversations, createNewConversation])

  const handleStop = useCallback(() => {
    abortControllerRef.current?.abort()
    setIsLoading(false)
  }, [])

  const handleDeleteConversation = useCallback((id: string) => {
    setConversations(prev => prev.filter(c => c.id !== id))
    if (currentConvId === id) {
      setCurrentConvId(null)
      setMessages([])
    }
  }, [currentConvId])

  const handleSelectConversation = useCallback((id: string) => {
    setCurrentConvId(id)
  }, [])

  return (
    <div className="flex h-screen bg-harz-bg">
      <Head>
        <title>Harz AI - Custom Fine-tuned Assistant</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      {/* Sidebar */}
      <Sidebar
        conversations={conversations}
        currentConvId={currentConvId}
        onNewChat={createNewConversation}
        onSelectConv={handleSelectConversation}
        onDeleteConv={handleDeleteConversation}
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
        model={model}
        onModelChange={setModel}
      />

      {/* Main chat area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="flex items-center justify-between px-4 py-3 border-b border-harz-border bg-harz-dark">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-1.5 rounded-lg hover:bg-harz-border transition-colors"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            </button>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-harz-accent to-pink-500 flex items-center justify-center font-bold text-white text-sm">
                H
              </div>
              <span className="font-semibold text-lg gradient-text">Harz AI</span>
              {model === 'openai' ? (
                <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/10 text-green-400 border border-green-500/20">
                  GPT-4o Mini
                </span>
              ) : (
                <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
                  Open Source
                </span>
              )}
            </div>
          </div>
        </header>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto">
          {messages.length === 0 ? (
            <WelcomeScreen onSuggestion={handleSendMessage} />
          ) : (
            <div className="max-w-3xl mx-auto px-4 py-6">
              {messages.map((msg) => (
                <ChatMessage key={msg.id} message={msg} />
              ))}
              {isLoading && messages[messages.length - 1]?.role === 'user' && (
                <div className="flex items-center gap-2 py-4 px-4">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-harz-accent to-pink-500 flex items-center justify-center text-white text-xs font-bold">
                    H
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="typing-dot"></span>
                    <span className="typing-dot"></span>
                    <span className="typing-dot"></span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input */}
        <ChatInput
          onSend={handleSendMessage}
          onStop={handleStop}
          isLoading={isLoading}
        />
      </div>
    </div>
  )
}
