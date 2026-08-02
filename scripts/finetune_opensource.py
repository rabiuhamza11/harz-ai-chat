#!/usr/bin/env python3
"""
Harz AI - Open-Source Model Fine-tuning with LoRA
Fine-tunes Qwen/Llama on custom training data using PEFT/LoRA

Usage:
    pip install transformers torch peft datasets accelerate bitsandbytes
    python scripts/finetune_opensource.py

Environment:
    MODEL_NAME - Base model (default: Qwen/Qwen2.5-7B-Instruct)
    OUTPUT_DIR - Where to save the LoRA adapter (default: ./harz-lora)
    EPOCHS - Number of training epochs (default: 3)
    BATCH_SIZE - Batch size (default: 4)
    LEARNING_RATE - Learning rate (default: 2e-4)
"""

import os
import json
import torch
from pathlib import Path

# Configuration
MODEL_NAME = os.getenv("MODEL_NAME", "Qwen/Qwen2.5-7B-Instruct")
OUTPUT_DIR = os.getenv("OUTPUT_DIR", "./harz-lora")
EPOCHS = int(os.getenv("EPOCHS", "3"))
BATCH_SIZE = int(os.getenv("BATCH_SIZE", "4"))
LEARNING_RATE = float(os.getenv("LEARNING_RATE", "2e-4"))
TRAINING_DATA = Path(__file__).parent.parent / "data" / "training_data.json"


def load_training_data():
    """Load training data and format for fine-tuning."""
    print(f"📁 Loading training data from {TRAINING_DATA}...")
    
    with open(TRAINING_DATA, "r", encoding="utf-8") as f:
        data = json.load(f)
    
    print(f"✅ Loaded {len(data)} training examples")
    return data


def format_for_training(data):
    """Convert training data to text format for instruction tuning."""
    formatted = []
    for item in data:
        messages = item["messages"]
        text_parts = []
        for msg in messages:
            role = msg["role"]
            content = msg["content"]
            text_parts.append(f"<|im_start|>{role}\n{content}<|im_end|>")
        text_parts.append("<|im_start|>assistant\n")
        formatted.append({"text": "\n".join(text_parts)})
    
    from datasets import Dataset
    return Dataset.from_list(formatted)


def main():
    from transformers import (
        AutoModelForCausalLM,
        AutoTokenizer,
        TrainingArguments,
        Trainer,
        DataCollatorForLanguageModeling,
    )
    from peft import (
        LoraConfig,
        get_peft_model,
        TaskType,
    )
    from datasets import Dataset
    
    print("╔══════════════════════════════════════════════╗")
    print("║   Harz AI - Open-Source Fine-tuning (LoRA)   ║")
    print("╚══════════════════════════════════════════════╝\n")
    
    # Load training data
    data = load_training_data()
    dataset = format_for_training(data)
    
    # Load tokenizer
    print(f"\n🔄 Loading tokenizer for {MODEL_NAME}...")
    tokenizer = AutoTokenizer.from_pretrained(MODEL_NAME, trust_remote_code=True)
    tokenizer.pad_token = tokenizer.eos_token
    tokenizer.padding_side = "right"
    
    # Load model with quantization for memory efficiency
    print(f"🔄 Loading model {MODEL_NAME}...")
    load_kwargs = {
        "trust_remote_code": True,
        "device_map": "auto",
    }
    
    # Use 4-bit quantization if GPU available
    if torch.cuda.is_available():
        from transformers import BitsAndBytesConfig
        load_kwargs["quantization_config"] = BitsAndBytesConfig(
            load_in_4bit=True,
            bnb_4bit_compute_dtype=torch.float16,
            bnb_4bit_quant_type="nf4",
            bnb_4bit_use_double_quant=True,
        )
        load_kwargs["torch_dtype"] = torch.float16
        print("   Using 4-bit quantization")
    
    model = AutoModelForCausalLM.from_pretrained(MODEL_NAME, **load_kwargs)
    
    # Configure LoRA
    print("🔧 Configuring LoRA adapter...")
    lora_config = LoraConfig(
        task_type=TaskType.CAUSAL_LM,
        r=16,  # LoRA rank
        lora_alpha=32,
        lora_dropout=0.1,
        target_modules=[
            "q_proj",
            "k_proj",
            "v_proj",
            "o_proj",
            "gate_proj",
            "up_proj",
            "down_proj",
        ],
    )
    
    model = get_peft_model(model, lora_config)
    model.print_trainable_parameters()
    
    # Tokenize dataset
    def tokenize_function(examples):
        tokenized = tokenizer(
            examples["text"],
            truncation=True,
            max_length=2048,
            padding="max_length",
        )
        tokenized["labels"] = tokenized["input_ids"].copy()
        return tokenized
    
    print("🔄 Tokenizing dataset...")
    tokenized_dataset = dataset.map(
        tokenize_function,
        batched=True,
        remove_columns=dataset.column_names,
    )
    
    # Training arguments
    training_args = TrainingArguments(
        output_dir=OUTPUT_DIR,
        num_train_epochs=EPOCHS,
        per_device_train_batch_size=BATCH_SIZE,
        gradient_accumulation_steps=4,
        warmup_steps=10,
        learning_rate=LEARNING_RATE,
        fp16=torch.cuda.is_available(),
        logging_steps=1,
        save_strategy="epoch",
        save_total_limit=3,
        report_to="none",
        remove_unused_columns=False,
    )
    
    # Data collator
    data_collator = DataCollatorForLanguageModeling(
        tokenizer=tokenizer,
        mlm=False,
    )
    
    # Trainer
    trainer = Trainer(
        model=model,
        args=training_args,
        train_dataset=tokenized_dataset,
        data_collator=data_collator,
    )
    
    # Start training
    print(f"\n🚀 Starting training: {EPOCHS} epochs, batch size {BATCH_SIZE}")
    print(f"   Learning rate: {LEARNING_RATE}")
    print(f"   Output: {OUTPUT_DIR}\n")
    
    trainer.train()
    
    # Save LoRA adapter
    print(f"\n💾 Saving LoRA adapter to {OUTPUT_DIR}...")
    model.save_pretrained(OUTPUT_DIR)
    tokenizer.save_pretrained(OUTPUT_DIR)
    
    print("\n✅ Fine-tuning complete!")
    print(f"   LoRA adapter saved to: {OUTPUT_DIR}")
    print(f"\n📋 To use with the server:")
    print(f"   LORA_PATH={OUTPUT_DIR} python scripts/server.py")
    print(f"   MODEL_NAME={MODEL_NAME} python scripts/server.py")


if __name__ == "__main__":
    main()
