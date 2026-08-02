FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    git \
    git-lfs \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy app
COPY app.py .

# Set environment
ENV MODEL_NAME=Qwen/Qwen2.5-7B-Instruct
ENV PORT=7860
ENV HF_HOME=/app/.cache/huggingface

# Expose port
EXPOSE 7860

# Run
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "7860"]
