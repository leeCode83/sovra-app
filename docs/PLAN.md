# Sovra — Development Plan

## Architecture Overview

```
┌─────────────┐     ┌──────────────────────┐     ┌─────────────────┐
│  Telegram   │────▶│   Next.js App Router  │────▶│   PostgreSQL    │
│  Bot (grammY)│     │  (app/api/ + app/)   │     │   (Drizzle ORM) │
└─────────────┘     └──────────┬───────────┘     └─────────────────┘
                               │                        │
                               │                        ▼
                    ┌──────────▼───────────┐    ┌──────────────┐
                    │    Smart Contracts   │    │   Redis      │
                    │    (contracts/)      │    │  (FSM State) │
                    │    Hardhat + Solidity│    └──────────────┘
                    └──────────────────────┘
```

## Tech Stack

| Layer               | Technology                                        |
| ------------------- | ------------------------------------------------- |
| Frontend            | Next.js 16 (App Router), React 19, Tailwind 4     |
| Backend API         | Next.js `app/api/` routes                          |
| Database            | PostgreSQL + Drizzle ORM                           |
| Cache / FSM         | Redis (Telegram bot conversation state)           |
| Auth                | JWT / API Keys                                     |
| Blockchain          | Solidity (ERC-7710), Hardhat, Viem, Wagmi         |
| Smart Account       | MetaMask Smart Accounts Kit (ERC-4337)             |
| Gas Abstraction     | 1Shot API (gasless relay)                          |
| Permission Request  | ERC-7715                                           |
| Telegram Bot        | grammY (TypeScript)                                |
| Payments            | x402 via Coinbase AgentKit                         |
| AI Agents           | Vercel AI SDK + Venice AI API                      |
| Validation          | Zod                                                |
| Containerization    | Docker Compose                                     |

---

## Key Dependencies

```json
{
  "drizzle-orm": "latest",
  "drizzle-kit": "latest",
  "pg": "latest",
  "ioredis": "latest",
  "zod": "latest",
  "ai": "latest",
  "@ai-sdk/openai": "latest",
  "grammy": "latest",
  "@grammyjs/conversations": "latest",
  "@coinbase/agentkit": "latest",
  "@metamask/smart-accounts-kit": "latest",
  "@rainbow-me/rainbowkit": "latest",
  "wagmi": "latest",
  "viem": "latest",
  "hardhat": "latest",
  "@nomicfoundation/hardhat-toolbox": "latest",
  "@openzeppelin/contracts": "latest"
}
```

---

## Phase 0: Foundation

**Goal:** Project siap coding — environment, database, ORM, cache.

| Item                | Detail                                                                      |
| ------------------- | --------------------------------------------------------------------------- |
| Environment          | `.env.local` (Next.js), `contracts/.env` (RPC/private key)                  |
| Database             | PostgreSQL via Docker Compose                                               |
| Cache                | Redis via Docker Compose (untuk FSM state Telegram bot)                    |
| ORM Setup            | Drizzle Kit (`drizzle.config.ts`), schema di `lib/db/schema/`               |
| Project Structure    | Monolith Next.js + `contracts/` + `bot/`                                    |
| Docker Compose       | PostgreSQL + Redis                                                          |

**Deliverable:**
- `.env.template` ready
- `docker-compose.yml` running (PostgreSQL + Redis)
- Drizzle configured, `users` table initial migration

---

## Phase 1: Smart Contracts (`contracts/`)

**Goal:** Smart contract ERC-7710 siap kompilasi. Deploy dilakukan user secara terpisah.

| Item           | Detail                                                                                                               |
| -------------- | -------------------------------------------------------------------------------------------------------------------- |
| Framework      | Hardhat + TypeScript, Solidity `^0.8.28`                                                                               |
| Contracts      | `SovraConsentEnforcer.sol` — ERC-7710 caveat enforcer dengan consent scope, institution validation, patient revoke     |
| Interfaces     | `ICaveatEnforcer.sol` — ERC-7710 interface (beforeAllHook, beforeHook, afterHook, afterAllHook)                      |
| Scripts        | Deploy script ke Base Sepolia (`scripts/deploy.ts`)                                                                    |
| Tests          | Unit test caveat validation, revoke, institution authorization                                                        |

