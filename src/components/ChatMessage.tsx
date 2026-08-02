import { Message } from '../lib/types'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { vscDarkPlus } from 'react-syntax-highlighter/dist/cjs/styles/prism'
import { useState } from 'react'

export default function ChatMessage({ message }: { message: Message }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const isUser = message.role === 'user'

  return (
    <div className="message-row group py-4 animate-fade-in">
      <div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : ''}`}>
        {/* Avatar */}
        <div
          className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold flex-shrink-0 ${
            isUser
              ? 'bg-harz-accent text-white'
              : 'bg-gradient-to-br from-harz-accent to-pink-500 text-white'
          }`}
        >
          {isUser ? 'U' : 'H'}
        </div>

        {/* Message content */}
        <div className={`flex-1 min-w-0 ${isUser ? 'flex justify-end' : ''}`}>
          <div
            className={`inline-block max-w-full ${
              isUser
                ? 'bg-harz-accent/20 border border-harz-accent/30 rounded-2xl rounded-tr-sm px-4 py-3'
                : ''
            }`}
          >
            {isUser ? (
              <p className="text-sm whitespace-pre-wrap">{message.content}</p>
            ) : (
              <div className="markdown-content text-sm leading-relaxed">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    code({ node, className, children, ...props }: any) {
                      const match = /language-(\w+)/.exec(className || '')
                      const isInline = !match && !className
                      return !isInline && match ? (
                        <SyntaxHighlighter
                          style={vscDarkPlus as any}
                          language={match[1]}
                          PreTag="div"
                          customStyle={{
                            background: '#0d1117',
                            border: '1px solid #2a2a4a',
                            borderRadius: '8px',
                            fontSize: '13px',
                          }}
                          {...props}
                        >
                          {String(children).replace(/\n$/, '')}
                        </SyntaxHighlighter>
                      ) : (
                        <code
                          className="px-1.5 py-0.5 rounded bg-harz-border text-pink-300 text-xs font-mono"
                          {...props}
                        >
                          {children}
                        </code>
                      )
                    },
                  }}
                >
                  {message.content || ' '}
                </ReactMarkdown>
              </div>
            )}
          </div>

          {/* Actions */}
          {!isUser && message.content && (
            <div className="message-actions flex items-center gap-2 mt-1">
              <button
                onClick={handleCopy}
                className="text-xs text-harz-text-dim hover:text-harz-text flex items-center gap-1"
              >
                {copied ? (
                  <>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    Copied
                  </>
                ) : (
                  <>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                    </svg>
                    Copy
                  </>
                )}
              </button>
              {message.model && (
                <span className="text-xs text-harz-text-dim">
                  {message.model === 'openai' ? 'GPT-4o Mini' : 'Open Source'}
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
