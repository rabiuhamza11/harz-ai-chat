import { Conversation, AIModel } from '../lib/types'

interface SidebarProps {
  conversations: Conversation[]
  currentConvId: string | null
  onNewChat: () => void
  onSelectConv: (id: string) => void
  onDeleteConv: (id: string) => void
  isOpen: boolean
  onToggle: () => void
  model: AIModel
  onModelChange: (model: AIModel) => void
}

export default function Sidebar({
  conversations,
  currentConvId,
  onNewChat,
  onSelectConv,
  onDeleteConv,
  isOpen,
  onToggle,
  model,
  onModelChange,
}: SidebarProps) {
  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-20 md:hidden"
          onClick={onToggle}
        />
      )}

      <aside
        className={`${
          isOpen ? 'w-72' : 'w-0'
        } transition-all duration-300 overflow-hidden bg-harz-dark border-r border-harz-border flex flex-col z-30`}
      >
        <div className="w-72 flex flex-col h-full">
          {/* New chat button */}
          <div className="p-3">
            <button
              onClick={onNewChat}
              className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg bg-gradient-to-r from-harz-accent/20 to-pink-500/20 border border-harz-accent/30 hover:from-harz-accent/30 hover:to-pink-500/30 transition-all text-sm font-medium"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              New Chat
            </button>
          </div>

          {/* Model selector */}
          <div className="px-3 pb-3">
            <div className="text-xs text-harz-text-dim mb-2 px-1">Model</div>
            <div className="space-y-1">
              <button
                onClick={() => onModelChange('openai')}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors flex items-center justify-between ${
                  model === 'openai'
                    ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                    : 'hover:bg-harz-border text-harz-text-dim'
                }`}
              >
                <span>GPT-4o Mini</span>
                <span className="text-xs opacity-60">OpenAI</span>
              </button>
              <button
                onClick={() => onModelChange('opensource')}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors flex items-center justify-between ${
                  model === 'opensource'
                    ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                    : 'hover:bg-harz-border text-harz-text-dim'
                }`}
              >
                <span>Qwen/Llama</span>
                <span className="text-xs opacity-60">Open Source</span>
              </button>
            </div>
          </div>

          {/* Conversation list */}
          <div className="flex-1 overflow-y-auto px-2">
            {conversations.length === 0 ? (
              <div className="text-center text-harz-text-dim text-sm py-8">
                No conversations yet
              </div>
            ) : (
              <div className="space-y-0.5">
                {conversations.map((conv) => (
                  <div
                    key={conv.id}
                    className={`group flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-colors ${
                      currentConvId === conv.id
                        ? 'bg-harz-border'
                        : 'hover:bg-harz-border/50'
                    }`}
                    onClick={() => onSelectConv(conv.id)}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-harz-text-dim flex-shrink-0">
                      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                    </svg>
                    <span className="text-sm truncate flex-1">{conv.title}</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        onDeleteConv(conv.id)
                      }}
                      className="opacity-0 group-hover:opacity-100 text-harz-text-dim hover:text-red-400 transition-all flex-shrink-0"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-3 border-t border-harz-border">
            <div className="text-xs text-harz-text-dim text-center">
              Harz AI v1.0
              <br />
              Fine-tuned for your business
            </div>
          </div>
        </div>
      </aside>
    </>
  )
}