**Deliverable:**
- Semua kontrak kompil tanpa error
- Unit test passing
- ABI + address siap digunakan backend

---

## Phase 2: Backend API + x402 + 1Shot Relay

**Goal:** CRUD endpoint consent + delegasi, x402 payment gate, 1Shot API relay, Smart Account integration, verification endpoint.

| Item                | Detail                                                                                                                                  |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| Routes              | `app/api/consent/` — POST, GET, PUT, DELETE; `app/api/delegation/` — POST, GET; `app/api/health/`; `app/api/verify/:hash` — GET; `app/api/x402/` — handle payment |
| Database Schema     | `consents`, `delegations`, `payments` tables                                                                                            |
| Database Access     | Drizzle client via `lib/db/index.ts`                                                                                                    |
| Auth Middleware     | JWT / API key untuk researcher vs patient vs admin                                                                                     |
| Validation          | Zod schemas untuk request body                                                                                                          |
| x402 Payment        | HTTP 402 response + verification + USDC settlement via Coinbase AgentKit                                                               |
| 1Shot API Relay     | Gasless transaction relay untuk ERC-7710 delegation + ERC-7715 permission requests (pasien tidak bayar gas)                            |
| Smart Account       | MetaMask Smart Accounts Kit — deploy smart account saat onboarding, terima USDC, sign delegation                                       |
| Verification        | `GET /api/verify/:delegation_hash` — validasi status on-chain, return consent status untuk institusi                                   |

**Deliverable:**
- Semua API endpoint berfungsi
- x402 payment gate bisa menerima + verify payment
- 1Shot API relay untuk gasless transaction
- Smart Account deploy flow via API
- Verification endpoint siap dipakai institusi

---

## Phase 3: Agent Framework (`lib/agents/`)

**Goal:** 4 AI agent untuk orchestrate consent flow (A2A).

| Agent                           | Role                                                                                     |
| ------------------------------- | ---------------------------------------------------------------------------------------- |
| Patient Consent Agent           | Jawab pertanyaan pasien, verifikasi identitas, kelola preferensi consent                 |
| Researcher/Requester Agent      | Terjemahkan research request → caveat spesifik, build delegation payload (ERC-7710)      |
| Sub-Investigator Agent          | Redeem delegation aktif, log aktivitas akses data                                        |
| Venice Risk Agent               | Kalkulasi risk score (caveat match, data sensitivity, researcher reputation)             |

**A2A Flow:**
```
1. RC Agent → Patient Agent: request consent + x402 payment
2. Patient Agent → Venice Risk Agent: assess risk
3. Venice Risk Agent → Patient Agent: { risk: low|medium|high }
4a. Low → Patient Agent auto-approve → ERC-7710 delegation via 1Shot
4b. Medium → escalate ke pasien via Telegram
4c. High → auto-reject + refund x402
5. Patient Agent → Sub-Investigator Agent: delegation proof via redelegation
6. Sub-Investigator Agent: redeem → bawa proof ke institusi
```

**Deliverable:**
- 4 agent class di `lib/agents/`
- Masing-masing dengan system prompt + tool definitions
- Venice AI integration untuk risk scoring

---

## Phase 4: Telegram Bot (`bot/`)

**Goal:** Bot Telegram (TypeScript/grammY) untuk onboarding pasien + notifikasi.

| Item            | Detail                                                                                                |
| --------------- | ----------------------------------------------------------------------------------------------------- |
| Framework       | grammY + `@grammyjs/conversations` (FSM multi-step)                                                     |
| FSM Flow        | Register → Deploy Smart Account (via MetaMask Smart Accounts Kit) → Set consent preferences → Done     |
| Commands        | `/start`, `/onboard`, `/status`, `/earnings`, `/withdraw`, `/help`                                       |
| Integration     | HTTP ke Next.js API routes (`/api/consent/`, `/api/delegation/`, `/api/x402/`)                           |
| Notifications   | Consent request masuk → notif pasien; Delegation approved → notif researcher                          |
| Earnings        | Lihat total earnings, riwayat pembayaran, withdraw USDC ke wallet                                      |

