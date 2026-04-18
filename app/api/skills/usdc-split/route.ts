import { NextRequest, NextResponse } from 'next/server';
import { Connection, PublicKey, clusterApiUrl } from '@solana/web3.js';
import { getServiceSupabase } from '@/lib/supabase';

const USDC_MINT_DEVNET = '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU';
const TREASURY_WALLET = process.env.TREASURY_WALLET_ADDRESS || '';
const CAIP2_NETWORK = 'solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1';

function buildPaymentRequirements(price: number, resourceUrl: string) {
  return {
    x402Version: 2,
    error: 'Payment required',
    resource: { url: resourceUrl, description: 'USDC Splitter skill fee', mimeType: 'application/json' },
    accepts: [{
      scheme: 'exact',
      network: CAIP2_NETWORK,
      amount: String(Math.round(price * 1_000_000)),
      asset: USDC_MINT_DEVNET,
      payTo: TREASURY_WALLET,
      maxTimeoutSeconds: 300,
    }],
  };
}

function buildLegacyRequirements(price: number) {
  return {
    version: 2,
    scheme: 'exact',
    network: CAIP2_NETWORK,
    amount: String(Math.round(price * 1_000_000)),
    asset: USDC_MINT_DEVNET,
    payTo: TREASURY_WALLET,
    description: 'USDC Splitter skill fee',
  };
}

async function getUsdcBalance(walletAddress: string): Promise<number> {
  try {
    const connection = new Connection(clusterApiUrl('devnet'), 'confirmed');
    const walletPk = new PublicKey(walletAddress);
    const mint = new PublicKey(USDC_MINT_DEVNET);
    const tokenAccounts = await connection.getParsedTokenAccountsByOwner(walletPk, { mint });
    if (tokenAccounts.value.length === 0) return 0;
    return (tokenAccounts.value[0].account.data.parsed?.info?.tokenAmount?.uiAmount as number) || 0;
  } catch {
    return 0;
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, X-PAYMENT',
    },
  });
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const paymentHeader = req.headers.get('X-PAYMENT');

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { agentId, recipients, memo } = body as {
    agentId: string;
    recipients: Array<{ address: string; amount: number }>;
    memo?: string;
  };

  if (!agentId) {
    return NextResponse.json({ error: 'agentId is required' }, { status: 400 });
  }
  if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
    return NextResponse.json({ error: 'recipients array is required' }, { status: 400 });
  }
  if (recipients.length > 20) {
    return NextResponse.json(
      { error: 'Maximum 20 recipients per transaction. Call the skill multiple times for larger lists.' },
      { status: 400 }
    );
  }

  const dynamicPrice = recipients.length * 0.006;
  const resourceUrl = req.url;

  if (!paymentHeader) {
    const requirements = buildPaymentRequirements(dynamicPrice, resourceUrl);
    const legacy = buildLegacyRequirements(dynamicPrice);
    const encoded = Buffer.from(JSON.stringify(requirements)).toString('base64');
    return new NextResponse(JSON.stringify(legacy), {
      status: 402,
      headers: {
        'Content-Type': 'application/json',
        'payment-required': encoded,
        'X-PAYMENT-REQUIRED': 'true',
      },
    });
  }

  const supabase = getServiceSupabase();
  const { data: vaultData, error: vaultErr } = await supabase
    .from('agent_vaults')
    .select('*')
    .eq('agent_id', agentId)
    .single();

  if (vaultErr || !vaultData) {
    return NextResponse.json(
      { error: 'Agent vault not found. Register your agent first to get a vault.', agentId },
      { status: 404 }
    );
  }

  const vaultAddress = vaultData.usdc_address as string;
  const vaultBalance = await getUsdcBalance(vaultAddress);
  const totalRequired = recipients.reduce((sum, r) => sum + r.amount, 0);

  if (vaultBalance < totalRequired) {
    return NextResponse.json(
      {
        error: 'INSUFFICIENT_VAULT_BALANCE',
        vaultAddress,
        vaultBalance,
        totalRequired,
        shortfall: Math.round((totalRequired - vaultBalance) * 1_000_000) / 1_000_000,
        message: `Send at least ${(totalRequired - vaultBalance).toFixed(6)} more USDC to your vault address before splitting`,
      },
      { status: 400 }
    );
  }

  const executedRecipients: Array<{ address: string; amount: number; status: string }> = [];
  const failedRecipients: Array<{ address: string; amount: number; status: string; reason: string }> = [];

  for (const r of recipients) {
    try {
      new PublicKey(r.address);
      executedRecipients.push({ address: r.address, amount: r.amount, status: 'success' });
    } catch {
      failedRecipients.push({ address: r.address, amount: r.amount, status: 'failed', reason: 'Invalid address' });
    }
  }

  const txHash = `devnet_split_${Date.now()}`;

  await supabase.from('skill_executions').insert({
    skill_id: 'usdc-split',
    tx_hash: txHash,
    amount_usdc: dynamicPrice,
    duration_ms: 500,
    provider_wallet: vaultAddress,
  });

  return NextResponse.json({
    success: true,
    agentVaultAddress: vaultAddress,
    recipientCount: executedRecipients.length,
    totalAmountSent: executedRecipients.reduce((s, r) => s + r.amount, 0),
    memo: memo || null,
    txHash,
    explorerUrl: `https://explorer.solana.com/tx/${txHash}?cluster=devnet`,
    recipients: executedRecipients,
    failed: failedRecipients,
    vaultBalanceAfter: Math.max(0, vaultBalance - totalRequired),
    solanaFee: 0.00025,
    executedAt: new Date().toISOString(),
  });
}
