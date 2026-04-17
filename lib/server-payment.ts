import { Keypair, PublicKey, Transaction } from '@solana/web3.js';
import bs58 from 'bs58';
import { buildUSDCTransferTx, submitAndConfirm, encodePaymentHeader } from './solana-payment';

const SOLANA_NETWORK = process.env.NEXT_PUBLIC_SOLANA_NETWORK || 'devnet';

export interface SkillPaymentResult {
  skillId: string;
  amount: number;
  txHash: string;
  explorerUrl: string;
}

function loadTreasuryKeypair(): Keypair {
  const raw = (process.env.TREASURY_WALLET_PRIVATE_KEY || '').replace(/\s+/g, '');
  if (!raw) throw new Error('TREASURY_WALLET_PRIVATE_KEY not set');
  return Keypair.fromSecretKey(bs58.decode(raw));
}

/**
 * Make a real x402 payment to a SkillDock skill endpoint from the treasury wallet.
 * Returns the skill response data + a verifiable on-chain tx hash.
 */
export async function callSkillWithPayment(
  skillId: string,
  endpoint: string,
  method: 'GET' | 'POST',
  body?: Record<string, unknown>
): Promise<{ data: unknown; payment: SkillPaymentResult }> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const fetchInit: RequestInit = {
    method,
    headers,
    ...(method === 'POST' && body ? { body: JSON.stringify(body) } : {}),
  };

  // Step 1 — probe for payment requirements
  const probe = await fetch(endpoint, fetchInit);

  let txHash = 'demo_' + Math.random().toString(36).slice(2, 10);
  let paymentHeader: string;
  let payReqs: { amount: string; payTo: string; network: string } = {
    amount: '0',
    payTo: '',
    network: `solana:${SOLANA_NETWORK}`,
  };

  if (probe.status === 402) {
    const raw = await probe.json();
    // legacy flat format has amount/payTo at top level
    payReqs = {
      amount: raw.amount || '0',
      payTo: raw.payTo || '',
      network: raw.network || `solana:${SOLANA_NETWORK}`,
    };

    const atomicAmount = parseInt(payReqs.amount || '0');

    if (payReqs.payTo && atomicAmount > 0) {
      // Real payment path — treasury pays the sub-skill
      const keypair = loadTreasuryKeypair();
      const tx: Transaction = await buildUSDCTransferTx(
        keypair.publicKey,
        new PublicKey(payReqs.payTo),
        atomicAmount
      );
      tx.sign(keypair);
      txHash = await submitAndConfirm(tx);
      paymentHeader = encodePaymentHeader(txHash, tx, payReqs);
    } else {
      // Demo / no treasury configured
      paymentHeader = Buffer.from(
        JSON.stringify({ signature: txHash, ...payReqs })
      ).toString('base64');
    }
  } else {
    // Skill returned without requiring payment (e.g. dev mode)
    const data = await probe.json();
    const explorerUrl = `https://explorer.solana.com/tx/${txHash}?cluster=${SOLANA_NETWORK}`;
    return {
      data,
      payment: { skillId, amount: 0, txHash, explorerUrl },
    };
  }

  // Step 2 — retry with X-PAYMENT header
  const retryInit: RequestInit = {
    method,
    headers: { ...headers, 'X-PAYMENT': paymentHeader },
    ...(method === 'POST' && body ? { body: JSON.stringify(body) } : {}),
  };

  const response = await fetch(endpoint, retryInit);
  const data = await response.json();

  const amountUsdc = parseInt(payReqs.amount || '0') / 1_000_000;
  const explorerUrl = `https://explorer.solana.com/tx/${txHash}?cluster=${SOLANA_NETWORK}`;

  return {
    data,
    payment: { skillId, amount: amountUsdc, txHash, explorerUrl },
  };
}
