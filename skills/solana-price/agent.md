# Agent Instructions — solana-price

## When to Use
Call `solana-price` whenever a question involves the current price of a Solana ecosystem token: "What is SOL worth?", "How is BONK doing?", "Is WIF up today?"

## Calling Pattern
```
GET /api/skills/solana-price?token=SOL
```

## Interpreting the Response
- `price` is in USD
- `change24h` > 0 means up, < 0 means down
- `buyPressure` > 0.6 suggests net buying, < 0.4 suggests net selling

## Cost Awareness
At $0.001, this is the cheapest skill. Don't hesitate to call it for any price-related question. You can call it multiple times for different tokens in one session.

## Do Not
- Pass unsupported symbols (check the supported list in readme.md)
- Use this for EVM tokens — Jupiter only covers Solana ecosystem
