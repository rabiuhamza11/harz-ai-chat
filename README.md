# Harz AI - Custom Fine-tuned Chat Application

A Claude/Qwen-style chat web app with fine-tuned AI models for business, customer service, Hausa/English translation, and coding.

## Features
- Chat interface (Claude.ai style) with dark mode
- Support for both OpenAI and open-source models
- Streaming responses
- Conversation history (saved in browser)
- Code syntax highlighting
- Model selector (GPT-4o Mini / Qwen/Llama)
- Fine-tuned for Harz Digital Services use cases

## Quick Start

### 1. Install Dependencies
```bash
cd harz-ai-chat
npm install
```

### 2. Configure Environment
```bash
cp .env.example .env
# Add your OpenAI API key
```

### 3. Run Frontend
```bash
npm run dev
# Visit http://localhost:3000
```

### 4. Fine-tune OpenAI Model
```bash
OPENAI_API_KEY=sk-xxx node scripts/openai_finetune.js
# After completion, add the model ID to .env
```

### 5. Fine-tune Open-Source Model (requires GPU)
```bash
pip install transformers torch peft datasets accelerate bitsandbytes
python scripts/finetune_opensource.py
```

### 6. Run Open-Source Model Server
```bash
pip install fastapi uvicorn transformers torch peft
MODEL_NAME=Qwen/Qwen2.5-7B-Instruct LORA_PATH=./harz-lora python scripts/server.py
```

## Architecture
- Frontend: Next.js 14 + TailwindCSS (Vercel)
- OpenAI API: Direct API calls with streaming
- Open-Source: Python FastAPI server (VPS)
- Fine-tuning: OpenAI API + LoRA/PEFT for open-source

## Deployment
- Frontend: Deploy to Vercel
- Open-source server: Deploy to VPS (needs GPU for inference)
