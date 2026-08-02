#!/usr/bin/env node
/**
 * OpenAI Fine-tuning Script for Harz AI
 * 
 * This script uploads training data to OpenAI and creates a fine-tuned model.
 * 
 * Usage:
 *   OPENAI_API_KEY=sk-xxx node scripts/openai_finetune.js
 */

const fs = require('fs')
const path = require('path')

const API_KEY = process.env.OPENAI_API_KEY
if (!API_KEY) {
  console.error('ERROR: OPENAI_API_KEY not set')
  process.exit(1)
}

const TRAINING_FILE = path.join(__dirname, '..', 'data', 'training_data.jsonl')
const API_BASE = 'https://api.openai.com/v1'

async function uploadTrainingFile() {
  console.log('📁 Uploading training data...')
  
  const fileContent = fs.readFileSync(
    path.join(__dirname, '..', 'data', 'training_data.json'), 
    'utf-8'
  )
  
  // Convert JSON array to JSONL format (one JSON object per line)
  const trainingData = JSON.parse(fileContent)
  const jsonlContent = trainingData
    .map(item => JSON.stringify(item))
    .join('\n')
  
  // Save JSONL file
  fs.writeFileSync(TRAINING_FILE, jsonlContent)
  console.log(`✅ Converted ${trainingData.length} examples to JSONL format`)

  // Upload to OpenAI using multipart/form-data
  const formData = new FormData()
  const blob = new Blob([jsonlContent], { type: 'application/json' })
  formData.append('file', blob, 'training_data.jsonl')
  formData.append('purpose', 'fine-tune')

  const response = await fetch(`${API_BASE}/files`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${API_KEY}`,
    },
    body: formData,
  })

  const result = await response.json()
  if (!response.ok) {
    console.error('❌ Upload failed:', result)
    process.exit(1)
  }

  console.log(`✅ File uploaded! ID: ${result.id}`)
  return result.id
}

async function waitForFileProcessing(fileId) {
  console.log('⏳ Waiting for file processing...')
  
  while (true) {
    const response = await fetch(`${API_BASE}/files/${fileId}`, {
      headers: { 'Authorization': `Bearer ${API_KEY}` },
    })
    const result = await response.json()
    
    console.log(`   Status: ${result.status}`)
    
    if (result.status === 'processed') {
      console.log('✅ File processed!')
      return
    }
    
    if (result.status === 'error') {
      console.error('❌ File processing error:', result)
      process.exit(1)
    }
    
    await new Promise(r => setTimeout(r, 5000))
  }
}

async function createFineTuneJob(fileId) {
  console.log('🚀 Creating fine-tuning job...')
  
  const response = await fetch(`${API_BASE}/fine_tuning/jobs`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      training_file: fileId,
      model: 'gpt-4o-mini-2024-07-18',
      hyperparameters: {
        n_epochs: 4,
        batch_size: 4,
        learning_rate_multiplier: 1.5,
      },
      suffix: 'harz-ai',
    }),
  })

  const result = await response.json()
  if (!response.ok) {
    console.error('❌ Fine-tune job creation failed:', result)
    process.exit(1)
  }

  console.log(`✅ Fine-tuning job created! ID: ${result.id}`)
  console.log(`   Model suffix: harz-ai`)
  console.log(`   Status: ${result.status}`)
  return result.id
}

async function monitorFineTuneJob(jobId) {
  console.log('\n📊 Monitoring fine-tuning progress...\n')
  
  while (true) {
    const response = await fetch(`${API_BASE}/fine_tuning/jobs/${jobId}`, {
      headers: { 'Authorization': `Bearer ${API_KEY}` },
    })
    const result = await response.json()
    
    const status = result.status
    const trainedTokens = result.trained_tokens || 0
    const epoch = result.hyperparameters?.n_epochs || '?'
    
    console.log(`Status: ${status} | Trained tokens: ${trainedTokens}`)
    
    if (status === 'succeeded') {
      console.log(`\n✅ Fine-tuning complete!`)
      console.log(`   Model ID: ${result.fine_tuned_model}`)
      console.log(`\n📋 Add this to your .env file:`)
      console.log(`   OPENAI_FINE_TUNED_MODEL=${result.fine_tuned_model}`)
      break
    }
    
    if (status === 'failed' || status === 'cancelled') {
      console.error(`\n❌ Fine-tuning ${status}:`, result.error)
      process.exit(1)
    }
    
    await new Promise(r => setTimeout(r, 15000))
  }
}

async function main() {
  console.log('╔══════════════════════════════════════╗')
  console.log('║   Harz AI - OpenAI Fine-tuning      ║')
  console.log('╚══════════════════════════════════════╝\n')
  
  try {
    // Step 1: Upload training data
    const fileId = await uploadTrainingFile()
    
    // Step 2: Wait for processing
    await waitForFileProcessing(fileId)
    
    // Step 3: Create fine-tuning job
    const jobId = await createFineTuneJob(fileId)
    
    // Step 4: Monitor progress
    await monitorFineTuneJob(jobId)
    
    console.log('\n🎉 Fine-tuning complete! Update your .env file with the model ID.')
  } catch (error) {
    console.error('Error:', error)
    process.exit(1)
  }
}

main()