**Deliverable:**
- Bot berfungsi local
- Onboarding FSM flow lengkap (dengan Smart Account deploy)

---

## Phase 5: Researcher Dashboard

**Goal:** Next.js dashboard untuk researcher.

| Item                | Detail                                                                                              |
| ------------------- | --------------------------------------------------------------------------------------------------- |
| Pages               | `/dashboard` — overview + stats, `/dashboard/requests` — list + create, `/dashboard/delegations`    |
| Components          | Wallet connect (RainbowKit/Wagmi), delegation form, request status table, earnings chart             |
| API Integration     | Fetch dari `/api/consent/`, `/api/delegation/`                                                          |

**Deliverable:**
- Dashboard researcher fungsional
- Wallet connect + delegation management

---

## Phase 6: Integration & End-to-End Flow

**Goal:** Satu flow lengkap end-to-end berfungsi.

| Item          | Detail                                                                                                                                                                               |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Demo Flow     | Onboard via bot → Smart Account deploy → Consent request + x402 payment → Venice assess → Patient Agent approve → ERC-7710 delegation via 1Shot → Sub-investigator verifies → Revoke |
| E2E Testing   | Playwright / Vitest integration test untuk critical path                                                                                                                               |

**Deliverable:**
- Demo flow end-to-end sesuai PRD demo script (2 menit)
- Integration test passing

---

## Phase 7: P1 Features

**Goal:** Fitur P1 dari PRD — off-chain certificate, earnings dashboard, withdraw.

| Item                  | Detail                                                                                 |
| --------------------- | -------------------------------------------------------------------------------------- |
| Off-Chain Certificate | Generate signed JSON certificate (consent_id, delegation_hash, scope, expiration)       |
| Earnings Dashboard    | Pasien lihat total earnings + riwayat pembayaran di Telegram                            |
| USDC Withdraw         | Pasien withdraw USDC ke wallet eksternal dari Telegram                                  |

---

## Phase 8: Polish & Extras

**Goal:** Fitur tambahan + polish UX.

| Item        | Detail                                                                                           |
| ----------- | ------------------------------------------------------------------------------------------------ |
| Features    | Patient mobile-first UI, notification history, consent history export                             |
| Polish      | Loading states, error handling, skeleton UI, responsive layout                                   |

---

## Project Structure (Target)

```
sovra-app/
├── app/
│   ├── api/
│   │   ├── consent/
│   │   │   └── route.ts
│   │   ├── delegation/
│   │   │   └── route.ts
│   │   ├── health/
│   │   │   └── route.ts
│   │   ├── verify/
│   │   │   └── [hash]/
│   │   │       └── route.ts
│   │   └── x402/
│   │       └── route.ts
│   ├── dashboard/
│   │   ├── page.tsx
│   │   ├── requests/
│   │   │   └── page.tsx
│   │   └── delegations/
│   │       └── page.tsx
│   ├── layout.tsx
│   └── page.tsx
├── bot/
│   ├── src/
│   │   ├── index.ts
│   │   ├── conversations/
│   │   └── commands/
│   ├── package.json
│   └── tsconfig.json
├── contracts/
│   ├── contracts/
│   │   ├── interfaces/
│   │   │   └── ICaveatEnforcer.sol
│   │   └── SovraConsentEnforcer.sol
│   ├── scripts/
│   │   └── deploy.ts
│   ├── test/
│   ├── hardhat.config.ts
│   └── package.json
├── lib/
│   ├── agents/
│   │   ├── patient-consent.ts
│   │   ├── researcher.ts
│   │   ├── sub-investigator.ts
│   │   └── venice-risk.ts
│   ├── db/
│   │   ├── index.ts
│   │   └── schema/
│   │       └── index.ts
│   └── utils/
├── drizzle.config.ts
├── docker-compose.yml
├── package.json
└── next.config.ts
```
