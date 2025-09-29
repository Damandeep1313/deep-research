import { createOpenAI } from '@ai-sdk/openai';
import { LanguageModelV1 } from 'ai';
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

  const customModel = process.env.CUSTOM_MODEL
    ? openai(process.env.CUSTOM_MODEL, {
        structuredOutputs: true,
      })
    : undefined;

  const gpt4MiniModel = openai('gpt-4o-mini', {
    structuredOutputs: true,
  });

  function getModel({ apiKey }: { apiKey: string }): LanguageModelV1 {
    // always build provider with request-scoped API key
    const requestScopedOpenAI = createOpenAI({
      apiKey,
      baseURL: process.env.OPENAI_ENDPOINT || 'https://api.openai.com/v1',
    });

    if (customModel) return customModel;
    return requestScopedOpenAI('gpt-4o-mini', {
      structuredOutputs: true,
    });
  }

  return { openai, getModel };
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
