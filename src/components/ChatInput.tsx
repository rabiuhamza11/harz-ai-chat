import { useState, useRef, KeyboardEvent } from 'react'

interface ChatInputProps {
  onSend: (content: string) => void
  onStop: () => void
  isLoading: boolean
}

export default function ChatInput({ onSend, onStop, isLoading }: ChatInputProps) {
  const [input, setInput] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const handleSubmit = () => {
    if (!input.trim() || isLoading) return
    onSend(input.trim())
    setInput('')
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value)
    const textarea = e.target
    textarea.style.height = 'auto'
    textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`
  }

  return (
    <div className="border-t border-harz-border bg-harz-dark p-4">
      <div className="max-w-3xl mx-auto">
        <div className="relative flex items-end gap-2 bg-harz-bg border border-harz-border rounded-2xl px-4 py-3 chat-input transition-all">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
            placeholder="Message Harz AI..."
            rows={1}
            className="flex-1 bg-transparent border-none outline-none resize-none text-sm text-harz-text placeholder:text-harz-text-dim max-h-48"
            disabled={isLoading}
          />
          {isLoading ? (
            <button
              onClick={onStop}
              className="flex-shrink-0 w-8 h-8 rounded-lg bg-red-500/20 border border-red-500/30 hover:bg-red-500/30 transition-colors flex items-center justify-center"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" className="text-red-400">
                <rect x="6" y="6" width="12" height="12" rx="2" />
              </svg>
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={!input.trim()}
              className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center transition-all ${
                input.trim()
                  ? 'bg-harz-accent hover:bg-harz-accent-light text-white'
                  : 'bg-harz-border text-harz-text-dim cursor-not-allowed'
              }`}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="22" y1="2" x2="11" y2="13" />
                <polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
            </button>
          )}
        </div>
        <div className="text-center text-xs text-harz-text-dim mt-2">
          Harz AI can make mistakes. Always verify important information.
        </div>
      </div>
    </div>
  )
}
