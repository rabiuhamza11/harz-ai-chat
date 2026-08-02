#!/bin/bash
# Hetzner VPS Setup Script for Harz AI Open Source Model Server
# 
# This script sets up a Hetzner Cloud VPS with:
# - Docker
# - NVIDIA GPU drivers (for GPU servers)
# - Harz AI model server (Qwen2.5 with LoRA)
# - Nginx reverse proxy with SSL
# 
# Usage:
#   ssh root@your-server-ip 'bash -s' < scripts/hetzner_setup.sh
#
# Hetzner GPU servers: https://www.hetzner.com/dedicated-root-server/gpu
# Recommended: CCX13 (€13.49/mo) for CPU-only, or dedicated GPU server for inference

set -e

echo "╔════════════════════════════════════════════════════╗"
echo "║   Harz AI - Hetzner VPS Setup                      ║"
echo "╚════════════════════════════════════════════════════╝"
echo ""

# Update system
echo "📦 Updating system..."
apt-get update -y
apt-get upgrade -y

# Install Docker
echo "🐳 Installing Docker..."
if ! command -v docker &> /dev/null; then
    curl -fsSL https://get.docker.com -o get-docker.sh
    sh get-docker.sh
    systemctl enable docker
    systemctl start docker
    echo "✅ Docker installed"
else
    echo "✅ Docker already installed"
fi

