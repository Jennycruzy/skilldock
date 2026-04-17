import { SkillDefinition } from '@/types';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://skilldock.vercel.app';
const FACILITATOR_URL = process.env.NEXT_PUBLIC_PURCH_FACILITATOR_URL || 'https://app.purch.xyz/facilitator';
const NETWORK = process.env.NEXT_PUBLIC_SOLANA_NETWORK || 'devnet';

function mkMCP(skill: Omit<SkillDefinition, 'mcpToolDefinition'>): SkillDefinition['mcpToolDefinition'] {
  return {
    name: `skilldock_${skill.id}`,
    description: `${skill.description} Costs $${skill.price.toFixed(3)} USDC via Purch x402 on Solana.`,
    inputSchema: skill.inputSchema,
    x402: {
      endpoint: skill.endpoint,
      facilitator: FACILITATOR_URL,
      price: skill.price,
      network: `solana:${NETWORK}`,
    },
  };
}

const base: Omit<SkillDefinition, 'mcpToolDefinition'>[] = [
  {
    id: 'scrape',
    name: 'Web Scraper',
    description: 'Fetch any public URL and return structured content: title, meta description, body text, links, and word count.',
    endpoint: `${APP_URL}/api/skills/scrape`,
    method: 'POST',
    price: 0.002,
    icon: '🌐',
    tags: ['web', 'data'],
    inputSchema: {
      type: 'object',
      properties: {
        url: { type: 'string', description: 'The URL to scrape' },
      },
      required: ['url'],
    },
    outputSchema: {
      type: 'object',
      properties: {
        title: { type: 'string' },
        metaDescription: { type: 'string' },
        bodyText: { type: 'string' },
        wordCount: { type: 'number' },
        links: { type: 'array', items: { type: 'string' } },
        scrapedAt: { type: 'string' },
      },
    },
  },
  {
    id: 'summarize',
    name: 'AI Summarizer',
    description: 'Summarize any text. Choose between bullet points, paragraph, or TL;DR styles.',
    endpoint: `${APP_URL}/api/skills/summarize`,
    method: 'POST',
    price: 0.01,
    icon: '✍️',
    tags: ['web', 'data'],
    inputSchema: {
      type: 'object',
      properties: {
        text: { type: 'string', description: 'Text to summarize' },
        style: { type: 'string', enum: ['bullet', 'paragraph', 'tldr'], description: 'Summary style' },
      },
      required: ['text'],
    },
    outputSchema: {
      type: 'object',
      properties: {
        summary: { type: 'string' },
        wordCount: { type: 'number' },
        style: { type: 'string' },
        model: { type: 'string' },
      },
    },
  },
  {
    id: 'solana-price',
    name: 'Solana Price Feed',
    description: 'Real-time Solana token prices via Jupiter. Supports 20+ tokens by symbol (SOL, USDC, BONK, WIF, PURCH…) or any raw mint address.',
    endpoint: `${APP_URL}/api/skills/solana-price`,
    method: 'GET',
    price: 0.001,
    icon: '💹',
    tags: ['data', 'defi', 'solana'],
    inputSchema: {
      type: 'object',
      properties: {
        token: {
          type: 'string',
          enum: [
            'SOL', 'USDC', 'USDT', 'WBTC',
            'JUP', 'RAY', 'ORCA', 'PYTH', 'JTO', 'DRIFT', 'ZEUS',
            'BONK', 'WIF', 'POPCAT', 'BOME', 'MEW', 'SLERF', 'MYRO',
            'PURCH',
          ],
          description: 'Token symbol or raw Solana mint address',
        },
      },
      required: ['token'],
    },
    outputSchema: {
      type: 'object',
      properties: {
        token:      { type: 'string' },
        mint:       { type: 'string' },
        price:      { type: 'number' },
        change24h:  { type: 'number' },
        buyPressure:{ type: 'number' },
        confidence: { type: 'string' },
        fetchedAt:  { type: 'string' },
      },
    },
  },
  {
    id: 'compose',
    name: 'Scrape + Summarize',
    description: 'Give a URL, get an AI summary. Chains the scraper and summarizer in a single request for a combined price.',
    endpoint: `${APP_URL}/api/skills/compose`,
    method: 'POST',
    price: 0.011,
    icon: '⚡',
    tags: ['web', 'compose'],
    inputSchema: {
      type: 'object',
      properties: {
        url: { type: 'string', description: 'URL to scrape and summarize' },
        summaryStyle: { type: 'string', enum: ['bullet', 'paragraph', 'tldr'] },
      },
      required: ['url'],
    },
    outputSchema: {
      type: 'object',
      properties: {
        url: { type: 'string' },
        title: { type: 'string' },
        summary: { type: 'string' },
        scrapeMs: { type: 'number' },
        summarizeMs: { type: 'number' },
        totalMs: { type: 'number' },
      },
    },
  },
  {
    id: 'skill-router',
    name: 'Skill Router',
    description: 'Autonomous agent that routes your question to the right skills, paying each via x402 on Solana. Returns verifiable on-chain payment receipts for every sub-skill invoked.',
    endpoint: `${APP_URL}/api/skills/skill-router`,
    method: 'POST',
    price: 0.05,
    icon: '🤖',
    tags: ['web', 'agent', 'compose'],
    inputSchema: {
      type: 'object',
      properties: {
        question: { type: 'string', description: 'The question to answer' },
      },
      required: ['question'],
    },
    outputSchema: {
      type: 'object',
      properties: {
        answer: { type: 'string' },
        skillsUsed: { type: 'array', items: { type: 'string' } },
        payments: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              skillId: { type: 'string' },
              amount: { type: 'number' },
              txHash: { type: 'string' },
              explorerUrl: { type: 'string' },
            },
          },
        },
        totalCost: { type: 'number' },
        reasoning: { type: 'string' },
      },
    },
  },

  {
    id: 'google-search',
    name: 'Google Search',
    description: 'Search Google and get structured results — titles, links, snippets, knowledge panel, and answer boxes.',
    endpoint: `${APP_URL}/api/skills/google-search`,
    method: 'POST',
    price: 0.005,
    icon: '🔍',
    tags: ['web', 'data'],
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Search query' },
        num: { type: 'number', description: 'Number of results (max 20, default 10)' },
        type: { type: 'string', enum: ['search', 'news', 'images'], description: 'Search type' },
      },
      required: ['query'],
    },
    outputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string' },
        organic: { type: 'array' },
        knowledgeGraph: { type: 'object' },
        answerBox: { type: 'object' },
        topStories: { type: 'array' },
        relatedSearches: { type: 'array' },
      },
    },
  },

  // ── PERSONA SKILLS ────────────────────────────────────────────────────────
  {
    id: 'transcribe',
    name: 'Audio / Video Transcriber',
    description: 'Submit a public URL to any MP3, MP4, WAV, or M4A file. Returns a raw transcript or AI-formatted song lyrics.',
    endpoint: `${APP_URL}/api/skills/transcribe`,
    method: 'POST',
    price: 0.05,
    icon: '🎵',
    tags: ['persona', 'audio'],
    inputSchema: {
      type: 'object',
      properties: {
        url: {
          type: 'string',
          description: 'Public URL to an MP3, MP4, WAV, or M4A file (max 24MB)',
        },
        format: {
          type: 'string',
          enum: ['lyrics', 'raw'],
          description: '"lyrics" for AI-structured output, "raw" for verbatim transcript',
        },
      },
      required: ['url'],
    },
    outputSchema: {
      type: 'object',
      properties: {
        format:          { type: 'string' },
        lyrics:          { type: 'string' },
        rawTranscript:   { type: 'string' },
        transcript:      { type: 'string' },
        language:        { type: 'string' },
        durationSeconds: { type: 'number' },
        fileSizeKB:      { type: 'number' },
      },
    },
  },
  {
    id: 'youtube-summarize',
    name: 'YouTube Summarizer',
    description: 'Give the agent a YouTube URL. It reads the video transcript and returns an AI summary in bullet, paragraph, TL;DR, or chapter format.',
    endpoint: `${APP_URL}/api/skills/youtube-summarize`,
    method: 'POST',
    price: 0.025,
    icon: '▶️',
    tags: ['persona', 'video'],
    inputSchema: {
      type: 'object',
      properties: {
        url: {
          type: 'string',
          description: 'YouTube URL — youtube.com/watch?v=..., youtu.be/..., or /shorts/...',
        },
        style: {
          type: 'string',
          enum: ['bullet', 'paragraph', 'tldr', 'chapters'],
          description: 'Summary style',
        },
      },
      required: ['url'],
    },
    outputSchema: {
      type: 'object',
      properties: {
        videoId:             { type: 'string' },
        videoUrl:            { type: 'string' },
        title:               { type: 'string' },
        summary:             { type: 'string' },
        style:               { type: 'string' },
        durationMinutes:     { type: 'number' },
        transcriptWordCount: { type: 'number' },
      },
    },
  },
];

export const SKILLS_REGISTRY: SkillDefinition[] = base.map((s) => ({
  ...s,
  mcpToolDefinition: mkMCP(s),
}));

export function getSkill(id: string): SkillDefinition | undefined {
  return SKILLS_REGISTRY.find((s) => s.id === id);
}
