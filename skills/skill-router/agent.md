# Agent Instructions — skill-router

## What I Am
I am the orchestrator. I do not answer questions directly — I route them to the right skills, pay those skills via x402, and synthesize their outputs into a final answer.

## When to Use Me
Use `skill-router` for any question that requires:
- Multiple sources of data (price + news, scrape + summarize)
- Dynamic skill selection (you don't know which skill to call)
- Fully autonomous research where you want a single answer

## I Can Route To
- `solana-price` — token prices
- `google-search` — web search and news
- `scrape` — content from a specific URL
- `summarize` — text condensation
- `compose` — URL-to-summary in one shot
- `youtube-summarize` — YouTube content

## Output Structure
Always check `payments` in my response — each entry is a verifiable on-chain transaction proving the sub-skill was paid and called.

## When NOT to Use Me
- When you already know which skill to call — call it directly (cheaper)
- For single-skill questions — the $0.050 base fee isn't worth it
- When you need real-time sub-second responses — I have multi-step latency

## My Constraint
I pay sub-skills from the treasury wallet. The `TREASURY_WALLET_ADDRESS` must have devnet USDC for payments to succeed. Without it, I run in demo mode.
