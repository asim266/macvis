---
name: Solidity + Foundry
description: Write, test, and deploy smart contracts with Foundry.
when_to_use: Writing, testing, or deploying Ethereum/EVM smart contracts.
icon: ⟠
---

# Solidity + Foundry

## Setup
- Install: `curl -L https://foundry.paradigm.xyz | bash && foundryup`.
- New project: `forge init <name>` in the projects dir. Layout: `src/`, `test/`, `script/`.

## Writing contracts
- Pin a compiler: `pragma solidity 0.8.24;`.
- Use OpenZeppelin for ERC20/721/access control: `forge install OpenZeppelin/openzeppelin-contracts`.
- Checks-Effects-Interactions order; guard with `ReentrancyGuard` on external calls.
- `require`/custom errors for validation; emit events on state changes.

## Testing (this is mandatory)
- Write `test/<Name>.t.sol` with `forge-std/Test.sol`.
- `forge test -vvv`. Add fuzz tests (`function testFuzz_...(uint256 x)`).
- Check coverage: `forge coverage`.

## Deploy SAFELY
- **Testnet first** (Sepolia). Never deploy mainnet without explicit user confirmation.
- Use a `script/Deploy.s.sol` + `forge script ... --rpc-url $RPC --broadcast`.
- Read the private key from env (`$PRIVATE_KEY`), never hardcode. See the wallet-safety skill.
- Verify on Etherscan with `$ETHERSCAN_API_KEY`.

## Security checklist
- No `tx.origin` auth, no unchecked external calls, no unbounded loops, integer-overflow safe (0.8+), access-controlled admin fns.
