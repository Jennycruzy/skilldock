import { SkillDefinition } from '@/types';

const APP_URL = 'https://skilldock.duckdns.org';
const FACILITATOR_URL = process.env.NEXT_PUBLIC_PURCH_FACILITATOR_URL || 'https://app.purch.xyz/facilitator';
const NETWORK = process.env.NEXT_PUBLIC_SOLANA_NETWORK || 'devnet';

function mkMCP(skill: Omit<SkillDefinition, 'mcpToolDefinition'>): SkillDefinition['mcpToolDefinition'] {
  return {
    name: `skilldock_${skill.id.replace(/-/g, '_')}`,
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
    id: 'whale-tail',
    name: 'Whale Tail Detector',
    description: 'Identifies smart wallets that bought a Solana token recently with a historical win rate above 70%. Returns entry prices, position sizes, and whether they are still holding.',
    endpoint: `${APP_URL}/api/skills/whale-tail`,
    method: 'POST',
    price: 0.08,
    icon: '🐋',
    tags: ['solana', 'defi', 'data'],
    inputSchema: {
      type: 'object',
      properties: {
        mintAddress: { type: 'string', description: 'Solana token mint address' },
        lookbackHours: { type: 'number', description: 'Hours to look back, 1-48', default: 24 },
      },
      required: ['mintAddress'],
    },
    outputSchema: {
      type: 'object',
      properties: {
        mintAddress: { type: 'string' },
        lookbackHours: { type: 'number' },
        smartWalletsFound: { type: 'number' },
        wallets: { type: 'array' },
        analysedAt: { type: 'string' },
        dataSource: { type: 'string' },
      },
    },
  },
  {
    id: 'calendar-event',
    name: 'Calendar Event Creator',
    description: 'Creates a real Google Calendar event and sends email invites to all attendees. No Google account required from the caller — SkillDock\'s service account handles everything.',
    endpoint: `${APP_URL}/api/skills/calendar-event`,
    method: 'POST',
    price: 0.015,
    icon: '📅',
    tags: ['productivity', 'agent'],
    inputSchema: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Event title' },
        startTime: { type: 'string', description: 'ISO 8601 datetime' },
        endTime: { type: 'string', description: 'ISO 8601 datetime' },
        attendeeEmails: { type: 'array', items: { type: 'string' }, description: 'List of attendee emails' },
        description: { type: 'string', description: 'Event description' },
        meetingLink: { type: 'string', description: 'Optional meeting link (Zoom, Meet, etc.)' },
        timezone: { type: 'string', description: 'Timezone (default UTC)', default: 'UTC' },
      },
      required: ['title', 'startTime', 'endTime', 'attendeeEmails'],
    },
    outputSchema: {
      type: 'object',
      properties: {
        eventId: { type: 'string' },
        calendarLink: { type: 'string' },
        title: { type: 'string' },
        startTime: { type: 'string' },
        endTime: { type: 'string' },
        attendeeEmails: { type: 'array' },
        invitesSent: { type: 'boolean' },
        createdAt: { type: 'string' },
      },
    },
  },
  {
    id: 'usdc-split',
    name: 'USDC Splitter',
    description: 'Executes multiple Solana USDC transfers in one batched transaction from the calling agent\'s dedicated Crossmint vault. Agent exposes vault address to receive bulk USDC, then calls this skill to split to recipients.',
    endpoint: `${APP_URL}/api/skills/usdc-split`,
    method: 'POST',
    price: 0.006,
    icon: '💸',
    tags: ['solana', 'defi', 'agent'],
    inputSchema: {
      type: 'object',
      properties: {
        agentId: { type: 'string', description: 'Your SkillDock registered agent ID' },
        recipients: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              address: { type: 'string', description: 'Recipient Solana wallet address' },
              amount: { type: 'number', description: 'USDC amount to send' },
            },
            required: ['address', 'amount'],
          },
          maxItems: 20,
        },
        memo: { type: 'string', description: 'Optional on-chain memo e.g. Bounty payout' },
        network: { type: 'string', default: 'devnet' },
      },
      required: ['agentId', 'recipients'],
    },
    outputSchema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        agentVaultAddress: { type: 'string' },
        recipientCount: { type: 'number' },
        totalAmountSent: { type: 'number' },
        txHash: { type: 'string' },
        explorerUrl: { type: 'string' },
        recipients: { type: 'array' },
        failed: { type: 'array' },
        vaultBalanceAfter: { type: 'number' },
        executedAt: { type: 'string' },
      },
    },
  },
  {
    id: 'pdf-generate',
    name: 'PDF Generator',
    description: 'Renders an HTML string to a real PDF file and returns a 24-hour download link. Supports inline styles, A4/Letter sizes, portrait/landscape orientation.',
    endpoint: `${APP_URL}/api/skills/pdf-generate`,
    method: 'POST',
    price: 0.02,
    icon: '📄',
    tags: ['productivity', 'data', 'agent'],
    inputSchema: {
      type: 'object',
      properties: {
        html: { type: 'string', description: 'Full HTML document with inline styles' },
        filename: { type: 'string', description: 'Output filename without .pdf extension' },
        pageSize: { type: 'string', enum: ['A4', 'Letter'], default: 'A4' },
        orientation: { type: 'string', enum: ['portrait', 'landscape'], default: 'portrait' },
        margins: {
          type: 'object',
          properties: {
            top: { type: 'string' },
            bottom: { type: 'string' },
            left: { type: 'string' },
            right: { type: 'string' },
          },
        },
      },
      required: ['html', 'filename'],
    },
    outputSchema: {
      type: 'object',
      properties: {
        downloadUrl: { type: 'string' },
        filename: { type: 'string' },
        fileSizeBytes: { type: 'number' },
        expiresAt: { type: 'string' },
        generatedAt: { type: 'string' },
      },
    },
  },
  {
    id: 'task-delegate',
    name: 'Task Delegator',
    description: 'Posts a task to the SkillDock agent marketplace. Other agents claim and complete it using their own skills. Payment routes automatically between agent Crossmint vaults on completion.',
    endpoint: `${APP_URL}/api/skills/task-delegate`,
    method: 'POST',
    price: 0.015,
    icon: '🤝',
    tags: ['agent', 'compose'],
    inputSchema: {
      type: 'object',
      properties: {
        task: { type: 'string', description: 'Natural language description of the task' },
        budget: { type: 'number', description: 'Maximum USDC willing to pay for completion' },
        requiredSkills: { type: 'array', items: { type: 'string' }, description: "Skill IDs needed e.g. ['pdf-generate', 'whale-tail']" },
        postedBy: { type: 'string', description: 'Agent name or ID' },
        postedByWallet: { type: 'string', description: 'Agent Crossmint vault wallet address' },
      },
      required: ['task', 'budget', 'requiredSkills', 'postedBy', 'postedByWallet'],
    },
    outputSchema: {
      type: 'object',
      properties: {
        taskId: { type: 'string' },
        task: { type: 'string' },
        budget: { type: 'number' },
        requiredSkills: { type: 'array' },
        status: { type: 'string' },
        expiresAt: { type: 'string' },
        vaultAddress: { type: 'string' },
        monitorUrl: { type: 'string' },
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
