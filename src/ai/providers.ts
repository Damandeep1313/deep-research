import { createFireworks } from '@ai-sdk/fireworks';
import { createOpenAI } from '@ai-sdk/openai';
import {
  extractReasoningMiddleware,
  LanguageModelV1,
  wrapLanguageModel,
} from 'ai';
import { getEncoding } from 'js-tiktoken';

import { RecursiveCharacterTextSplitter } from './text-splitter';

// --- Types ---
export type ApiKeys = {
  openai: string;
  firecrawl: string;
};

// --- Provider Factory ---
export function getProviders(apiKeys: ApiKeys) {
  const openai = createOpenAI({
    apiKey: apiKeys.openai,
    baseURL: process.env.OPENAI_ENDPOINT || 'https://api.openai.com/v1',
  });

  const fireworks = createFireworks({
    apiKey: apiKeys.firecrawl,
  });

  const customModel = process.env.CUSTOM_MODEL
    ? openai(process.env.CUSTOM_MODEL, {
        structuredOutputs: true,
      })
    : undefined;

  const o3MiniModel = openai('o3-mini', {
    reasoningEffort: 'medium',
    structuredOutputs: true,
  });

  const deepSeekR1Model = wrapLanguageModel({
    model: fireworks(
      'accounts/fireworks/models/deepseek-r1',
    ) as LanguageModelV1,
    middleware: extractReasoningMiddleware({ tagName: 'think' }),
  });

  function getModel(): LanguageModelV1 {
    if (customModel) return customModel;
    const model = deepSeekR1Model ?? o3MiniModel;
    if (!model) throw new Error('No model found');
    return model as LanguageModelV1;
  }

  return { openai, fireworks, getModel };
}

// --- Prompt trimming ---
const MinChunkSize = 140;
const encoder = getEncoding('o200k_base');

export function trimPrompt(
  prompt: string,
  contextSize = Number(process.env.CONTEXT_SIZE) || 128_000,
) {
  if (!prompt) return '';

  const length = encoder.encode(prompt).length;
  if (length <= contextSize) return prompt;

  const overflowTokens = length - contextSize;
  const chunkSize = prompt.length - overflowTokens * 3;
  if (chunkSize < MinChunkSize) {
    return prompt.slice(0, MinChunkSize);
  }

  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize,
    chunkOverlap: 0,
  });
  const trimmedPrompt = splitter.splitText(prompt)[0] ?? '';

  if (trimmedPrompt.length === prompt.length) {
    return trimPrompt(prompt.slice(0, chunkSize), contextSize);
  }

  return trimPrompt(trimmedPrompt, contextSize);
}
