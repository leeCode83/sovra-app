# Sovra Smart Contracts

ERC-7710-compliant data consent enforcer for the Sovra decentralized research platform.

## Contracts

| Contract | Lines | Description |
|----------|-------|-------------|
| `ICaveatEnforcer.sol` | 27 | ERC-7710 caveat enforcer interface |
| `SovraConsentEnforcer.sol` | 111 | Data consent enforcer with revocation & usage tracking |

### SovraConsentEnforcer

Validates data access delegations against on-chain consent attestations.

**Terms schema** (abi-encoded):
- `consentId` (bytes32) — keccak256 of the off-chain consent record
- `dataScope` (string) — comma-separated allowed data types
- `expiresAt` (uint48) — unix timestamp (0 = never)
- `maxUses` (uint32) — maximum redeems (0 = unlimited)

**Hooks:**
- `beforeAllHook` — checks consent not revoked, not expired
- `beforeHook` — validates redeemer address is non-zero
- `afterHook` — increments usage counter, enforces maxUses
- `afterAllHook` — no-op

---

## Deploy

### Prerequisites

```bash
cd contracts
npm install
```

Copy `.env.example` to `.env` and fill in your private key and RPC URL.

```bash
cp .env.example .env
```

### Hardhat

```bash
# Compile
npx hardhat compile

# Test
npx hardhat test

# Deploy to Base Sepolia
PRIVATE_KEY=0x... npx hardhat run scripts/deploy.ts --network baseSepolia

# Deploy to Hardhat local node
npx hardhat run scripts/deploy.ts --network localhost
```

### Remix

1. Open `contracts/contracts/SovraConsentEnforcer.sol` and `contracts/contracts/interfaces/ICaveatEnforcer.sol` in Remix
2. Install `@openzeppelin/contracts` via Remix's Solidity plugin (or use the NPM import)
3. Compile with Solidity 0.8.28
4. Deploy with constructor arg `_initialOwner` = your address
5. Network: Base Sepolia (chain ID 84532) or your preferred EVM chain

### Foundry

Foundry setup is **not** included in this repo. To deploy with Foundry:

```bash
# Initialize Foundry in the contracts directory
forge init --force

# Import contracts
cp -r contracts/* src/

# Install dependencies
forge install OpenZeppelin/openzeppelin-contracts

# Build
forge build

# Deploy
PRIVATE_KEY=0x... forge script script/Deploy.s.sol \
  --rpc-url https://sepolia.base.org \
  --broadcast \
  --verify
```

---

## Verify on Base Sepolia

After deploying with Hardhat, verify the contract:

```bash
npx hardhat verify --network baseSepolia <DEPLOYED_ADDRESS> <INITIAL_OWNER_ADDRESS>
```

---

## Integration

The enforcer is used as an ERC-7710 caveat within a Delegation struct:

```typescript
const delegation = {
  delegate: researcherAddress,
  delegator: patientAddress,
  authority: "0x...",
  caveats: [{
    enforcer: sovraConsentEnforcerAddress,
    terms: abiCoder.encode(
      ["bytes32", "string", "uint48", "uint32"],
      [consentId, dataScope, expiry, maxUses]
    ),
    args: abiCoder.encode(
      ["address", "string"],
      [targetContract, "/api/v1/patient-data"]
    ),
  }],
  salt: randomBytes(32),
  signature: "0x...",
};
```
