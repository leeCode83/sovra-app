# Sovra — Product Requirements Document (PRD)
### Version 1.0 | May 2026 | Hackathon MVP

---

## Table of Contents

1. [Overview](#1-overview)
2. [Problem Statement](#2-problem-statement)
3. [Solution](#3-solution)
4. [Target Users](#4-target-users)
5. [User Stories](#5-user-stories)
6. [System Architecture](#6-system-architecture)
7. [Core Features](#7-core-features)
8. [Agent Architecture (A2A)](#8-agent-architecture-a2a)
9. [Tech Stack](#9-tech-stack)
10. [Data & Privacy Model](#10-data--privacy-model)
11. [Consent Proof Format](#11-consent-proof-format)
12. [Business Model](#12-business-model)
13. [Hackathon Scope (MVP)](#13-hackathon-scope-mvp)
14. [Out of Scope (Post-Hackathon)](#14-out-of-scope-post-hackathon)
15. [Success Metrics](#15-success-metrics)
16. [Glossary](#16-glossary)

---

## 1. Overview

**Sovra** adalah consent layer terdesentralisasi yang duduk di antara institusi penyimpan data medis dan pihak yang meminta akses data tersebut.

Sovra memungkinkan pasien (pemilik data) untuk:
- Memberikan, mengelola, dan mencabut consent akses data medis mereka secara granular
- Menerima kompensasi otomatis (micropayment USDC via x402) setiap kali ada pihak yang meminta consent akses data mereka
- Mendelegasikan pengelolaan consent ke autonomous agent yang bekerja atas nama mereka

Sovra **tidak menyimpan data medis**. Sovra hanya menerbitkan **consent proof** yang dapat diverifikasi on-chain, kemudian institusi menggunakan proof tersebut sebagai gerbang sebelum melepas data ke pihak peminta.

### Tagline
> *"Your data, your consent, your income."*

### Hackathon Context
Sovra dibangun untuk **MetaMask Smart Accounts Kit × 1Shot API Dev Cook-Off**, track **Best Agent-to-Agent Coordination**. Semua komponen utama hackathon (MetaMask Smart Accounts, ERC-7710, 1Shot API, Venice AI, x402) adalah **core** dari sistem, bukan peripheral.

---

## 2. Problem Statement

### Dari Sisi Pasien
- Pasien menandatangani form consent fisik berulang kali (tiap kunjungan, tiap sub-studi, tiap perubahan protokol)
- Pasien tidak tahu siapa saja yang mengakses data medis mereka setelah consent diberikan
- Pasien tidak mendapat kompensasi apapun meskipun data mereka digunakan untuk penelitian komersial
- Tidak ada mekanisme formal yang auditable ketika pasien ingin mencabut consent

### Dari Sisi Institusi Penyimpan Data
- Tidak ada standar digital yang jelas untuk membuktikan consent pasien kepada pihak ketiga
- Risiko compliance tinggi — UU PDP Indonesia (efektif Oktober 2024) mengharuskan consent eksplisit untuk transfer data kesehatan
- Proses manual consent membutuhkan waktu dan sumber daya administratif

### Dari Sisi Researcher / Data Requester
- Proses mendapatkan consent pasien lambat dan tidak scalable
- Tidak ada cara untuk memverifikasi status consent secara real-time
- Sub-investigator harus lewat jalur birokrasi panjang untuk mendapat akses data tambahan

---

## 3. Solution

Sovra bertindak sebagai **consent + monetization middleware layer**:

```
[Data Requester / Researcher Agent]
           │
           │ 1. Request consent + bayar x402
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
           │ 2. Consent proof diterbitkan
           ▼
    [INSTITUSI PENYIMPAN DATA]
    Verifikasi proof on-chain
    → Release data ke requester
    (via channel mereka sendiri)
           │
           ▼
    [PASIEN] ← terima USDC otomatis
```

**Key Insight:** Sovra tidak compete dengan institusi, tidak menyentuh data, dan tidak membutuhkan pasien memahami blockchain.

---

## 4. Target Users

### Primary User: Pasien / Pemilik Data
- Peserta clinical trial di rumah sakit atau universitas
- Tidak perlu paham blockchain
- Interaksi via Telegram bot (familiar, mudah diakses)
- Motivasi utama: kontrol data + income pasif

### Secondary User: Institusi Penyimpan Data
- Rumah sakit, fakultas kedokteran, lab penelitian
- Butuh compliance tool untuk UU PDP
- Motivasi utama: audit trail yang defensible + streamlined consent workflow

### Tertiary User: Data Requester / Researcher
- Principal Investigator, Sub-Investigator, research institution
- Interaksi via dashboard web atau API
- Motivasi utama: akses data lebih cepat, consent terverifikasi

---

## 5. User Stories

### 5.1 Pasien (Budi — Peserta Clinical Trial)

**Setup:**
> Sebagai pasien, saya ingin mendaftarkan diri ke Sovra sekali saja, sehingga selanjutnya agent saya yang mengelola semua permintaan consent atas nama saya.

**Menerima Request Consent:**
> Sebagai pasien, saya ingin mendapat notifikasi via Telegram ketika ada pihak yang meminta akses data saya, beserta informasi: siapa pemintanya, data apa yang diminta, dan berapa USDC yang sudah saya terima — sehingga saya bisa membuat keputusan yang informed.

**Monetisasi:**
> Sebagai pasien, saya ingin menerima USDC secara otomatis setiap kali ada pihak yang meminta consent akses data saya, sehingga saya mendapat kompensasi langsung tanpa perlu melakukan apapun.

**Granular Control:**
> Sebagai pasien, saya ingin bisa memberi consent hanya untuk tipe data tertentu (misal: lab results saja, bukan imaging), sehingga saya tetap punya kontrol granular atas data saya.

**Revoke:**
> Sebagai pasien, saya ingin bisa mencabut consent kapan saja langsung dari Telegram, sehingga saya tidak perlu menghubungi institusi secara manual.

**Riwayat:**
> Sebagai pasien, saya ingin melihat daftar semua consent yang aktif dan sudah dicabut, serta total USDC yang sudah saya terima, sehingga saya punya visibilitas penuh atas data saya.

---

### 5.2 Institusi Penyimpan Data (FK UI / RS Cipto)

**Onboarding:**
> Sebagai institusi, saya ingin mendaftarkan sistem penyimpanan data kami ke Sovra, sehingga kami bisa menjadikan consent proof Sovra sebagai gerbang sebelum melepas data ke pihak ketiga.

**Verifikasi Proof:**
> Sebagai institusi, saya ingin bisa memverifikasi consent proof dari Sovra secara on-chain menggunakan delegation hash, sehingga saya punya bukti hukum yang auditable bahwa pasien telah memberikan consent sebelum data dilepas.

**Compliance Reporting:**
> Sebagai institusi, saya ingin mendapat laporan riwayat consent yang bisa di-export, sehingga saya bisa memenuhi persyaratan audit UU PDP dan BPOM.

**Notifikasi Revoke:**
> Sebagai institusi, saya ingin mendapat notifikasi otomatis ketika seorang pasien mencabut consent, sehingga saya bisa segera menghentikan akses data yang bersangkutan.

---

### 5.3 Data Requester / Researcher (Dr. Rina — Principal Investigator)

**Request Consent:**
> Sebagai researcher, saya ingin mendaftarkan kebutuhan data penelitian saya ke Sovra (tipe data, durasi, scope), sehingga sistem bisa secara otomatis meminta consent ke pasien yang relevan tanpa saya harus menghubungi mereka satu per satu.

**Bayar via x402:**
> Sebagai researcher, saya ingin sistem agent saya membayar consent fee secara otomatis via x402, sehingga proses consent tidak membutuhkan intervensi manual dari saya.

**Terima Consent Proof:**
> Sebagai researcher, saya ingin mendapat consent proof (delegation hash + signed certificate) yang bisa saya bawa ke institusi untuk membuka akses data, sehingga proses akses data lebih cepat dan terstandarisasi.

**Monitor Status:**
> Sebagai researcher, saya ingin melihat status consent real-time (active/revoked/expired) untuk semua peserta penelitian saya, sehingga saya bisa mengantisipasi jika ada pasien yang mencabut consent di tengah penelitian.

---

## 6. System Architecture

### High-Level

```
┌─────────────────────────────────────────────────────────────┐
│                        SOVRA PLATFORM                        │
│                                                              │
│  ┌──────────────┐    ┌──────────────┐    ┌───────────────┐  │
│  │   Telegram   │    │  Next.js     │    │   REST API    │  │
│  │   Bot        │    │  Dashboard   │    │   (for inst.) │  │
│  │  (pasien)    │    │  (researcher)│    │               │  │
│  └──────┬───────┘    └──────┬───────┘    └───────┬───────┘  │
│         │                  │                     │           │
│         └──────────────────┴─────────────────────┘           │
│                            │                                  │
│                   ┌────────▼────────┐                         │
│                   │   Agent Core    │                         │
│                   │                 │                         │
│                   │ Patient Agent   │                         │
│                   │ RC Agent        │                         │
│                   │ Sub-Inv Agent   │                         │
│                   │ Venice Risk     │                         │
│                   └────────┬────────┘                         │
│                            │                                  │
│              ┌─────────────┼─────────────┐                   │
│              │             │             │                    │
│     ┌────────▼───┐  ┌──────▼────┐  ┌────▼──────────┐        │
│     │ MetaMask   │  │  1Shot    │  │  Venice AI    │        │
│     │ Smart Acct │  │  API      │  │  API          │        │
│     │ ERC-7710   │  │  (relay)  │  │  (analytics)  │        │
│     └────────────┘  └───────────┘  └───────────────┘        │
│                                                              │
│     ┌──────────────────────────────────────────────┐         │
│     │              x402 Payment Layer               │         │
│     │         (USDC micropayment per request)        │         │
│     └──────────────────────────────────────────────┘         │
└─────────────────────────────────────────────────────────────┘
         │                              │
         ▼                              ▼
  [BLOCKCHAIN]                  [DATABASE]
  EVM-compatible                PostgreSQL
  Delegation on-chain           Redis (FSM state)
  Immutable audit log           Consent metadata
```

### Prinsip Arsitektur
1. **Sovra tidak menyimpan data medis** — hanya menyimpan metadata consent dan delegation proof
2. **Pasien tidak perlu paham blockchain** — semua kompleksitas disembunyikan oleh agent
3. **Gasless untuk pasien** — semua transaksi on-chain di-relay via 1Shot API, fee dibayar institusi/researcher
4. **Privacy-preserving** — Venice AI tidak menerima data medis, hanya metadata consent untuk risk assessment

---

## 7. Core Features

### 7.1 Consent Management

| Feature | Deskripsi |
|---|---|
| **Grant Consent** | Pasien approve request → ERC-7710 delegation dibuat dengan caveat granular |
| **Revoke Consent** | Pasien cabut consent kapan saja → delegation di-invalidate on-chain |
| **Consent History** | Riwayat lengkap semua consent (active, expired, revoked) |
| **Granular Scope** | Consent bisa dibatasi per: tipe data, durasi, institusi spesifik |
| **Auto-Expiry** | Delegation otomatis expired sesuai durasi yang disepakati |
| **Notifikasi** | Pasien dapat notifikasi Telegram untuk setiap request, approval, revoke |

**Caveat yang Didukung (MVP):**
- `data_type`: `lab_only` | `imaging_only` | `full_record`
- `duration`: dalam hari (misal: `90`)
- `institution`: address institusi yang authorized
- `revocable`: `true` (selalu true di MVP)

---

### 7.2 Monetisasi via x402

| Feature | Deskripsi |
|---|---|
| **Payment Gate** | Setiap consent request harus disertai x402 payment sebelum diproses |
| **Default Price** | $0.10 USDC per consent request (configurable oleh pasien) |
| **Auto-receive** | USDC langsung masuk ke Patient Smart Account setelah payment confirmed |
| **Withdraw** | Pasien bisa withdraw USDC ke wallet eksternal kapan saja via Telegram |
| **Earnings Dashboard** | Pasien bisa lihat total earnings dan riwayat pembayaran |

**Payment Flow:**
```
Requester Agent → HTTP request ke Patient Agent endpoint
                → Server reply: HTTP 402 + payment details
                → Requester Agent bayar USDC via x402
                → Payment confirmed on-chain
                → Patient Agent proses consent request
                → USDC settled di Patient Smart Account
```

---

### 7.3 Consent Proof

Setelah consent diberikan, Sovra menerbitkan dua bentuk proof:

**On-Chain Proof (Primary):**
- ERC-7710 delegation yang tersimpan on-chain
- Verifiable oleh siapapun menggunakan delegation hash
- Immutable — tidak bisa dimanipulasi

**Off-Chain Certificate (Human-Readable):**
```json
{
  "consent_id": "sovra_consent_001",
  "version": "1.0",
  "patient_account": "0xPatientSmartAccount",
  "granted_to": "0xResearcherAgent",
  "institution": "0xFKUIAddress",
  "scope": {
    "data_type": "lab_only",
    "valid_from": "2026-05-20",
    "valid_until": "2026-08-20"
  },
  "delegation_hash": "0xabc...123",
  "payment_tx": "0xdef...456",
  "issued_at": "2026-05-20T10:00:00Z",
  "signature": "0x..."
}
```

**Cara Verifikasi oleh Institusi:**
1. Terima certificate dari researcher
2. Ambil `delegation_hash`
3. Query on-chain: apakah delegation masih valid dan belum di-revoke?
4. Jika valid → lepas data ke researcher via channel institusi sendiri

---

## 8. Agent Architecture (A2A)

Ini adalah core differentiator Sovra untuk track **Best Agent-to-Agent Coordination**.

### 8.1 Daftar Agents

| Agent | Role | Siapa yang Spawn |
|---|---|---|
| **Patient Consent Agent** | Mengelola delegation atas nama pasien. Decision maker utama. | Sovra platform (saat pasien onboarding) |
| **Research Coordinator Agent** | Mengirim consent request + x402 payment atas nama researcher. | Researcher saat submit protokol penelitian |
| **Sub-Investigator Agent** | Meredeem delegation untuk akses data spesifik. | Dibuat oleh RC Agent setelah consent granted |
| **Venice Risk Agent** | Memberikan risk assessment setiap kali ada consent request. Consulted oleh Patient Agent. | Sovra platform (singleton, shared) |

### 8.2 A2A Communication Flow

```
1. RC Agent → Patient Agent
   "Request consent: lab_only, 90 hari, FK UI"
   + x402 payment $0.10 USDC

2. Patient Agent → Venice Risk Agent
   "Assess risk: pasien ini, scope ini, requester ini"

3. Venice Risk Agent → Patient Agent
   { risk: "low" | "medium" | "high", reason: "..." }

4a. Jika risk LOW → Patient Agent auto-approve
    → Buat ERC-7710 delegation
    → Notif Telegram ke pasien (informational)

4b. Jika risk MEDIUM → Patient Agent escalate ke pasien
    → Notif Telegram: "Ada request, Venice detect medium risk"
    → Tunggu approval manual dari pasien

4c. Jika risk HIGH → Patient Agent auto-reject
    → Refund x402 payment ke requester
    → Notif Telegram ke pasien

5. Jika approved → Patient Agent → Sub-Investigator Agent
   Kirim delegation proof via ERC-7710 redelegation
   (relay via 1Shot API, gasless)

6. Sub-Investigator Agent redeem delegation
   → Bawa consent proof ke institusi
   → Institusi verifikasi on-chain → release data
```

### 8.3 Venice Risk Assessment Criteria

Venice AI digunakan secara **privacy-preserving** — tidak menerima data medis, hanya metadata consent:

| Input ke Venice | Contoh |
|---|---|
| Jumlah active delegations pasien | `2 active` |
| Tipe data yang diminta | `lab_only` |
| Overlap dengan delegation existing | `no overlap` |
| Reputasi institusi requester | `verified institution` |
| Durasi request | `90 days` |

| Risk Level | Kondisi | Action |
|---|---|---|
| **Low** | Tidak ada overlap, scope minimal, institusi verified | Auto-approve |
| **Medium** | Ada overlap parsial, atau scope sensitif (imaging/full record) | Escalate ke pasien |
| **High** | Duplikasi delegation, institusi tidak dikenal, scope terlalu luas | Auto-reject |

---

## 9. Tech Stack

### Frontend & Interface
| Komponen | Tech | Alasan |
|---|---|---|
| Pasien Interface | Telegram Bot (Aiogram 3.x) | Familiar, tidak perlu install app baru, accessible |
| Researcher Dashboard | Next.js 14 + TailwindCSS | SSR untuk performance, familiar stack |
| Institusi Interface | REST API + Next.js dashboard | Programmatic verification + human-readable UI |

### Blockchain & Smart Account
| Komponen | Tech | Alasan |
|---|---|---|
| Smart Account | MetaMask Smart Accounts Kit | **Hackathon requirement.** ERC-4337 account abstraction untuk pasien |
| Delegation | ERC-7710 via MetaMask Delegation Framework | **Hackathon requirement.** Granular, revocable consent proof on-chain |
| Permission Request | ERC-7715 | Standar untuk request permission dari dApp ke wallet |
| Gas Abstraction | 1Shot API | **Hackathon requirement.** Gasless untuk pasien, bayar USDC |
| Blockchain Client | Viem | Type-safe, lightweight EVM client |
| Network | Base (L2) | Low gas, fast finality, USDC native support |

### Payment
| Komponen | Tech | Alasan |
|---|---|---|
| Micropayment Protocol | x402 (Coinbase) | **Hackathon requirement.** HTTP-native, agent-to-agent payment |
| Payment Currency | USDC | Stable, supported natively di Base |

### AI & Analytics
| Komponen | Tech | Alasan |
|---|---|---|
| Risk Assessment | Venice AI API | **Hackathon requirement.** Privacy-preserving, tidak log data user |
| Agent Framework | Custom (Node.js) | Lightweight untuk hackathon scope |

### Backend & Database
| Komponen | Tech | Alasan |
|---|---|---|
| Backend API | Node.js + Express | Fast to build, familiar |
| Database | PostgreSQL | Consent metadata, user records, delegation index |
| Cache / FSM | Redis | State management Telegram bot (conversation states) |

### DevOps
| Komponen | Tech | Alasan |
|---|---|---|
| Containerization | Docker + Docker Compose | Consistent environment |
| Hosting | Railway (backend) + Vercel (Next.js) | Fast deploy untuk hackathon |
| CI/CD | GitHub Actions | Auto-deploy on push |

---

## 10. Data & Privacy Model

### Apa yang Sovra Simpan

| Data | Disimpan di Sovra? | Keterangan |
|---|---|---|
| Data medis pasien | ❌ TIDAK | Tetap di institusi. Sovra tidak pernah menyentuh ini. |
| Metadata consent | ✅ Ya | Siapa grant ke siapa, scope, durasi, status |
| Delegation hash | ✅ Ya | Pointer ke on-chain proof |
| Riwayat pembayaran | ✅ Ya | x402 transaction hash + amount |
| Identitas pasien | ⚠️ Minimal | Hanya Smart Account address + Telegram ID |
| Risk assessment result | ✅ Ya | Output Venice AI (bukan input) |

### Prinsip Privacy
1. **Data minimization** — Sovra hanya simpan yang perlu untuk manage consent
2. **Zero medical data** — Data medis tidak pernah transit lewat Sovra
3. **Venice privacy-preserving** — Venice AI hanya terima metadata, tidak pernah data medis
4. **On-chain transparency** — Delegation proof bisa diverifikasi publik, tapi tidak mengekspos isi data

### Compliance
- **UU PDP Indonesia** — Consent eksplisit tersimpan on-chain sebagai bukti compliance
- **BPOM CUKB** — Audit trail immutable untuk clinical trial consent
- **GDPR-aligned** — Right to withdraw (revoke), right to access (consent history), data minimization

---

## 11. Consent Proof Format

### On-Chain (ERC-7710 Delegation)
```
Delegation {
  delegator:  Patient Smart Account address
  delegate:   Researcher Agent address
  authority:  bytes32 (delegation hash dari parent, atau root)
  caveats: [
    { enforcer: DataTypeCaveat,    terms: "lab_only" },
    { enforcer: DurationCaveat,    terms: "90 days"  },
    { enforcer: InstitutionCaveat, terms: "0xFKUI"   }
  ]
  salt:       bytes32
  signature:  bytes (signed by patient)
}
```

### Off-Chain Certificate (JSON)
Lihat Section 7.3 — diterbitkan oleh Sovra backend setelah delegation confirmed on-chain.

### Cara Institusi Verifikasi
```
GET /api/verify/:delegation_hash

Response:
{
  "valid": true | false,
  "status": "active" | "revoked" | "expired",
  "scope": { ... },
  "verified_at": "2026-05-20T10:00:00Z"
}
```

---

## 12. Business Model

> Note: Business model ini adalah post-hackathon vision. MVP hackathon tidak membutuhkan implementasi billing.

### Revenue Streams

**1. Platform Fee (per consent request)**
- Sovra ambil 10-15% dari x402 payment sebagai platform fee
- Contoh: Researcher bayar $0.10 → Pasien terima $0.087 → Sovra dapat $0.013
- Scalable: semakin banyak consent request, semakin besar revenue

**2. Institutional Subscription**
- Institusi bayar subscription bulanan untuk akses verification API + compliance dashboard
- Tier: Starter ($49/bulan), Growth ($199/bulan), Enterprise (custom)

**3. Verification API (Pay-per-call)**
- Pihak ketiga yang perlu verifikasi consent status membayar per API call
- $0.001 per verification call

### Unit Economics (Proyeksi)
| Metric | Asumsi |
|---|---|
| Consent requests per pasien per tahun | 5-10 |
| Platform fee per request | $0.01 |
| Target pasien tahun 1 | 10,000 |
| ARR dari platform fee saja | ~$500K-1M |

### Go-to-Market (Post-Hackathon)
1. **Pilot** dengan 1-2 universitas (FK UI / FK UGM) — gratis, bangun case study
2. **Product-Led Growth** — institusi yang join attract researcher, researcher attract institusi lain
3. **Expand** ke clinical trial networks di ASEAN

---

## 13. Hackathon Scope (MVP)

### Yang Harus Bisa Di-Demo

| Feature | Priority | Status |
|---|---|---|
| Patient onboarding via Telegram + Smart Account deploy | P0 | - |
| x402 payment gate untuk consent request | P0 | - |
| A2A: RC Agent → Patient Agent → Venice Risk Agent | P0 | - |
| ERC-7710 delegation grant (dengan caveat) | P0 | - |
| 1Shot API relay (gasless untuk pasien) | P0 | - |
| Notifikasi Telegram ke pasien | P0 | - |
| Patient Agent approve/reject berdasarkan Venice risk score | P0 | - |
| Consent revoke on-chain | P1 | - |
| Off-chain certificate generation | P1 | - |
| Earnings dashboard di Telegram | P1 | - |
| USDC withdraw ke wallet | P1 | - |
| Researcher dashboard (Next.js) | P2 | - |
| Institusi verification endpoint | P2 | - |

### Demo Script (2 Menit)
1. **[0:00-0:20]** Budi onboarding di Telegram → Smart Account deployed
2. **[0:20-0:50]** RC Agent kirim request → x402 payment → Venice assess → Patient Agent approve → ERC-7710 delegation dibuat → 1Shot relay
3. **[0:50-1:10]** Budi terima notifikasi Telegram + $0.10 USDC masuk
4. **[1:10-1:30]** Sub-Investigator Agent minta akses tambahan → Venice detect medium risk → escalate ke Budi → Budi approve
5. **[1:30-1:50]** Budi revoke consent dari Telegram → on-chain invalidation
6. **[1:50-2:00]** Budi lihat earnings + withdraw USDC

### Mock Data untuk Demo
- Data medis: tidak dibutuhkan (consent proof hanya referensi, tidak berisi data)
- Institusi: mock address sebagai "FK UI Smart Account"
- Pasien: 1 demo account (Budi)
- Researcher: 1 demo RC Agent + 1 Sub-Investigator Agent

---

## 14. Out of Scope (Post-Hackathon)

- Integrasi langsung dengan EHR system (Epic, SatuSehat)
- Multi-language support (Bahasa Indonesia full localization)
- Mobile app (iOS/Android)
- DAO governance untuk platform fee
- Data marketplace (pasien jual data ke multiple buyer sekaligus)
- ZK proof untuk verifikasi consent tanpa mengekspos metadata
- Multi-chain support (MVP: Base only)

---

## 15. Success Metrics

### Hackathon
- [ ] Semua P0 features berjalan di demo video
- [ ] ERC-7710, 1Shot API, Venice AI, x402 semua terlihat digunakan dalam main flow
- [ ] A2A coordination jelas: minimal 3 agent saling communicate
- [ ] Demo video ≤ 2 menit, flow lengkap dari onboarding hingga revoke

### Post-Hackathon (3 Bulan)
- 1 pilot institusi aktif
- 100 pasien terdaftar
- 500 consent requests diproses
- Zero data breach

---

## 16. Glossary

| Term | Definisi |
|---|---|
| **Consent Proof** | Bukti bahwa pasien telah memberikan consent — berupa ERC-7710 delegation on-chain dan/atau signed JSON certificate |
| **Delegation (ERC-7710)** | Smart contract mechanism untuk mendelegasikan permission secara granular, revocable, dan auditable |
| **Caveat** | Batasan yang ditempelkan pada delegation (tipe data, durasi, institusi) |
| **x402** | HTTP payment protocol dari Coinbase — server reply HTTP 402 ketika butuh payment, client bayar stablecoin lalu retry |
| **1Shot API** | Relayer service untuk ERC-7710 transactions — memungkinkan transaksi gasless untuk end-user |
| **Venice AI** | Privacy-preserving AI API — tidak menyimpan atau melatih model dari data user |
| **Patient Smart Account** | MetaMask Smart Account milik pasien — berbasis ERC-4337, bisa menerima USDC, bisa tanda tangani delegation |
| **RC Agent** | Research Coordinator Agent — autonomous agent yang bekerja atas nama researcher untuk request consent |
| **Sub-Investigator Agent** | Agent yang meredeem delegation dari RC Agent untuk akses data spesifik |
| **A2A** | Agent-to-Agent — komunikasi dan koordinasi antar autonomous agents tanpa intervensi manusia |
| **UU PDP** | Undang-Undang Perlindungan Data Pribadi Indonesia — berlaku Oktober 2024, mengklasifikasikan data kesehatan sebagai data sensitif |
| **BPOM CUKB** | Cara Uji Klinik yang Baik — standar regulasi BPOM untuk clinical trial di Indonesia, mengharuskan documented informed consent |

---

*PRD ini adalah living document. Update seiring progress development.*
*Last updated: May 2026*
*Owner: Ale*
