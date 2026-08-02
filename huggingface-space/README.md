---
title: Harz AI Chat
emoji: 🤖
colorFrom: purple
colorTo: pink
sdk: docker
app_port: 7860
models:
  - Qwen/Qwen2.5-7B-Instruct
tags:
  - chat
  - qwen
  - harz
  - business-ai
---

# Harz AI Chat - Open Source Model Server

This Space hosts a fine-tuned Qwen2.5-7B-Instruct model for Harz Digital Services.

## Features
- Business consultation and strategy
- Customer service response generation
- Hausa/English translation
- Coding assistance
- Streaming chat API

## API Usage

```bash
curl -X POST https://YOUR_SPACE_URL/chat \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [{"role": "user", "content": "Hello!"}],
    "stream": false
  }'
```
