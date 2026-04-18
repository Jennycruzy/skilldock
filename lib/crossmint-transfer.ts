import { Connection, PublicKey, Transaction, clusterApiUrl } from '@solana/web3.js';
import {
  createTransferInstruction,
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
} from '@solana/spl-token';

const USDC_MINT = new PublicKey('4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU');
const CROSSMINT_API = 'https://staging.crossmint.com/api/v1-alpha2';

export async function transferUsdcViaCrossmint(
  fromWalletId: string,
  fromAddress: string,
  toAddress: string,
  amountUsdc: number,
): Promise<string> {
  const apiKey = process.env.CROSSMINT_SERVER_API_KEY;
  if (!apiKey) throw new Error('CROSSMINT_SERVER_API_KEY not configured');

  const connection = new Connection(clusterApiUrl('devnet'), 'confirmed');
  const fromPubkey = new PublicKey(fromAddress);
  const toPubkey = new PublicKey(toAddress);

  const fromATA = await getAssociatedTokenAddress(USDC_MINT, fromPubkey);
  const toATA = await getAssociatedTokenAddress(USDC_MINT, toPubkey);

  const tx = new Transaction();

  // Create recipient ATA if it doesn't exist — fee paid by sender
  const toATAInfo = await connection.getAccountInfo(toATA);
  if (!toATAInfo) {
    tx.add(createAssociatedTokenAccountInstruction(fromPubkey, toATA, toPubkey, USDC_MINT));
  }

  tx.add(
    createTransferInstruction(fromATA, toATA, fromPubkey, BigInt(Math.round(amountUsdc * 1_000_000)))
  );

  const { blockhash } = await connection.getLatestBlockhash('confirmed');
  tx.recentBlockhash = blockhash;
  tx.feePayer = fromPubkey;

  const serialized = tx.serialize({ requireAllSignatures: false, verifySignatures: false });

  const response = await fetch(`${CROSSMINT_API}/wallets/${fromWalletId}/transactions`, {
    method: 'POST',
    headers: { 'X-API-KEY': apiKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({ params: { transaction: serialized.toString('base64') } }),
    signal: AbortSignal.timeout(30_000),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Crossmint transfer failed (${response.status}): ${err}`);
  }

  const result = await response.json() as { id?: string; onChain?: { txId?: string } };
  return result.onChain?.txId || result.id || `crossmint_${Date.now()}`;
}

export async function getUsdcBalance(walletAddress: string): Promise<number> {
  try {
    const connection = new Connection(clusterApiUrl('devnet'), 'confirmed');
    const walletPk = new PublicKey(walletAddress);
    const tokenAccounts = await connection.getParsedTokenAccountsByOwner(walletPk, { mint: USDC_MINT });
    if (!tokenAccounts.value.length) return 0;
    return (tokenAccounts.value[0].account.data.parsed?.info?.tokenAmount?.uiAmount as number) || 0;
  } catch {
    return 0;
  }
}
