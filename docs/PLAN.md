# Sovra — Development Plan

## Architecture Overview

```
┌─────────────┐     ┌──────────────────────┐     ┌─────────────────┐
│  Telegram   │────▶│   Next.js App Router  │────▶│   PostgreSQL    │
│  Bot (grammY)│     │  (app/api/ + app/)   │     │   (Drizzle ORM) │
└─────────────┘     └──────────┬───────────┘     └─────────────────┘
                               │
                    ┌──────────▼───────────┐
                    │    Smart Contracts   │
                    │    (contracts/)      │
                    │    Hardhat + Solidity│
                    └──────────────────────┘
```

## Tech Stack

| Layer            | Technology                                    |
| ---------------- | --------------------------------------------- |
| Frontend         | Next.js 16 (App Router), React 19, Tailwind 4 |
| Backend API      | Next.js `app/api/` routes                      |
| Database         | PostgreSQL + Drizzle ORM                       |
| Auth             | JWT / API Keys                                 |
| Blockchain       | Solidity (ERC-7710), Hardhat, Viem, Wagmi     |
| Telegram Bot     | grammY (TypeScript)                            |
| Payments         | x402 via Coinbase AgentKit                     |
| AI Agents        | Vercel AI SDK                                  |
| Validation       | Zod                                            |
| Containerization | Docker Compose                                  |

---

## Key Dependencies

```json
{
  "drizzle-orm": "latest",
  "drizzle-kit": "latest",
  "pg": "latest",
  "zod": "latest",
  "ai": "latest",
  "@ai-sdk/openai": "latest",
  "grammy": "latest",
  "@grammyjs/conversations": "latest",
  "@coinbase/agentkit": "latest",
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

**Goal:** Project siap coding — environment, database, ORM.

| Item                | Detail                                                                      |
| ------------------- | --------------------------------------------------------------------------- |
| Environment          | `.env.local` (Next.js), `contracts/.env` (RPC/private key)                  |
| Database             | PostgreSQL via Docker Compose                                               |
| ORM Setup            | Drizzle Kit (`drizzle.config.ts`), schema di `lib/db/schema/`               |
| Project Structure    | Monolith Next.js + `contracts/` + `bot/`                                    |
| Docker Compose       | PostgreSQL + pgAdmin (optional)                                             |

**Deliverable:**
- `.env.template` ready
- `docker-compose.yml` running
- Drizzle configured, `users` table initial migration

---

## Phase 1: Smart Contracts (`contracts/`)

**Goal:** Smart contract ERC-7710 siap kompilasi. Deploy dilakukan user secara terpisah.

| Item           | Detail                                                                                                               |
| -------------- | -------------------------------------------------------------------------------------------------------------------- |
| Framework      | Hardhat + TypeScript, Solidity `^0.8.28`                                                                               |
| Contracts      | `CaveatEnforcer.sol` — delegation caveat logic, `DelegationRegistry.sol` — on-chain delegation registry                  |
| Scripts        | Deploy script ke Base Sepolia (`scripts/deploy.ts`)                                                                    |
| Tests          | Unit test caveat validation, delegation lifecycle                                                                     |

**Deliverable:**
- Semua kontrak kompil tanpa error
- Unit test passing
- ABI + address siap digunakan backend

---

## Phase 2: Next.js API Backend

**Goal:** CRUD endpoint consent + delegasi via Next.js API routes, Drizzle ORM.

| Item               | Detail                                                                                                                     |
| ------------------ | -------------------------------------------------------------------------------------------------------------------------- |
| Routes             | `app/api/consent/` — POST, GET, PUT, DELETE; `app/api/delegation/` — POST, GET; `app/api/health/`                             |
| Database Schema    | `consents` (id, patientDid, researcherDid, caveatRef, status, createdAt), `delegations` (id, delegator, delegate, caveatHash, chainId, txHash, status) |
| Database Access    | Drizzle client via `lib/db/index.ts`                                                                                         |
| Auth Middleware     | JWT / API key untuk researcher vs patient vs admin                                                                          |
| Validation         | Zod schemas untuk request body                                                                                              |

**Deliverable:**
- Semua API endpoint berfungsi
- Database terhubung via Drizzle
- Swagger / Hoppscotch collection

---

## Phase 3: Agent Framework (`lib/agents/`)

**Goal:** 4 AI agent untuk orchestrate consent flow.

| Agent                           | Role                                                                                     |
| ------------------------------- | ---------------------------------------------------------------------------------------- |
| Patient Consent Agent           | Jawab pertanyaan pasien, verifikasi identitas, kelola preferensi consent                 |
| Researcher/Requester Agent      | Terjemahkan research request → caveat spesifik, build delegation payload (ERC-7710)      |
| Sub-Investigator Agent          | Konfirmasi delegasi aktif, log aktivitas akses data                                      |
| Venice Risk Agent               | Kalkulasi risk score (caveat match, data sensitivity, researcher reputation)             |

**Deliverable:**
- 4 agent class di `lib/agents/`
- Masing-masing dengan system prompt + tool definitions

---

## Phase 4: Telegram Bot (`bot/`)

**Goal:** Bot Telegram (TypeScript/grammY) untuk onboarding pasien + notifikasi.

| Item            | Detail                                                                                                |
| --------------- | ----------------------------------------------------------------------------------------------------- |
| Framework       | grammY + `@grammyjs/conversations` (FSM multi-step)                                                     |
| FSM Flow        | Register → Connect wallet → Set consent preferences → Done                                             |
| Commands        | `/start`, `/onboard`, `/status`, `/earnings`, `/help`                                                    |
| Integration     | HTTP ke Next.js API routes (`/api/consent/`, `/api/delegation/`)                                         |
| Notifications   | Consent request masuk → notif pasien; Delegation approved → notif researcher                          |

**Deliverable:**
- Bot berfungsi local
- Onboarding FSM flow lengkap

---

## Phase 5: x402 Payment Layer

**Goal:** Researcher membayar USDC on Base via x402 protocol untuk akses data.

| Item            | Detail                                                                                |
| --------------- | ------------------------------------------------------------------------------------- |
| Framework       | Coinbase AgentKit `x402ActionProvider` (TypeScript)                                   |
| Endpoint        | `app/api/x402/` — handle HTTP 402, verifikasi pembayaran, return data                  |
| Config          | `registeredServices`, `maxPaymentUsdc`, Base Mainnet/Testnet                              |

**Deliverable:**
- Researcher bisa request data dengan membayar USDC via x402 flow

---

## Phase 6: Researcher Dashboard

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

## Phase 7: Integration & End-to-End Flow

**Goal:** Satu flow lengkap end-to-end berfungsi.

| Item          | Detail                                                                                                                                                                               |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Demo Flow     | Onboard via bot → Consent created → Researcher requests delegation via dashboard → Delegation signed on-chain → Sub-investigator verifies → Venice Risk scores request              |
| E2E Testing   | Playwright / Vitest integration test untuk critical path                                                                                                                               |

**Deliverable:**
- Demo flow end-to-end
- Integration test passing

---

## Phase 8: Polish & P1 Features

**Goal:** Fitur tambahan + polish UX.

| Item        | Detail                                                                                           |
| ----------- | ------------------------------------------------------------------------------------------------ |
| Features    | Patient mobile-first UI, delegation revoke, earnings dashboard (patient), notification history    |
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
│   │   ├── CaveatEnforcer.sol
│   │   └── DelegationRegistry.sol
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
