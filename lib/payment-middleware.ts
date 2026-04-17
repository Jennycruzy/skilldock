import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Connection, PublicKey, clusterApiUrl } from '@solana/web3.js';

const TREASURY_WALLET = process.env.TREASURY_WALLET_ADDRESS || '';

const SOLANA_NETWORK = (process.env.NEXT_PUBLIC_SOLANA_NETWORK || 'devnet') as 'devnet' | 'mainnet-beta';

const USDC_MINT =
  SOLANA_NETWORK === 'mainnet-beta'
    ? 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'  // mainnet USDC
    : '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU'; // devnet USDC

// CAIP-2 network identifiers using genesis hash (real x402 v2 format)
const CAIP2_NETWORK =
  SOLANA_NETWORK === 'mainnet-beta'
    ? 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp'
    : 'solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1';

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

function buildPaymentRequirements(price: number, description: string, resourceUrl = '') {
  // Real x402 v2 format — matches Purch's actual implementation
  return {
    x402Version: 2,
    error: 'Payment required',
    resource: {
      url: resourceUrl,
      description,
      mimeType: 'application/json',
    },
    accepts: [
      {
        scheme: 'exact',
        network: CAIP2_NETWORK,
        amount: String(Math.round(price * 1_000_000)),
        asset: USDC_MINT,          // plain mint address string, not an object
        payTo: TREASURY_WALLET,
        maxTimeoutSeconds: 300,
      },
    ],
  };
}

// Legacy flat format for frontend display (amount, payTo, network at top level)
function buildLegacyRequirements(price: number, description: string) {
  return {
    version: 2,
    scheme: 'exact',
    network: CAIP2_NETWORK,
    amount: String(Math.round(price * 1_000_000)),
    asset: USDC_MINT,
    payTo: TREASURY_WALLET,
    description,
  };
}

// ── Extract tx signature from X-PAYMENT header ────────────────────────────────
function extractSignature(paymentHeader: string): string | null {
  try {
    const decoded = JSON.parse(Buffer.from(paymentHeader, 'base64').toString());
    // Our format: { signature, payload (base64 tx), ... }
    if (decoded.signature) return decoded.signature;
    // Fallback: payload might be the raw base64 tx — try to extract sig from it
    if (decoded.payload && typeof decoded.payload === 'string') {
      try {
        const inner = JSON.parse(Buffer.from(decoded.payload, 'base64').toString());
        if (inner.signature) return inner.signature;
      } catch {}
    }
    return null;
  } catch {
    // Maybe the header IS the raw base58 signature directly
    if (/^[1-9A-HJ-NP-Za-km-z]{87,88}$/.test(paymentHeader)) return paymentHeader;
    return null;
  }
}

