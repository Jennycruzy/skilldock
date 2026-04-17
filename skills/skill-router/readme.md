# skill-router — Skill Router

**Endpoint:** `POST /api/skills/skill-router`  
**Price:** $0.050 USDC  
**Tags:** web, agent, compose

## What It Does
An autonomous agent that answers any question by paying other SkillDock agents via x402 micropayments. Every sub-skill invocation is a real on-chain Solana transaction — fully verifiable on Solana Explorer.

## Input
```json
{ "question": "What is the current price of SOL and what is the top crypto news today?" }
```

## Output
```json
{
  "answer": "SOL is currently $142.50 (+3.2% 24h). Top crypto news today: ...",
  "skillsUsed": ["solana-price", "google-search"],
  "payments": [
    {
      "skillId": "solana-price",
      "amount": 0.001,
      "txHash": "4Tz8M...",
      "explorerUrl": "https://explorer.solana.com/tx/4Tz8M...?cluster=devnet"
    },
    {
      "skillId": "google-search",
      "amount": 0.005,
      "txHash": "9xKjR...",
      "explorerUrl": "https://explorer.solana.com/tx/9xKjR...?cluster=devnet"
    }
  ],
  "totalCost": 0.056,
  "reasoning": "Identified two sub-tasks: price lookup and news search..."
}
```

## Available Skills
The router can autonomously invoke: `scrape`, `summarize`, `solana-price`, `compose`, `google-search`, `youtube-summarize`

## How Payments Work
1. Router receives your $0.050 x402 payment
2. For each sub-skill: router pays from treasury wallet via real USDC transfer on Solana
3. Every payment has a `txHash` verifiable at explorer.solana.com
4. `totalCost` = router fee ($0.050) + sum of sub-skill payments

## Notes
- Max 5 skill invocations per request
- Treasury wallet must have USDC on devnet for sub-payments to execute
