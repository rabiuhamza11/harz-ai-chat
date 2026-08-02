"""
Harz AI Chat - Hugging Face Space App
Hosts Qwen2.5-7B-Instruct with optional LoRA adapter
Provides streaming chat API compatible with the Harz AI frontend
"""

import os
import json
import asyncio
from typing import List, Dict, Optional
from fastapi import FastAPI, Request
from fastapi.responses import StreamingResponse, JSONResponse
from pydantic import BaseModel

app = FastAPI(title="Harz AI Chat", version="1.0")

# Configuration
MODEL_NAME = os.getenv("MODEL_NAME", "Qwen/Qwen2.5-7B-Instruct")
LORA_PATH = os.getenv("LORA_PATH", None)  # Path to LoRA adapter if available
HF_TOKEN = os.getenv("HF_TOKEN", "")

# System prompt - same as frontend
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

# Global model and tokenizer
model = None
tokenizer = None


def load_model():
    """Load the model and tokenizer."""
    global model, tokenizer
    
    import torch
    from transformers import AutoModelForCausalLM, AutoTokenizer
    
    print(f"Loading model: {MODEL_NAME}...")
    
    tokenizer = AutoTokenizer.from_pretrained(
        MODEL_NAME,
        trust_remote_code=True,
        token=HF_TOKEN if HF_TOKEN else None,
    )
    
    # Load in float16 for GPU efficiency
    model = AutoModelForCausalLM.from_pretrained(
        MODEL_NAME,
        trust_remote_code=True,
        torch_dtype=torch.float16,
        device_map="auto",
        token=HF_TOKEN if HF_TOKEN else None,
    )
    
    # Apply LoRA adapter if available
    if LORA_PATH and os.path.exists(LORA_PATH):
        from peft import PeftModel
        print(f"Loading LoRA adapter from {LORA_PATH}...")
        model = PeftModel.from_pretrained(model, LORA_PATH)
        print("✅ LoRA adapter loaded!")
    
    print("✅ Model loaded successfully!")


class ChatRequest(BaseModel):
    messages: List[Dict[str, str]]
    stream: bool = True
    temperature: float = 0.7
    max_tokens: int = 2000


@app.on_event("startup")
async def startup_event():
    """Load model on startup."""
    load_model()


@app.post("/chat")
async def chat(request: ChatRequest):
    """Chat endpoint with streaming support."""
    if model is None:
        return JSONResponse(
            {"error": "Model is still loading. Please wait..."},
            status_code=503,
        )
    
    # Prepare messages with system prompt
    messages = [{"role": "system", "content": SYSTEM_PROMPT}]
    messages.extend(request.messages)
    
    if request.stream:
        return StreamingResponse(
            generate_stream(messages, request.temperature, request.max_tokens),
            media_type="text/event-stream",
        )
    else:
        response_text = generate_response(messages, request.temperature, request.max_tokens)
        return JSONResponse({"content": response_text})


async def generate_stream(messages, temperature, max_tokens):
    """Generate streaming response using text generation."""
    import torch
    
    # Format prompt using chat template
    text = tokenizer.apply_chat_template(
        messages,
        tokenize=False,
        add_generation_prompt=True,
    )
    
    inputs = tokenizer(text, return_tensors="pt").to(model.device)
    
    # Generate with streaming
    streamer = TextIteratorStreamer(
        tokenizer,
        skip_prompt=True,
        skip_special_tokens=True,
    )
    
    generation_kwargs = dict(
        **inputs,
        max_new_tokens=max_tokens,
        temperature=temperature,
        do_sample=temperature > 0,
        streamer=streamer,
        pad_token_id=tokenizer.eos_token_id,
    )
    
    # Run generation in a separate thread
    from threading import Thread
    thread = Thread(target=model.generate, kwargs=generation_kwargs)
    thread.start()
    
    for text_chunk in streamer:
        if text_chunk:
            chunk = json.dumps({"content": text_chunk})
            yield f"data: {chunk}\n\n"
        await asyncio.sleep(0.001)
    
    thread.join()
    yield "data: [DONE]\n\n"


def generate_response(messages, temperature, max_tokens):
    """Generate non-streaming response."""
    import torch
    
    text = tokenizer.apply_chat_template(
        messages,
        tokenize=False,
        add_generation_prompt=True,
    )
    
    inputs = tokenizer(text, return_tensors="pt").to(model.device)
    
    with torch.no_grad():
        outputs = model.generate(
            **inputs,
            max_new_tokens=max_tokens,
            temperature=temperature,
            do_sample=temperature > 0,
            pad_token_id=tokenizer.eos_token_id,
        )
    
    # Decode only new tokens
    response = tokenizer.decode(
        outputs[0][inputs["input_ids"].shape[1]:],
        skip_special_tokens=True,
    )
    return response


@app.get("/health")
async def health():
    return {
        "status": "ok" if model is not None else "loading",
        "model": MODEL_NAME,
        "lora": LORA_PATH or "none",
        "model_loaded": model is not None,
    }


@app.get("/")
async def root():
    return {
        "name": "Harz AI Chat",
        "model": MODEL_NAME,
        "lora": LORA_PATH or "none",
        "model_loaded": model is not None,
        "endpoints": {
            "chat": "POST /chat",
            "health": "GET /health",
        },
    }


# Import TextIteratorStreamer (needed for streaming)
try:
    from transformers import TextIteratorStreamer
except ImportError:
    # Create a simple fallback
    class TextIteratorStreamer:
        def __init__(self, tokenizer, **kwargs):
            self.tokenizer = tokenizer
        def __iter__(self):
            return iter([])