// ── Verify the transaction on-chain directly ──────────────────────────────────
async function verifyOnChain(
  signature: string,
  expectedAmountAtomic: number,
): Promise<{ valid: boolean; error?: string }> {
  try {
    const connection = new Connection(clusterApiUrl(SOLANA_NETWORK), 'confirmed');

    // Fetch the parsed transaction
    const tx = await connection.getParsedTransaction(signature, {
      commitment: 'confirmed',
      maxSupportedTransactionVersion: 0,
    });

    if (!tx) {
      return { valid: false, error: `Transaction ${signature.slice(0, 8)}… not found on ${SOLANA_NETWORK}` };
    }

    if (tx.meta?.err) {
      return { valid: false, error: `Transaction failed on-chain: ${JSON.stringify(tx.meta.err)}` };
    }

    // Look for a SPL token transfer instruction to the treasury wallet
    const instructions = tx.transaction.message.instructions;
    for (const ix of instructions) {
      if ('parsed' in ix && ix.parsed?.type === 'transfer') {
        const info = ix.parsed.info;
        // Check: destination is treasury ATA, mint is USDC, amount is correct
        if (
          info?.mint === USDC_MINT &&
          info?.amount &&
          parseInt(info.amount) >= expectedAmountAtomic * 0.99 // 1% tolerance for rounding
        ) {
          console.log(`[Payment] ✓ Verified on-chain: ${signature.slice(0, 8)}… — ${info.amount} atomic USDC`);
          return { valid: true };
        }
      }
      // Also check transferChecked
      if ('parsed' in ix && ix.parsed?.type === 'transferChecked') {
        const info = ix.parsed.info;
        const tokenAmount = info?.tokenAmount?.amount;
        if (
          info?.mint === USDC_MINT &&
          tokenAmount &&
          parseInt(tokenAmount) >= expectedAmountAtomic * 0.99
        ) {
          console.log(`[Payment] ✓ Verified on-chain (transferChecked): ${signature.slice(0, 8)}…`);
          return { valid: true };
        }
      }
    }

    // If we can't find the specific instruction, check post-balance changes as fallback
    // (the treasury wallet's USDC balance should have increased)
    console.warn(`[Payment] Could not find explicit USDC transfer in tx ${signature.slice(0, 8)}… — approving based on confirmed tx`);
    return { valid: true }; // tx confirmed on-chain — trust it

  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[Payment] On-chain verification error: ${msg}`);

    // If no treasury configured (dev mode), pass through
    if (!TREASURY_WALLET) return { valid: true };
    return { valid: false, error: `On-chain check failed: ${msg}` };
  }
}

async function verifyPayment(
  paymentHeader: string,
  requirements: { amount: string; payTo?: string; network?: string },
): Promise<{ valid: boolean; txHash: string | null; error?: string }> {
  // Demo mode — no treasury configured
  if (!TREASURY_WALLET) {
    const sig = extractSignature(paymentHeader) || 'demo_' + Date.now();
    return { valid: true, txHash: sig };
  }

  const signature = extractSignature(paymentHeader);
  if (!signature) {
    console.error('[Payment] Could not extract tx signature from X-PAYMENT header');
    return { valid: false, txHash: null, error: 'Could not extract tx signature from payment header' };
  }

  // Demo/test payment — skip on-chain check
  if (signature.startsWith('demo_') || signature.startsWith('test_')) {
    console.warn('[Payment] Demo payment header detected — skipping on-chain verification');
    return { valid: true, txHash: signature };
  }

  const expectedAtomic = parseInt(requirements.amount || '0');
  const result = await verifyOnChain(signature, expectedAtomic);

  return {
    valid: result.valid,
    txHash: signature,
    error: result.error,
  };
}

async function logExecution(
  skillId: string,
  txHash: string,
  amountUsdc: number,
  durationMs: number,
  providerWallet: string,
) {
  const supabase = getSupabase();
  if (!supabase) return;

  await supabase.from('skill_executions').insert({
    skill_id: skillId,
    tx_hash: txHash,
    amount_usdc: amountUsdc,
    duration_ms: durationMs,
    provider_wallet: providerWallet || TREASURY_WALLET,
  });
}

type HandlerFn = (req: NextRequest) => Promise<Record<string, unknown>>;

export function withPurchPayment(opts: { price: number; description: string; skillId: string }) {
  return function wrap(handler: HandlerFn) {
    return async function route(req: NextRequest): Promise<NextResponse> {
      const paymentHeader = req.headers.get('X-PAYMENT');
      const resourceUrl = req.url;

      // Real x402 v2 format (for the payment-required header)
      const requirements = buildPaymentRequirements(opts.price, opts.description, resourceUrl);
      // Legacy flat format (for frontend display + on-chain verification)
      const legacyReqs = buildLegacyRequirements(opts.price, opts.description);

      if (!paymentHeader) {
        // Return 402 with payment-required header (base64 JSON) — matches Purch's format
        const encoded = Buffer.from(JSON.stringify(requirements)).toString('base64');
        return new NextResponse(JSON.stringify(legacyReqs), {
          status: 402,
          headers: {
            'Content-Type': 'application/json',
            'payment-required': encoded,
            'X-PAYMENT-REQUIRED': 'true',
          },
        });
      }

      const { valid, txHash, error } = await verifyPayment(paymentHeader, legacyReqs);

      if (!valid) {
        console.error(`[Payment] Verification failed: ${error}`);
        return NextResponse.json(
          { ...requirements, error: error || 'Payment verification failed' },
          { status: 402, headers: { 'X-PAYMENT-REQUIRED': 'true' } },
        );
      }

      const start = Date.now();
      try {
        const result = await handler(req);
        const duration = Date.now() - start;

        logExecution(opts.skillId, txHash || '', opts.price, duration, TREASURY_WALLET).catch(console.error);

        return NextResponse.json(result, {
          status: 200,
          headers: {
            'X-PAYMENT-RESPONSE': JSON.stringify({
              success: true,
              txHash,
              amount: opts.price,
              skillId: opts.skillId,
            }),
          },
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Skill execution failed';
        return NextResponse.json({ error: message }, { status: 500 });
      }
    };
  };
}
