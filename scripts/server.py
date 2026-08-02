#!/usr/bin/env python3
"""
Harz AI - Open-Source Model Server
Serves fine-tuned Qwen/Llama model via API
Supports streaming responses compatible with the chat frontend

Usage:
    pip install fastapi uvicorn transformers torch peft
    python scripts/server.py

Environment:
    MODEL_NAME - Base model name (default: Qwen/Qwen2.5-7B-Instruct)
    LORA_PATH - Path to LoRA adapter (optional)
    PORT - Server port (default: 8000)
"""

import json
import os
import asyncio
from typing import List, Dict, Optional
from fastapi import FastAPI, Request
from fastapi.responses import StreamingResponse, JSONResponse
from pydantic import BaseModel

app = FastAPI(title="Harz AI Server", version="1.0")

# Configuration
MODEL_NAME = os.getenv("MODEL_NAME", "Qwen/Qwen2.5-7B-Instruct")
LORA_PATH = os.getenv("LORA_PATH", None)
PORT = int(os.getenv("PORT", "8000"))
DEVICE = "cuda" if os.getenv("CUDA_AVAILABLE", "0") == "1" else "cpu"

# System prompt (same as frontend)
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

# Model and tokenizer (loaded on startup)
model = None
tokenizer = None


def load_model():
    """Load the base model and optionally apply LoRA adapter."""
    global model, tokenizer
    
    from transformers import AutoModelForCausalLM, AutoTokenizer
    
    print(f"Loading model: {MODEL_NAME} on {DEVICE}...")
    
    tokenizer = AutoTokenizer.from_pretrained(
        MODEL_NAME,
        trust_remote_code=True,
    )
    
    load_kwargs = {
        "trust_remote_code": True,
        "device_map": "auto" if DEVICE == "cuda" else None,
    }
    
    if DEVICE == "cuda":
        import torch
        load_kwargs["torch_dtype"] = torch.float16
    
    model = AutoModelForCausalLM.from_pretrained(MODEL_NAME, **load_kwargs)
    
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


@app.post("/chat")
async def chat(request: ChatRequest):
    """Chat endpoint with streaming support."""
    if model is None:
        return JSONResponse(
            {"error": "Model not loaded yet. Please wait..."},
            status_code=503,
        )
    
    # Prepare messages
    messages = [{"role": "system", "content": SYSTEM_PROMPT}]
    messages.extend(request.messages)
    
    # Format for the model
    formatted_prompt = format_prompt(messages)
    
    if request.stream:
        return StreamingResponse(
            generate_stream(formatted_prompt, request.temperature, request.max_tokens),
            media_type="text/event-stream",
        )
    else:
        # Non-streaming response
        response = generate_response(formatted_prompt, request.temperature, request.max_tokens)
        return JSONResponse({"content": response})


def format_prompt(messages: List[Dict[str, str]]) -> str:
    """Format messages for Qwen/Llama chat template."""
    prompt_parts = []
    for msg in messages:
        role = msg["role"]
        content = msg["content"]
        if role == "system":
            prompt_parts.append(f"<|im_start|>system\n{content}<|im_end|>")
        elif role == "user":
            prompt_parts.append(f"<|im_start|>user\n{content}<|im_end|>")
        elif role == "assistant":
            prompt_parts.append(f"<|im_start|>assistant\n{content}<|im_end|>")
    
    prompt_parts.append("<|im_start|>assistant\n")
    return "\n".join(prompt_parts)


async def generate_stream(prompt: str, temperature: float, max_tokens: int):
    """Generate streaming response."""
    import torch
    
    inputs = tokenizer(prompt, return_tensors="pt")
    if DEVICE == "cuda":
        inputs = {k: v.cuda() for k, v in inputs.items()}
    
    # Generate with streaming
    generated = ""
    past_key_values = None
    
    for _ in range(max_tokens):
        with torch.no_grad():
            outputs = model(
                **inputs,
                past_key_values=past_key_values,
                use_cache=True,
            )
        
        next_token = outputs.logits[:, -1, :].argmax(dim=-1)
        
        # Decode token
        token_text = tokenizer.decode(next_token[0], skip_special_tokens=True)
        generated += token_text
        
        # Check for end of response
        if next_token[0].item() == tokenizer.eos_token_id:
            break
        
        # Stream the token
        if token_text:
            chunk = json.dumps({"content": token_text})
            yield f"data: {chunk}\n\n"
        
        # Update inputs for next token
        inputs = {"input_ids": next_token.unsqueeze(0)}
        past_key_values = outputs.past_key_values
        
        # Yield control to event loop
        await asyncio.sleep(0.01)
    
    yield "data: [DONE]\n\n"


def generate_response(prompt: str, temperature: float, max_tokens: int) -> str:
    """Generate non-streaming response."""
    import torch
    
    inputs = tokenizer(prompt, return_tensors="pt")
    if DEVICE == "cuda":
        inputs = {k: v.cuda() for k, v in inputs.items()}
    
    with torch.no_grad():
        outputs = model.generate(
            **inputs,
            max_new_tokens=max_tokens,
            temperature=temperature,
            do_sample=temperature > 0,
            pad_token_id=tokenizer.eos_token_id,
        )
    
    # Decode only the new tokens
    response = tokenizer.decode(
        outputs[0][inputs["input_ids"].shape[1]:],
        skip_special_tokens=True,
    )
    return response


@app.get("/health")
async def health():
    return {"status": "ok", "model_loaded": model is not None, "device": DEVICE}


@app.get("/")
async def root():
    return {
        "name": "Harz AI Server",
        "model": MODEL_NAME,
        "lora": LORA_PATH or "none",
        "device": DEVICE,
        "model_loaded": model is not None,
    }


if __name__ == "__main__":
    import uvicorn
    load_model()
    print(f"\n🚀 Server starting on port {PORT}...")
    uvicorn.run(app, host="0.0.0.0", port=PORT)
