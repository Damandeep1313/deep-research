import cors from 'cors';
import express, { Request, Response } from 'express';

import { deepResearch, writeFinalAnswer, writeFinalReport, ApiKeys, ResearchProgress } from './deep-research';

const app = express();
const port = process.env.PORT || 3051;

// Middleware
app.use(cors());
app.use(express.json());

// Logging helper
function log(...args: any[]) {
  console.log(...args);
}

// ----------------------------------------------------
// Extract API keys from headers
// ----------------------------------------------------
function getApiKeys(req: Request): ApiKeys {
  const openai = req.header('X-OpenAI-Key');
  const firecrawl = req.header('X-Firecrawl-Key');

  if (!openai) throw new Error('Missing X-OpenAI-Key header.');
  if (!firecrawl) throw new Error('Missing X-Firecrawl-Key header.');

  return { openai, firecrawl };
}

// ----------------------------------------------------
// Consolidate query + optional clarification into prompt
// ----------------------------------------------------
function createConsolidatedPrompt(query: string, clarification?: string): string {
  if (clarification?.trim()) {
    return `PRIMARY RESEARCH GOAL: "${query}".

DETAILED INSTRUCTIONS AND CONSTRAINTS (USE THIS FOR RESEARCH PLAN): ${clarification}.

PROCEED NON-INTERACTIVELY. DO NOT ASK FOLLOW-UP QUESTIONS.`;
  }
  return `RESEARCH GOAL: "${query}". PROCEED NON-INTERACTIVELY. DO NOT ASK FOLLOW-UP QUESTIONS.`;
}

// ----------------------------------------------------
// API: research for concise answer
// ----------------------------------------------------
app.post('/api/research', async (req: Request, res: Response) => {
  try {
    const apiKeys = getApiKeys(req);
    const { query, depth = 3, breadth = 3, clarification } = req.body;

    if (!query) return res.status(400).json({ error: 'Query is required' });

    const prompt = createConsolidatedPrompt(query, clarification);
    log('\nStarting research for specific answer...\n');

    const { learnings, visitedUrls } = await deepResearch({
      query: prompt,
      breadth,
      depth,
      apiKeys,
    });

    log(`\nLearnings:\n${learnings.join('\n')}`);
    log(`\nVisited URLs (${visitedUrls.length}):\n${visitedUrls.join('\n')}`);

    const answer = await writeFinalAnswer({
      prompt: query,
      learnings,
      apiKeys,
    });

    return res.json({ success: true, answer, learnings, visitedUrls });
  } catch (error: unknown) {
    if (error instanceof Error && error.message.includes('Missing')) {
      return res.status(401).json({ error: error.message });
    }
    console.error('Error in research API:', error);
    return res.status(500).json({
      error: 'An error occurred during research',
      message: error instanceof Error ? error.message : String(error),
    });
  }
});

// ----------------------------------------------------
// API: generate detailed report
// ----------------------------------------------------
app.post('/api/generate-report', async (req: Request, res: Response) => {
  try {
    const apiKeys = getApiKeys(req);
    const { query, depth = 2, breadth = 2, clarification } = req.body;

    if (!query) return res.status(400).json({ error: 'Query is required' });

    const prompt = createConsolidatedPrompt(query, clarification);
    log('\nStarting research for detailed report...\n');

    const { learnings, visitedUrls } = await deepResearch({
      query: prompt,
      breadth,
      depth,
      apiKeys,
    });

    log(`\nLearnings:\n${learnings.join('\n')}`);
    log(`\nVisited URLs (${visitedUrls.length}):\n${visitedUrls.join('\n')}`);

    const report = await writeFinalReport({
      prompt: query,
      learnings,
      visitedUrls,
      apiKeys,
    });

    return res.json({ success: true, report, visitedUrls });
  } catch (error: unknown) {
    if (error instanceof Error && error.message.includes('Missing')) {
      return res.status(401).json({ error: error.message });
    }
    console.error('Error in generate report API:', error);
    return res.status(500).json({
      error: 'An error occurred during research',
      message: error instanceof Error ? error.message : String(error),
    });
  }
});

// ----------------------------------------------------
// Start server
// ----------------------------------------------------
app.listen(port, () => {
  console.log(`Deep Research API running on port ${port}`);
});

export default app;
