import cors from 'cors';
import express, { Request, Response } from 'express';

// FIX: Removed the explicit '.ts' file extension to avoid ts(5097) error.
import { deepResearch, writeFinalAnswer, writeFinalReport } from './deep-research'; 

const app = express();
const port = process.env.PORT || 3051;

// Define the required keys in the request body
type ApiKeys = {
    openai: string;
    firecrawl: string;
};

// Middleware
app.use(cors());
app.use(express.json());

// Helper function for consistent logging
function log(...args: any[]) {
  console.log(...args);
}

/**
 * Extracts and validates required API keys from request headers.
 * @param req The Express Request object.
 * @returns The extracted keys object or throws an error.
 */
function getApiKeys(req: Request): ApiKeys {
    // Keys are expected in custom headers
    const openaiKey = req.header('X-OpenAI-Key');
    const firecrawlKey = req.header('X-Firecrawl-Key');

    if (!openaiKey) {
        throw new Error('Missing X-OpenAI-Key header.');
    }
    if (!firecrawlKey) {
        throw new Error('Missing X-Firecrawl-Key header.');
    }

    return { openai: openaiKey, firecrawl: firecrawlKey };
}


/**
 * Helper to construct a full prompt based on user query and non-interactive clarification.
 * This should eliminate the need for the interactive agent to ask follow-up questions.
 * @param query The main research query.
 * @param clarification Optional detailed clarification instructions.
 * @returns A consolidated, detailed prompt string.
 */
function createConsolidatedPrompt(query: string, clarification?: string): string {
    if (clarification && clarification.trim() !== '') {
        return `PRIMARY RESEARCH GOAL: "${query}". 

DETAILED INSTRUCTIONS AND CONSTRAINTS (USE THIS FOR RESEARCH PLAN): ${clarification}.

PROCEED NON-INTERACTIVELY. DO NOT ASK FOLLOW-UP QUESTIONS. GENERATE THE RESEARCH PLAN BASED SOLELY ON THE GOAL AND INSTRUCTIONS PROVIDED.`;
    }
    // Fallback: If no clarification is provided, give the LLM an instruction to proceed without interaction
    return `RESEARCH GOAL: "${query}". PROCEED NON-INTERACTIVELY. DO NOT ASK FOLLOW-UP QUESTIONS.`;
}

// API endpoint to run research (specific answer)
app.post('/api/research', async (req: Request, res: Response) => {
  let apiKeys: ApiKeys;
  try {
    // 1. Extract and validate API keys from headers
    apiKeys = getApiKeys(req); 

    // 2. Extract research parameters
    const { query, depth = 3, breadth = 3, clarification } = req.body;

    if (!query) {
      return res.status(400).json({ error: 'Query is required' });
    }

    // Use the consolidated prompt that includes the clarification instructions
    const prompt = createConsolidatedPrompt(query, clarification);

    log('\nStarting research for specific answer (non-interactive via API)...\n');

    // 3. Pass keys to deepResearch (requires deep-research.ts update)
    const { learnings, visitedUrls } = await deepResearch({
      query: prompt, 
      breadth,
      depth,
      apiKeys: apiKeys, 
    } as any); // TEMPORARY FIX: Assert as any to bypass TS error

    log(`\n\nLearnings:\n\n${learnings.join('\n')}`);
    log(
      `\n\nVisited URLs (${visitedUrls.length}):\n\n${visitedUrls.join('\n')}`,
    );

    const answer = await writeFinalAnswer({
      prompt: query, 
      learnings,
      apiKeys: apiKeys, 
    } as any); // TEMPORARY FIX: Assert as any to bypass TS error

    // Return the results
    return res.json({
      success: true,
      answer,
      learnings,
      visitedUrls,
    });
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

// generate report API (long report)
app.post('/api/generate-report',async(req: Request, res: Response) => {
  let apiKeys: ApiKeys;
  try{
    // 1. Extract and validate API keys from headers
    apiKeys = getApiKeys(req);

    // 2. Extract research parameters
    const {query,depth = 2,breadth=2, clarification } = req.body;
    
    if(!query){
      return res.status(400).json({ error: 'Query is required' });
    }

    // Use the consolidated prompt that includes the clarification instructions
    const prompt = createConsolidatedPrompt(query, clarification);

    log('\n Starting research for detailed report (non-interactive via API)...\n')
    
    // 3. Pass keys to deepResearch (requires deep-research.ts update)
    const {learnings,visitedUrls} = await deepResearch({
      query: prompt, 
      breadth,
      depth,
      apiKeys: apiKeys, 
    } as any); // TEMPORARY FIX: Assert as any to bypass TS error

    log(`\n\nLearnings:\n\n${learnings.join('\n')}`);
    log(
      `\n\nVisited URLs (${visitedUrls.length}):\n\n${visitedUrls.join('\n')}`,
    );

    const report = await writeFinalReport({
      prompt:query,
      learnings,
      visitedUrls,
      apiKeys: apiKeys, 
    } as any); // TEMPORARY FIX: Assert as any to bypass TS error

    // Return the report and sources wrapped in a success JSON object.
    return res.json({
        success: true,
        report: report, 
        visitedUrls: visitedUrls,
    });
    
  }catch(error:unknown){
    if (error instanceof Error && error.message.includes('Missing')) {
        return res.status(401).json({ error: error.message });
    }
    console.error("Error in generate report API:",error)
    return res.status(500).json({
      error:'An error occurred during research',
      message: error instanceof Error ? error.message : String(error),
    })
  }
});


// Start the server
app.listen(port, () => {
  console.log(`Deep Research API running on port ${port}`);
});

export default app;
