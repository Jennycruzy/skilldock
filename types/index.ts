export interface SkillDefinition {
  id: string;
  name: string;
  description: string;
  endpoint: string;
  method: 'GET' | 'POST';
  price: number; // in USDC
  inputSchema: Record<string, unknown>;
  outputSchema: Record<string, unknown>;
  tags: string[];
  icon: string;
  mcpToolDefinition: MCPToolDefinition;
}

export interface MCPToolDefinition {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  x402: {
    endpoint: string;
    facilitator: string;
    price: number;
    network: string;
  };
}

export interface PaymentRequirements {
  version: number;
  scheme: string;
  network: string;
  facilitator: string;
  amount: string;
  asset: {
    address: string;
    decimals: number;
  };
  payTo: string;
  description: string;
}

export interface SkillExecution {
  id: string;
  skill_id: string;
  tx_hash: string;
  amount_usdc: number;
  duration_ms: number;
  provider_wallet: string;
  created_at: string;
}

export interface SkillProvider {
  id: string;
  name: string;
  wallet_address: string;
  manifest_url: string;
  verified: boolean;
  skill_count: number;
  created_at: string;
}

export interface RegistryStats {
  totalSkills: number;
  totalExecutions: number;
  totalVolumeUsdc: number;
  uniqueProviders: number;
}

export interface TerminalLine {
  timestamp: string;
  content: string;
  type: 'info' | 'success' | 'error' | 'warning' | 'result' | 'receipt' | 'link';
}
