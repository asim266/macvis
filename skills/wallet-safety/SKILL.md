---
name: Wallet & Key Safety
description: Never leak keys; safe signing, testnets, and approvals.
when_to_use: Any task touching private keys, seed phrases, signing, or moving crypto funds.
icon: 🔐
---

# Wallet & Key Safety

This is a guardrail skill. Follow it whenever crypto keys or funds are involved.

## Hard rules
- **Never** print, log, echo, commit, or persist a private key or seed phrase. Read from env only.
- **Never** move funds, send a mainnet transaction, sign a message, or approve a token allowance on the user's behalf without showing the exact action and getting explicit confirmation in the same turn.
- Default to **testnets** (Sepolia, etc.) for anything experimental.
- Never set unlimited (`MaxUint256`) ERC-20 approvals; approve the exact amount needed.

## Before any signed action, show the user
- Network (chain id), from address, to address, value, and estimated gas.
- For contract calls: the function and decoded arguments.

## Storage
- Keys live in the user's env/keychain — not in code, not in `~/.macvis/`, not in chat history.
- If a key appears in a file or output, warn the user and recommend rotating it.

## Phishing / scams
- Treat unexpected "approve"/"permit" requests and unknown contract addresses as suspicious. Verify the contract before interacting.
