import { NextRequest } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { withPurchPayment } from '@/lib/payment-middleware';
import { callSkillWithPayment, SkillPaymentResult } from '@/lib/server-payment';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://skilldock.vercel.app';

// Skills available to the router (excludes itself to prevent loops)
const ROUTABLE_SKILLS = [
  {
    id: 'solana-price',
    description: 'Get real-time price of a Solana token. Tokens: SOL, USDC, BONK, WIF, JUP, PURCH, RAY, ORCA.',
    method: 'GET' as const,
    endpoint: `${APP_URL}/api/skills/solana-price`,
    price: 0.001,
    inputSchema: {
      type: 'object' as const,
      properties: { token: { type: 'string', description: 'Token symbol e.g. SOL' } },
      required: ['token'],
    },
  },
  {
    id: 'google-search',
    description: 'Search Google for current information, news, or any topic. Returns organic results, knowledge panels, and answer boxes.',
    method: 'POST' as const,
    endpoint: `${APP_URL}/api/skills/google-search`,
    price: 0.005,
    inputSchema: {
      type: 'object' as const,
      properties: {
        query: { type: 'string', description: 'Search query' },
        type: { type: 'string', enum: ['search', 'news'], description: 'search or news' },
      },
      required: ['query'],
    },
  },
  {
    id: 'scrape',
    description: 'Fetch and extract content from any public URL. Returns title, body text, and links.',
    method: 'POST' as const,
    endpoint: `${APP_URL}/api/skills/scrape`,
    price: 0.002,
    inputSchema: {
      type: 'object' as const,
      properties: { url: { type: 'string', description: 'URL to fetch' } },
      required: ['url'],
    },
  },
  {
    id: 'summarize',
    description: 'Summarize a long piece of text in bullet, paragraph, or tldr format.',
    method: 'POST' as const,
    endpoint: `${APP_URL}/api/skills/summarize`,
    price: 0.01,
    inputSchema: {
      type: 'object' as const,
      properties: {
        text: { type: 'string', description: 'Text to summarize' },
        style: { type: 'string', enum: ['bullet', 'paragraph', 'tldr'] },
      },
      required: ['text'],
    },
  },
  {
    id: 'compose',
    description: 'Scrape a URL and summarize its content in one step. Cheaper than calling scrape + summarize separately.',
    method: 'POST' as const,
    endpoint: `${APP_URL}/api/skills/compose`,
    price: 0.011,
    inputSchema: {
      type: 'object' as const,
      properties: {
        url: { type: 'string', description: 'URL to scrape and summarize' },
        summaryStyle: { type: 'string', enum: ['bullet', 'paragraph', 'tldr'] },
      },
      required: ['url'],
    },
  },
  {
    id: 'youtube-summarize',
    description: 'Summarize a YouTube video from its URL. Returns key points, chapters, or a TL;DR.',
    method: 'POST' as const,
    endpoint: `${APP_URL}/api/skills/youtube-summarize`,
    price: 0.025,
    inputSchema: {
      type: 'object' as const,
      properties: {
        url: { type: 'string', description: 'YouTube URL' },
        style: { type: 'string', enum: ['bullet', 'paragraph', 'tldr', 'chapters'] },
      },
      required: ['url'],
    },
  },
];

const ROUTER_TOOLS: Anthropic.Tool[] = ROUTABLE_SKILLS.map((skill) => ({
  name: `call_${skill.id.replace(/-/g, '_')}`,
  description: `[x402 · $${skill.price.toFixed(3)} USDC] ${skill.description}`,
  input_schema: skill.inputSchema,
}));

function skillFromToolName(toolName: string) {
  const id = toolName.replace('call_', '').replace(/_/g, '-');
  return ROUTABLE_SKILLS.find((s) => s.id === id);
}

const handler = withPurchPayment({
  price: 0.05,
  description: 'Skill Router — autonomous agent that pays other skills via x402 to answer any question',
  skillId: 'skill-router',
})(async (req: NextRequest) => {
  const body = await req.json();
  const { question } = body as { question: string };

  if (!question || typeof question !== 'string') {
    throw new Error('question is required');
  }

  const payments: SkillPaymentResult[] = [];
  const skillsUsed: string[] = [];
  const reasoningSteps: string[] = [];

  const messages: Anthropic.MessageParam[] = [
    {
      role: 'user',
      content: [
        'You are an autonomous Skill Router. Answer questions by calling the available skills via x402 payments.',
        'Each tool call you make sends a real USDC micropayment to that skill on Solana.',
        'Use only the skills you genuinely need — every call costs money.',
        '',
        `Question: ${question}`,
      ].join('\n'),
    },
  ];

  let finalAnswer = '';
  let iterations = 0;
  const MAX_ITERATIONS = 5;

  while (iterations < MAX_ITERATIONS) {
    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      tools: ROUTER_TOOLS,
      messages,
    });

    iterations++;

    if (response.stop_reason === 'end_turn') {
      finalAnswer = response.content
        .filter((c) => c.type === 'text')
        .map((c) => (c as { type: 'text'; text: string }).text)
        .join('');
      break;
    }

    if (response.stop_reason === 'tool_use') {
      const toolUses = response.content.filter((c) => c.type === 'tool_use');
      const toolResults: Anthropic.ToolResultBlockParam[] = [];

      messages.push({ role: 'assistant', content: response.content });

      for (const toolUse of toolUses) {
        if (toolUse.type !== 'tool_use') continue;

        const skill = skillFromToolName(toolUse.name);
        if (!skill) {
          toolResults.push({
            type: 'tool_result',
            tool_use_id: toolUse.id,
            content: JSON.stringify({ error: `Unknown skill: ${toolUse.name}` }),
          });
          continue;
        }

        const input = toolUse.input as Record<string, string>;
        reasoningSteps.push(`→ routing to ${skill.id} ($${skill.price.toFixed(3)}) — input: ${JSON.stringify(input)}`);

        if (!skillsUsed.includes(skill.id)) skillsUsed.push(skill.id);

        let result: unknown;
        try {
          let endpoint = skill.endpoint;
          let callBody: Record<string, unknown> | undefined;

          if (skill.method === 'GET') {
            const params = new URLSearchParams(input);
            endpoint = `${skill.endpoint}?${params.toString()}`;
          } else {
            callBody = input as Record<string, unknown>;
          }

          const { data, payment } = await callSkillWithPayment(
            skill.id,
            endpoint,
            skill.method,
            callBody
          );

          payments.push(payment);
          result = data;
          reasoningSteps.push(`  ✓ paid — tx: ${payment.txHash.slice(0, 8)}…  ${payment.explorerUrl}`);
        } catch (err) {
          const msg = err instanceof Error ? err.message : 'Skill call failed';
          result = { error: msg };
          reasoningSteps.push(`  ✗ ${skill.id} failed: ${msg}`);
        }

        toolResults.push({
          type: 'tool_result',
          tool_use_id: toolUse.id,
          content: JSON.stringify(result),
        });
      }

      messages.push({ role: 'user', content: toolResults });
    } else {
      finalAnswer = response.content
        .filter((c) => c.type === 'text')
        .map((c) => (c as { type: 'text'; text: string }).text)
        .join('');
      break;
    }
  }

  const subCost = payments.reduce((s, p) => s + p.amount, 0);

  return {
    answer: finalAnswer || 'Skill Router could not produce an answer.',
    skillsUsed,
    payments,
    totalCost: parseFloat((0.05 + subCost).toFixed(4)),
    reasoning: reasoningSteps.join('\n'),
  };
});

export { handler as POST };
