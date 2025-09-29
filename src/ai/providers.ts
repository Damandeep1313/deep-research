import { createOpenAI } from '@ai-sdk/openai';
import { extractReasoningMiddleware, LanguageModelV1, wrapLanguageModel } from 'ai';
import { createFireworks } from '@ai-sdk/fireworks';
import { getEncoding } from 'js-tiktoken';
import { RecursiveCharacterTextSplitter } from './text-splitter';

export type ApiKeys = {
  openai: string;
  firecrawl: string;
};

// getModel strictly per request
export function getModel({ apiKey }: { apiKey: string }): LanguageModelV1 {
  if (!apiKey) throw new Error('OpenAI API key must be provided via headers');

  const openai = createOpenAI({
    apiKey,
    baseURL: process.env.OPENAI_ENDPOINT || 'https://api.openai.com/v1',
  });

  return openai('gpt-4o-mini', {
    structuredOutputs: true,
  });
}

// trimPrompt unchanged
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
  if (chunkSize < MinChunkSize) return prompt.slice(0, MinChunkSize);

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
