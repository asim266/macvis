---
name: ethers.js / web3
description: Read chains, send txns, interact with contracts from JS.
when_to_use: Reading on-chain data, prices, balances, or sending transactions from a script/app.
icon: 🔗
---

# ethers.js / web3

## Setup
- `npm install ethers` (v6). Use a provider from an RPC key: Alchemy/Infura (`$ALCHEMY_API_KEY`).

```js
import { JsonRpcProvider, Contract, formatUnits } from 'ethers'
const provider = new JsonRpcProvider(`https://eth-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`)
```

## Read (safe, free)
- `provider.getBalance(addr)`, `provider.getBlockNumber()`.
- Contract reads: `new Contract(addr, abi, provider)` then call view fns.
- Token prices: CoinGecko API with `$COINGECKO_API_KEY` (no signing needed).

## Write (requires a signer — be careful)
- Only with an explicit user-provided key via env, on the intended network.
- Always `estimateGas` and show the user the tx (to, value, gas) BEFORE sending.
- Prefer testnets. Confirm mainnet sends with the user every time.

## Don't
- Never log or persist private keys/seed phrases. Never auto-approve unlimited token allowances.
