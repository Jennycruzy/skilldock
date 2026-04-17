import { NextRequest } from 'next/server';
import { withPurchPayment } from '@/lib/payment-middleware';

// ── Known token mint addresses (Solana mainnet) ───────────────────────────────
// Symbol → mainnet mint address
// Also accepts a raw base58 mint address as the `token` param for any unlisted token.
const TOKEN_MINTS: Record<string, string> = {
  // Major
  SOL:     'So11111111111111111111111111111111111111112',
  USDC:    'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
  USDT:    'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB',
  WBTC:    '3NZ9JMVBmGAqocybic2c7LQCJScmgsAZ6vQqTDzcqmJh',

  // DeFi / Infra
  JUP:     'JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN',
  RAY:     '4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R',
  ORCA:    'orcaEKTdK7LKz57vaAYr9QeNsVEPfiu6QeMU1kektZE',
  PYTH:    'HZ1JovNiVvGrGNiiYvEozEVgZ58xaU3RKwX8eACQBCt3',
  JTO:     'jtojtomepa8beP8AuQc6eXt5FriJwfFMwQx2v2f9mCL',
  DRIFT:   'DriFtupJYLTosbwoN8koMbEYSx54aFAVLddWsbksjwg7',
  ZEUS:    'ZEUS1aR7aX8DFFJf5QjWj2ftDDdNTroMNGo8YoQm3Gq',

  // Memecoins
  BONK:    'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263',
  WIF:     'EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm',
  POPCAT:  '7GCihgDB8fe6KNjn2MYtkzZcRjQy3t9GHdC8uHYmW2hr',
  BOME:    'ukHH6c7mMyiWCf1b9pnWe25TSpkDDt3H5pQZgZ74J82',
  MEW:     'MEW1gQWJ3nEXg2qgERiKu7FAFj79PHvQVREQUzScPP5',
  SLERF:   '7BgBvyjrZX1YKz4oh9mjb8ZScatkkwb8DzFx7LoiVkM3',
  MYRO:    'HhJpBhRRn4g56VsyLuT8DL5Bv31HkXqsrahTTUCZeZg4',

  // $PURCH — set NEXT_PUBLIC_PURCH_TOKEN_MINT in .env.local
  ...(process.env.NEXT_PUBLIC_PURCH_TOKEN_MINT
    ? { PURCH: process.env.NEXT_PUBLIC_PURCH_TOKEN_MINT }
    : {}),
};

// Reverse map: mint → symbol (for display)
const MINT_TO_SYMBOL: Record<string, string> = Object.fromEntries(
  Object.entries(TOKEN_MINTS).map(([sym, mint]) => [mint, sym])
);

function isMintAddress(s: string) {
  return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(s);
}

const handler = withPurchPayment({
  price: 0.001,
  description: 'Solana token price feed powered by Jupiter. Supports 20+ tokens by symbol or raw mint address.',
  skillId: 'solana-price',
})(async (req: NextRequest) => {
  const { searchParams } = new URL(req.url);
  const raw = (searchParams.get('token') || 'SOL').trim();

  // Resolve to a mint address
  let mint: string;
  let displaySymbol: string;

  if (isMintAddress(raw)) {
    // Caller passed a raw mint address — use it directly
    mint = raw;
    displaySymbol = MINT_TO_SYMBOL[mint] || raw.slice(0, 6) + '…';
  } else {
    const sym = raw.toUpperCase();
    const resolved = TOKEN_MINTS[sym];
    if (!resolved) {
      const supported = Object.keys(TOKEN_MINTS).join(', ');
      throw new Error(
        `Unknown token: "${raw}". Pass a symbol (${supported}) or a raw Solana mint address.`
      );
    }
    mint = resolved;
    displaySymbol = sym;
  }

  // ── Jupiter Price API v2 ──────────────────────────────────────────────────
  const jupUrl = `https://api.jup.ag/price/v2?ids=${mint}&showExtraInfo=true`;
  const jupRes = await fetch(jupUrl, {
    headers: { Accept: 'application/json' },
    signal: AbortSignal.timeout(8_000),
  });

  if (!jupRes.ok) throw new Error(`Jupiter API error: ${jupRes.status}`);
  const jupData = await jupRes.json();
  const tokenData = jupData?.data?.[mint];

  if (!tokenData || !tokenData.price) {
    throw new Error(
      `No price found for ${displaySymbol} (${mint}). Token may have no liquidity on Jupiter.`
    );
  }

  const price = parseFloat(tokenData.price);
  const extraInfo = tokenData.extraInfo || {};
  const change24h = extraInfo.priceChange24h ?? null;
  const buyPressure  = extraInfo.buyPressure  ?? null;

  return {
    token:       displaySymbol,
    mint,
    price,
    change24h,
    buyPressure,
    confidence:  tokenData.type ?? 'derivedPrice',
    fetchedAt:   new Date().toISOString(),
  };
});

export { handler as GET };