# Install Docker Compose
echo "📦 Installing Docker Compose..."
if ! command -v docker-compose &> /dev/null; then
    COMPOSE_VERSION=$(curl -s https://api.github.com/repos/docker/compose/releases/latest | grep tag_name | cut -d '"' -f 4)
    curl -L "https://github.com/docker/compose/releases/download/${COMPOSE_VERSION}/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    chmod +x /usr/local/bin/docker-compose
    echo "✅ Docker Compose installed"
else
    echo "✅ Docker Compose already installed"
fi

# Install Nginx
echo "🌐 Installing Nginx..."
apt-get install -y nginx
systemctl enable nginx
systemctl start nginx

# Install Certbot for SSL
echo "🔒 Installing Certbot..."
apt-get install -y certbot python3-certbot-nginx

# Create app directory
mkdir -p /opt/harz-ai
cd /opt/harz-ai

# Create docker-compose.yml
cat > docker-compose.yml << 'EOF'
version: '3.8'

services:
  harz-ai-server:
    build: .
    container_name: harz-ai-server
    restart: always
    ports:
      - "8000:8000"
    environment:
      - MODEL_NAME=Qwen/Qwen2.5-7B-Instruct
      - LORA_PATH=/app/harz-lora
      - PORT=8000
      - HF_TOKEN=${HF_TOKEN}
    volumes:
      - ./harz-lora:/app/harz-lora
      - model_cache:/app/.cache/huggingface
    deploy:
      resources:
        limits:
          memory: 16G

volumes:
  model_cache:
EOF

# Create Dockerfile
cat > Dockerfile << 'EOF'
FROM python:3.11-slim

WORKDIR /app

RUN apt-get update && apt-get install -y git git-lfs && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY app.py .

ENV MODEL_NAME=Qwen/Qwen2.5-7B-Instruct
ENV PORT=8000

EXPOSE 8000
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8000"]
EOF

# Create requirements.txt
cat > requirements.txt << 'EOF'
transformers==4.44.2
torch==2.4.0
fastapi==0.115.0
uvicorn==0.30.6
peft==0.12.1
accelerate==0.34.2
pydantic==2.9.2
EOF

# Download app.py from GitHub (or copy directly)
echo "📥 Downloading app.py..."
cat > app.py << 'APPYEOF'
"""Harz AI Chat - Model Server for Hetzner VPS"""
import os, json, asyncio
from typing import List, Dict
from fastapi import FastAPI
from fastapi.responses import StreamingResponse, JSONResponse
from pydantic import BaseModel

app = FastAPI(title="Harz AI Chat", version="1.0")

MODEL_NAME = os.getenv("MODEL_NAME", "Qwen/Qwen2.5-7B-Instruct")
LORA_PATH = os.getenv("LORA_PATH", None)
HF_TOKEN = os.getenv("HF_TOKEN", "")

SYSTEM_PROMPT = """You are Harz AI, a custom AI assistant built by Harz Digital Services.
You are specialized in:
1. Business consultation and strategy
2. Customer service responses (professional, empathetic)
3. Hausa/English translation (bi-directional, natural and accurate)
4. Coding assistance (Python, JavaScript, TypeScript, React, Node.js)
5. Digital marketing and e-commerce guidance

Rules:
- Always be helpful, professional, and concise
- When asked for Hausa translation, provide natural, colloquial Hausa
- For code, always use proper syntax highlighting and include comments
- For customer service, suggest response templates
- If unsure, say so honestly rather than guessing
- Format responses with markdown when appropriate"""

model = None
tokenizer = None

@app.on_event("startup")
async def startup():
    global model, tokenizer
    import torch
    from transformers import AutoModelForCausalLM, AutoTokenizer
    print(f"Loading {MODEL_NAME}...")
    tokenizer = AutoTokenizer.from_pretrained(MODEL_NAME, trust_remote_code=True, token=HF_TOKEN or None)
    model = AutoModelForCausalLM.from_pretrained(MODEL_NAME, trust_remote_code=True, torch_dtype=torch.float16, device_map="auto", token=HF_TOKEN or None)
    if LORA_PATH and os.path.exists(LORA_PATH):
        from peft import PeftModel
        model = PeftModel.from_pretrained(model, LORA_PATH)
    print("✅ Model loaded!")

class ChatRequest(BaseModel):
    messages: List[Dict[str, str]]
    stream: bool = True
    temperature: float = 0.7
    max_tokens: int = 2000

@app.post("/chat")
async def chat(req: ChatRequest):
    if model is None:
        return JSONResponse({"error": "Model loading..."}, status_code=503)
    messages = [{"role": "system", "content": SYSTEM_PROMPT}] + req.messages
    text = tokenizer.apply_chat_template(messages, tokenize=False, add_generation_prompt=True)
    inputs = tokenizer(text, return_tensors="pt").to(model.device)
    import torch
    with torch.no_grad():
        outputs = model.generate(**inputs, max_new_tokens=req.max_tokens, temperature=req.temperature, do_sample=req.temperature > 0, pad_token_id=tokenizer.eos_token_id)
    response = tokenizer.decode(outputs[0][inputs["input_ids"].shape[1]:], skip_special_tokens=True)
    return {"content": response}

@app.get("/health")
async def health():
    return {"status": "ok" if model else "loading", "model_loaded": model is not None}

@app.get("/")
async def root():
    return {"name": "Harz AI", "model": MODEL_NAME, "model_loaded": model is not None}
APPYEOF

# Create Nginx config
echo "🌐 Setting up Nginx reverse proxy..."
cat > /etc/nginx/sites-available/harz-ai << 'NGINXEOF'
server {
    listen 80;
    server_name _;
    
    location / {
        proxy_pass http://localhost:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # WebSocket support for streaming
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        
        # Timeouts for long model inference
        proxy_connect_timeout 60s;
        proxy_send_timeout 300s;
        proxy_read_timeout 300s;
    }
}
NGINXEOF

ln -sf /etc/nginx/sites-available/harz-ai /etc/nginx/sites-enabled/harz-ai
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx

# Setup UFW firewall
echo "🔥 Setting up firewall..."
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable

echo ""
echo "╔════════════════════════════════════════════════════╗"
echo "║   ✅ Setup Complete!                              ║"
echo "╚════════════════════════════════════════════════════╝"
echo ""
echo "Next steps:"
echo "1. Set your Hugging Face token:"
echo "   export HF_TOKEN=your_token_here"
echo ""
echo "2. Start the server:"
echo "   cd /opt/harz-ai && docker-compose up -d"
echo ""
echo "3. Check status:"
echo "   docker-compose logs -f"
echo ""
echo "4. Test the API:"
echo "   curl http://localhost:8000/health"
echo ""
echo "5. Set up SSL (optional, needs domain):"
echo "   certbot --nginx -d ai-model.yourdomain.com"
echo ""
echo "Server IP: $(curl -s ifconfig.me)"
echo "API: http://$(curl -s ifconfig.me):8000"
