# Sovra

> *Your data, your consent, your income.*

Sovra adalah **consent layer terdesentralisasi** yang duduk di antara institusi penyimpan data medis dan pihak yang meminta akses data tersebut.

Pasien (pemilik data) dapat memberikan, mengelola, dan mencabut consent akses data medis mereka secara granular melalui Telegram bot, serta menerima kompensasi otomatis (USDC micropayment via x402) setiap kali ada pihak yang meminta akses data mereka.

Sovra **tidak menyimpan data medis**. Sovra hanya menerbitkan **consent proof** (ERC-7710 delegation) yang dapat diverifikasi on-chain. Institusi menggunakan proof tersebut sebagai gerbang sebelum melepas data ke pihak peminta.

---

## Architecture

```
[Data Requester / Researcher Agent]
           │
           │ 1. Request consent + x402 payment
           ▼
    [SOVRA LAYER]
    ┌─────────────────────────────────┐
    │  Patient Consent Agent          │
    │  ↕ consult                      │
    │  Venice Risk Agent              │
    │  ↓ jika approved                │
    │  ERC-7710 Delegation (proof)    │
    │  ↓ relay gasless                │
    │  1Shot API                      │
    └─────────────────────────────────┘
           │
           │ 2. Consent proof
           ▼
    [INSTITUSI PENYIMPAN DATA]
    Verifikasi proof on-chain
    → Release data ke requester
           │
           ▼
    [PASIEN] ← terima USDC otomatis
```

## Tech Stack

| Layer              | Tech                                        |
| ------------------ | ------------------------------------------- |
| Frontend           | Next.js 16, React 19, Tailwind CSS v4       |
| Patient Interface  | Telegram Bot                                |
| Smart Account      | MetaMask Smart Accounts Kit (ERC-4337)      |
| Delegation         | ERC-7710                                    |
| Payment            | x402 (Coinbase) + USDC                      |
| AI Risk Assessment | Venice AI                                   |
| Blockchain Client  | Viem                                        |
| Network            | Base (L2)                                   |
| Backend API        | Node.js + Express                           |
| Database           | PostgreSQL, Redis                           |

## Quick Start

```bash
npm run dev
```

Buka [http://localhost:3000](http://localhost:3000).

## Project Structure

```
sovra-app/
├── app/          # Next.js App Router
├── docs/         # Dokumentasi
├── public/       # Static assets
├── AGENTS.md     # Agent configuration
└── package.json
```

## License

MIT © 2026 Sovra
