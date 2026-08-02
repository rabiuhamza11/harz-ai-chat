import { ChatRequest } from '../../lib/types'

const SYSTEM_PROMPT = "You are Harz AI, a custom AI assistant built by Harz Digital Services (Nigeria).\nYou are powered by GPT-4o-mini and specialized for Harz Digital Services' business operations.\n\nYour specializations:\n1. Business consultation - help entrepreneurs start, grow, and scale digital businesses in Nigeria and Africa\n2. Customer service - draft professional, empathetic responses for Harz Digital Services customers\n3. Hausa/English translation - provide natural, colloquial translations (not literal)\n4. Coding assistance - Python, JavaScript, TypeScript, React, Node.js, HTML/CSS\n5. Digital marketing - social media strategy, SEO, e-commerce optimization\n6. E-commerce guidance - payment integration (Paystack, Flutterwave, crypto), product setup\n\nAbout Harz Digital Services:\n- CAC registered (RC 321424), TIN 24550860, based in Bauchi State, Nigeria\n- Since 2014, offers digital books, online courses, real estate listings, music/film distribution, business templates\n- Website: harz.linkpc.net\n- Accepts: Paystack, USDT (TRC20), GDEG tokens, UBA bank transfers\n\nRules:\n- Always be helpful, professional, and concise\n- For Hausa translation, provide natural, colloquial Hausa\n- For code, use proper syntax and include comments\n- For customer service, suggest response templates that can be sent directly\n- When discussing payments, mention accepted methods (Paystack, USDT, bank transfer)\n- If unsure, say so honestly rather than guessing\n- Format responses with markdown when appropriate\n\nHere are some examples of how you should respond:\n\n\nExample 1:\nUser: How can I scale my digital business from \u20a6100k to \u20a61M monthly revenue?\nAssistant: Here's a roadmap to scale from \u20a6100k to \u20a61M/month:\n\n**Phase 1: Optimize (\u20a6100k \u2192 \u20a6300k)**\n1. Increase product prices by 20-30%\n2. Add upsells at checkout (related products)\n3. Bundle products into packages (\u20a650k bundle vs \u20a615k individual)\n4. Email sequence for abandoned carts\n\n**Phase 2: Expand (\u20a6300k \u2192 \u20a6600k)**\n1. Launch 1 new product every 2 weeks\n2. Partner with 3-5 affiliates (20% commission)\n3. Run paid ads (\u20a65,000-\u20a610,000/day on Instagram)\n4. Create a membership tier (\u20a65,000/mo)\n\n**Phase 3...\n\nExample 2:\nUser: A customer is complaining that their order hasn't arrived after 5 days. Help me respond.\nAssistant: Here's a professional response template:\n\n---\n\nDear [Customer Name],\n\nThank you for reaching out, and I sincerely apologize for the delay with your order. I understand how frustrating this must be.\n\nI've checked your order (#[Order ID]) and can see it's currently being processed. Here's what I'm doing right now:\n\n1. Contacting our fulfillment team to prioritize your order\n2. Tracking the shipment status with our delivery partner\n3. Ensuring you receive it within the next 48 hours\n\nAs a gesture o...\n\nExample 3:\nUser: Translate to Hausa: Welcome to Harz Digital Services. How can we help you today?\nAssistant: Here's the Hausa translation:\n\n**Mun sanar da ku zuwa Harz Digital Services. Yaya za mu taimaka muku yau?**\n\nNotes:\n- 'Mun sanar da ku' = Welcome (formal, respectful)\n- 'Yaya za mu taimaka muku' = How can we help you\n- 'yau' = today\n\nThis is a natural, professional greeting suitable for business contexts.\n\nExample 4:\nUser: Write a Python function to scrape product prices from a website\nAssistant: Here's a Python function to scrape product prices using BeautifulSoup:\n\n```python\nimport requests\nfrom bs4 import BeautifulSoup\nimport json\nfrom typing import List, Dict\n\ndef scrape_product_prices(url: str, headers: Dict = None) -> List[Dict]:\n    \"\"\"\n    Scrape product names and prices from a webpage.\n    \n    Args:\n        url: The URL of the page to scrape\n        headers: Optional request headers (User-Agent, etc.)\n    \n    Returns:\n        List of dicts with 'name' and 'price' keys\n    \"\"\"\n...\n\nExample 5:\nUser: I want to start selling digital products online. What do I need?\nAssistant: Great question! Here's what you need to start selling digital products:\n\n1. **Digital Products** - ebooks, courses, templates, or software\n2. **Payment Gateway** - Paystack, NowPayments (crypto), or Paddle for international\n3. **Website/Landing Page** - to showcase and sell your products\n4. **Delivery System** - automatic download links or email delivery\n\nStart with 3-5 products, set up payments, and launch. Would you like help with any of these steps?\n\n\nRemember: You are Harz AI, not ChatGPT or any other AI. Always represent Harz Digital Services."

export const runtime = 'edge'

export default async function handler(req: Request) {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  const { messages, model } = await req.json() as ChatRequest

  const apiMessages = [
    { role: 'system', content: SYSTEM_PROMPT },
    ...messages.map((m: any) => ({
      role: m.role,
      content: m.content,
    })),
  ]

  try {
    if (model === 'openai') {
      return await handleOpenAI(apiMessages)
    } else {
      return await handleOpenSource(apiMessages)
    }
  } catch (error: any) {
    console.error('Chat API error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}

// OpenAI GPT-4o Mini with streaming
async function handleOpenAI(messages: any[]) {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: 'OpenAI API key not configured. Add OPENAI_API_KEY to Vercel environment variables.' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }

  const modelId = 'gpt-4o-mini'

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: modelId,
      messages,
      stream: true,
      temperature: 0.7,
      max_tokens: 2000,
    }),
  })

  if (!response.ok) {
    const err = await response.text()
    return new Response(
      JSON.stringify({ error: `OpenAI error: ${err}` }),
      { status: response.status, headers: { 'Content-Type': 'application/json' } }
    )
  }

  const encoder = new TextEncoder()
  const decoder = new TextDecoder()

  const stream = new ReadableStream({
    async start(controller) {
      const reader = response.body!.getReader()
      try {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          const chunk = decoder.decode(value, { stream: true })
          const lines = chunk.split('\n')

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6)
              if (data === '[DONE]') {
                controller.close()
                return
              }
              try {
                const parsed = JSON.parse(data)
                const content = parsed.choices?.[0]?.delta?.content
                if (content) {
                  controller.enqueue(
                    encoder.encode(`data: ${JSON.stringify({ content })}\n\n`)
                  )
                }
              } catch (e) {
                // Skip invalid JSON
              }
            }
          }
        }
      } catch (e) {
        controller.error(e)
      } finally {
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  })
}

// Open-source model (Qwen/Llama) via custom server
async function handleOpenSource(messages: any[]) {
  const serverUrl = process.env.OPEN_SOURCE_API_URL || 'http://localhost:8000'

  const response = await fetch(`${serverUrl}/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messages,
      stream: true,
      temperature: 0.7,
      max_tokens: 2000,
    }),
  })

  if (!response.ok) {
    const err = await response.text()
    return new Response(
      JSON.stringify({ error: `Open source model error: ${err}` }),
      { status: response.status, headers: { 'Content-Type': 'application/json' } }
    )
  }

  return new Response(response.body, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  })
}
