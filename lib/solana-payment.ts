import {
  Connection,
  PublicKey,
  Transaction,
  clusterApiUrl,
} from '@solana/web3.js';
import {
  getAssociatedTokenAddress,
  createTransferInstruction,
  createAssociatedTokenAccountIdempotentInstruction,
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
} from '@solana/spl-token';

const NETWORK = (process.env.NEXT_PUBLIC_SOLANA_NETWORK || 'devnet') as
  | 'devnet'
  | 'mainnet-beta';

const USDC_MINT =
  NETWORK === 'mainnet-beta'
    ? 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'
    : '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU';

export function getConnection(): Connection {
  return new Connection(clusterApiUrl(NETWORK), 'confirmed');
}

/**
 * Build a real USDC SPL token transfer transaction.
 * Returns unsigned — caller must sign with Phantom.
 */
export async function buildUSDCTransferTx(
  fromPubkey: PublicKey,
  toPubkey: PublicKey,
  atomicAmount: number   // price * 1_000_000  e.g. $0.002 → 2000
): Promise<Transaction> {
  const connection = getConnection();

  const fromATA = await getAssociatedTokenAddress(
    new PublicKey(USDC_MINT),
    fromPubkey
  );

  const toATA = await getAssociatedTokenAddress(
    new PublicKey(USDC_MINT),
    toPubkey
  );

  // Create recipient ATA if it doesn't exist (idempotent — safe to include always)
  const createToATAIx = createAssociatedTokenAccountIdempotentInstruction(
    fromPubkey,           // payer of account creation fee
    toATA,
    toPubkey,
    new PublicKey(USDC_MINT),
    TOKEN_PROGRAM_ID,
    ASSOCIATED_TOKEN_PROGRAM_ID
  );

  const transferIx = createTransferInstruction(
    fromATA,
    toATA,
    fromPubkey,
    BigInt(atomicAmount),
    [],
    TOKEN_PROGRAM_ID
  );

  const tx = new Transaction().add(createToATAIx, transferIx);
  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
  tx.recentBlockhash = blockhash;
  tx.feePayer = fromPubkey;

  // Store for confirmation later
  (tx as Transaction & { lastValidBlockHeight: number }).lastValidBlockHeight =
    lastValidBlockHeight;

  return tx;
}

/**
 * Submit signed transaction to Solana and wait for confirmation.
 * Returns the real base58 tx signature.
 */
export async function submitAndConfirm(
  signedTx: Transaction
): Promise<string> {
  const connection = getConnection();
  const raw = signedTx.serialize();

  const signature = await connection.sendRawTransaction(raw, {
    skipPreflight: false,
    preflightCommitment: 'confirmed',
  });

  await connection.confirmTransaction(signature, 'confirmed');
  return signature;
}

/**
 * Encode the signed transaction as the X-PAYMENT header value.
 *
 * Purch x402 ExactSvmScheme format:
 *   base64( JSON.stringify({
 *     x402Version: 1,
 *     scheme: "exact",
 *     network: "solana:devnet",
 *     payload: "<base64_serialized_signed_tx>"   ← string, not object
 *   }) )
 */
export function encodePaymentHeader(
  signature: string,
  signedTx: Transaction | null,
  paymentRequirements: {
    amount: string;
    payTo: string;
    network: string;
  }
): string {
  const wrapper: Record<string, unknown> = {
    x402Version: 1,
    scheme: 'exact',
    network: paymentRequirements.network,
    signature,
  };

  if (signedTx) {
    wrapper.payload = Buffer.from(signedTx.serialize()).toString('base64');
  }

  return Buffer.from(JSON.stringify(wrapper)).toString('base64');
}
