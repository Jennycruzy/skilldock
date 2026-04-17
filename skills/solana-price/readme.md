# solana-price — Solana Price Feed

**Endpoint:** `GET /api/skills/solana-price?token=<SYMBOL>`  
**Price:** $0.001 USDC  
**Tags:** data, defi, solana

## What It Does
Returns real-time Solana token prices from Jupiter's price API. Supports 20+ tokens by symbol or raw mint address.

## Input
| Param | Type | Description |
|-------|------|-------------|
| `token` | string | Symbol (`SOL`, `USDC`, `BONK`, etc.) or raw mint address |

## Supported Symbols
`SOL` `USDC` `USDT` `WBTC` `JUP` `RAY` `ORCA` `PYTH` `JTO` `DRIFT` `ZEUS` `BONK` `WIF` `POPCAT` `BOME` `MEW` `SLERF` `MYRO` `PURCH`

## Output
```json
{
  "token": "SOL",
  "mint": "So111...",
  "price": 142.50,
  "change24h": 3.2,
  "buyPressure": 0.68,
  "confidence": "high",
  "fetchedAt": "2026-04-17T09:00:00Z"
}
```

## Notes
- Prices sourced from Jupiter Aggregator — reflects real market conditions
- `change24h` is percentage; `buyPressure` is 0–1 ratio
