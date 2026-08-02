interface WelcomeScreenProps {
  onSuggestion: (text: string) => void
}

const suggestions = [
  {
    icon: '💬',
    title: 'Business Consultation',
    text: 'Help me write a business proposal for a new digital service',
  },
  {
    icon: '🌐',
    title: 'Hausa Translation',
    text: 'Translate this to Hausa: Welcome to our digital platform, how can we help you today?',
  },
  {
    icon: '🛒',
    title: 'Customer Service',
    text: 'A customer is complaining about a delayed order, help me write a professional response',
  },
  {
    icon: '💻',
    title: 'Code Help',
    text: 'Write a Python function to scrape product prices from a website',
  },
]

export default function WelcomeScreen({ onSuggestion }: WelcomeScreenProps) {
  return (
    <div className="flex flex-col items-center justify-center h-full px-4 py-8">
      <div className="max-w-2xl w-full">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex w-16 h-16 rounded-2xl bg-gradient-to-br from-harz-accent to-pink-500 items-center justify-center mb-4">
            <span className="text-3xl font-bold text-white">H</span>
          </div>
          <h1 className="text-2xl font-bold gradient-text mb-2">
            Harz AI
          </h1>
          <p className="text-harz-text-dim text-sm">
            Your fine-tuned AI assistant for business, customer service,
            <br />
            Hausa/English translations, and coding
          </p>
        </div>

        {/* Suggestion cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {suggestions.map((s, i) => (
            <button
              key={i}
              onClick={() => onSuggestion(s.text)}
              className="text-left p-4 rounded-xl bg-harz-dark border border-harz-border hover:border-harz-accent/40 hover:bg-harz-accent/5 transition-all group"
            >
              <div className="text-2xl mb-2">{s.icon}</div>
              <div className="font-medium text-sm mb-1 group-hover:text-harz-accent-light transition-colors">
                {s.title}
              </div>
              <div className="text-xs text-harz-text-dim line-clamp-2">
                {s.text}
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
