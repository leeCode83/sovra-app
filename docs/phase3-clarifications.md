# Phase 3 — Agent Framework: Clarifications & Decisions

> **Scope:** Jawaban atas 15 pertanyaan teknis sebelum implementasi Phase 3.
> **Tujuan:** Jadi decision record yang binding selama development Phase 3.
> **Last updated:** May 2026

---

## A. Arsitektur Agent & A2A Communication

### A1. Format komunikasi antar-agent?

**Keputusan: In-process function calls dengan typed interfaces.**

Agent tidak di-expose sebagai HTTP service terpisah. Semua agent adalah class TypeScript di `lib/agents/` yang dipanggil langsung oleh orchestrator (API route atau Telegram bot handler). Komunikasi antar-agent adalah function call biasa, bukan HTTP.

```
PatientConsentAgent.handleRequest(payload)
  → internally calls: VeniceRiskAgent.assess(metadata)
  → returns: RiskAssessmentResult
  → PatientConsentAgent decides: approve / escalate / reject
```

**Kenapa bukan HTTP/message broker?**
- Hackathon scope: kompleksitas tidak perlu
- Redis pub/sub atau BullMQ menambah moving parts tanpa nilai demo yang signifikan
- A2A "communication" tetap terlihat jelas di logs dan UI karena setiap agent call di-trace

**Untuk demo A2A:** Setiap agent call akan di-log dengan prefix agent name dan di-stream ke Telegram notifikasi sehingga judge bisa melihat koordinasi terjadi real-time.

---

### A2. Agent di-host di mana?

**Keputusan: In-process, dalam Next.js App Router.**

Semua agent class hidup di `lib/agents/`. Mereka di-instantiate dan di-call oleh:
- `app/api/` routes (untuk request dari RC Agent via HTTP)
- `bot/` Telegram handler (untuk patient-facing interactions)

Tidak ada worker queue, tidak ada service terpisah. Ini sesuai dengan arsitektur monolith yang sudah disetup di PLAN.md.

**Catatan:** Jika di masa depan perlu scale, agent bisa di-extract ke worker — tapi bukan untuk hackathon.

---

### A3. Apakah in-process function calls cukup untuk kriteria "A2A Coordination"?

**Keputusan: Ya, cukup — dengan syarat komunikasi antar-agent di-expose dengan jelas.**

Kriteria hackathon untuk "Best Agent-to-Agent Coordination" dinilai berdasarkan:
1. Apakah ada multiple agent yang saling berkoordinasi?
2. Apakah ada delegation/handoff antar agent?
3. Apakah ada autonomous decision-making?

Semua ini bisa dipenuhi dengan in-process calls **asalkan alur koordinasi terlihat jelas** di demo. Strategi:

- Setiap agent call wajib log ke console dengan format: `[AgentName] → [TargetAgent]: action`
- Flow A2A di-visualisasikan di Telegram notifikasi ke pasien secara real-time
- Kode agent dibuat sebagai class terpisah dengan clear interface, bukan satu monolith function

Jika judge minta bukti kode, struktur class yang terpisah sudah cukup sebagai evidence A2A.

---

### A4. RC Agent spawn Sub-Investigator Agent kapan?

**Keputusan: RC Agent spawn Sub-Investigator Agent SETELAH consent granted.**

Flow:
1. Consent di-grant oleh Patient Agent → delegation hash tersedia
2. RC Agent menerima delegation hash
3. RC Agent instantiate Sub-Investigator Agent dan pass delegation hash ke-nya
4. Sub-Investigator Agent bisa mulai redeem delegation

Researcher **tidak bisa** spawn Sub-Investigator Agent secara manual — harus lewat RC Agent yang sudah punya delegation yang valid. Ini penting untuk menjaga chain of custody consent.

---

## B. Patient Consent Agent — Decision Logic

### B1. Mekanisme escalate untuk risk=medium?

**Keputusan: Telegram bot kirim pesan + tunggu reply dengan timeout 24 jam.**

Flow:
1. Patient Agent detect risk=medium
2. Patient Agent kirim notifikasi ke pasien via Telegram dengan inline keyboard: `[✅ Approve] [❌ Reject]`
3. Bot state (di Redis) di-set ke `awaiting_patient_decision` dengan TTL 24 jam
4. **Jika pasien tidak reply dalam 24 jam → auto-reject** (bukan auto-approve, karena prinsip privacy-by-default)
5. x402 payment di-refund setelah timeout

**State key di Redis:** `fsm:consent_decision:{consentId}` dengan context berisi `{ requestId, patientTelegramId, expiresAt }`

---

### B2. Apakah Patient Agent punya "preferensi consent" yang bisa di-set pasien?

**Keputusan: Ya, tapi simpel — hanya scope-based auto-approve rules.**

Untuk MVP, pasien bisa set satu preferensi:
- `auto_approve_scope`: list scope yang selalu auto-approve tanpa cek Venice (`["lab_only"]`)
- Default: kosong (semua request di-assess Venice dulu)

**Preferensi ini OVERRIDE Venice risk score.** Kalau pasien set `auto_approve_scope: ["lab_only"]` dan request masuk untuk `lab_only`, langsung approve tanpa Venice assessment.

Preferensi disimpan di database (kolom `preferences` di tabel `users` sebagai JSON), bukan di Redis.

**Post-hackathon:** Bisa expand ke duration limits, institution whitelist, dll. Tapi untuk MVP, satu setting cukup.

---

### B3. Feedback loop setelah patient manual-approve via Telegram?

**Keputusan: Telegram bot webhook update state di Redis, Agent poll Redis.**

Flow:
1. Pasien klik `✅ Approve` di Telegram
2. Telegram bot handler (di `bot/`) terima callback
3. Handler update Redis: `fsm:consent_decision:{consentId}` → `{ decision: "approved" }`
4. Patient Agent (yang sedang berjalan di context API request yang berbeda) **tidak perlu poll** — melainkan, bot handler langsung call Patient Agent function setelah update Redis

**Konkretnya:**
- Bot handler: update Redis state → call `PatientConsentAgent.processManualDecision(consentId, "approved")`
- Patient Agent: eksekusi delegation creation + 1Shot relay
- Bot handler: kirim konfirmasi ke pasien

Ini lebih sederhana dari polling — event-driven dalam satu proses.

---

### B4. Mekanisme refund x402 payment untuk risk=high atau timeout?

**Keputusan: Update status payment di DB ke "refunded" — tidak ada on-chain refund untuk MVP.**

Untuk hackathon MVP, "refund" adalah:
1. Update `payments.status` → `"refunded"` di database
2. Log refund event
3. Notifikasi RC Agent via response bahwa request di-reject + payment di-refund

**Kenapa tidak on-chain refund?** x402 protocol saat ini (Coinbase implementation) tidak punya native refund mechanism yang sederhana untuk hackathon scope. On-chain refund butuh second transaction dari Sovra wallet ke requester — menambah complexity dan gas cost.

**Untuk demo:** Presenter bisa explain bahwa refund logic adalah off-chain tracking dulu, on-chain settlement di production. Judge hackathon akan menerima ini.

**Post-hackathon:** Implement actual USDC transfer back ke requester wallet.

---

## C. Research Coordinator (RC) Agent

### C1. RC Agent menerima input dari mana?

**Keputusan: API call dari researcher dashboard (HTTP POST ke `/api/agent/rc/request`).**

RC Agent di-trigger via REST endpoint, bukan Telegram. Researcher pakai web dashboard untuk:
1. Fill form: tipe data, durasi, scope, institution address
2. Submit → POST ke `/api/agent/rc/request`
3. API route instantiate RC Agent dan jalankan flow

RC Agent **bukan** menerima input dari external system atau natural language. Untuk hackathon, input selalu structured (form fields).

---

### C2. Bagaimana RC Agent map "research request" ke caveat spesifik?

**Keputusan: Template-based mapping, bukan AI translate.**

Researcher memilih dari dropdown / structured form:
- `data_type`: `lab_only` | `imaging_only` | `full_record`
- `duration_days`: number input
- `institution_address`: text input (wallet address institusi)
- `max_uses`: number input (default: unlimited = 0)

RC Agent langsung map field-field ini ke ERC-7710 caveat terms. Tidak ada AI layer untuk translate natural language.

**Kenapa tidak AI?** Consent data medis terlalu sensitif untuk di-interpret secara ambigu. Structured input lebih defensible secara legal dan lebih reliable untuk demo.

---

### C3. Format request dari RC Agent ke Patient Agent?

**Keputusan: TypeScript typed interface, bukan JSON schema over HTTP.**

```typescript
interface ConsentRequest {
  requestId: string;           // UUID
  rcAgentDid: string;          // DID researcher
  patientSmartAccount: `0x${string}`; // address pasien
  scope: {
    dataType: "lab_only" | "imaging_only" | "full_record";
    durationDays: number;
    institutionAddress: `0x${string}`;
    maxUses: number;           // 0 = unlimited
  };
  payment: {
    txHash: string;            // x402 payment tx hash
    amount: string;            // "0.10"
    currency: "USDC";
  };
  timestamp: string;           // ISO 8601
}
```

RC Agent pass object ini langsung ke `PatientConsentAgent.handleRequest(request)` sebagai function argument.

---

## D. Sub-Investigator Agent

### D1. Apa maksud "redeem delegation" secara teknis?

**Keputusan: Sub-Investigator Agent call `SovraConsentEnforcer.beforeAllHook` via 1Shot relay untuk validasi, lalu bawa consent proof ke institusi.**

Secara teknis, "redeem delegation" di Sovra berarti:

1. Sub-Investigator Agent punya delegation object + signature (dari Patient Agent)
2. Sub-Investigator Agent call 1Shot API untuk relay transaksi yang menggunakan delegation tersebut sebagai permission context
3. On-chain, `SovraConsentEnforcer.afterHook` di-trigger → increment `usageCount`
4. Sub-Investigator Agent menerima consent proof (delegation hash yang confirmed on-chain)
5. Proof dibawa ke institusi untuk unlock akses data

**Ini bukan ERC-7710 redelegation** (membuat sub-delegation baru). Sub-Investigator Agent hanya *menggunakan* delegation yang sudah ada — bukan mendelegasikan ulang ke pihak lain.

**Kenapa bukan redelegation?** Untuk MVP, patient hanya grant ke researcher. Sub-investigator dianggap bagian dari team researcher yang sama. Chained redelegation (patient → RC → sub-inv) bisa diimplementasi post-hackathon.

---

### D2. Sub-Investigator Agent berinteraksi dengan siapa selain Patient Agent?

**Keputusan: Sub-Investigator Agent berinteraksi dengan institusi via mock HTTP call untuk demo.**

Untuk hackathon:
- Sub-Investigator Agent call `/api/verify/:delegation_hash` (Sovra's own endpoint) sebagai simulasi "verifikasi ke institusi"
- Respons dari endpoint = "institusi sudah verify dan data bisa diakses"

Untuk production: Sub-Investigator Agent call API institusi dengan delegation hash → institusi verify sendiri on-chain.

**Sub-Investigator Agent tidak berinteraksi langsung dengan Patient Agent** setelah menerima delegation. Komunikasi sudah selesai di RC Agent level.

---

## E. Venice Risk Agent

### E1. Apakah Venice Risk Agent perlu di-enhance untuk Phase 3?

**Keputusan: Gunakan implementasi yang sudah ada di `lib/agents/venice-risk.ts`, dengan satu tambahan: caching.**

Yang sudah ada sudah cukup (fallback logic included). Yang perlu ditambah:

**Caching assessment result:** Simpan hasil Venice assessment di Redis dengan TTL 5 menit untuk `requestId` yang sama. Jika RC Agent retry request yang sama (misal network glitch), tidak perlu call Venice API dua kali.

```
Key: `venice:assessment:{hash(input)}`
TTL: 300 detik
```

Tidak perlu kirim lebih banyak konteks ke Venice — input yang ada sudah cukup untuk risk scoring yang defensible.

---

### E2. Input `activeDelegations` dari mana?

**Keputusan: Count dari database (tabel `delegations`), bukan on-chain.**

```typescript
const activeDelegations = await db
  .select({ count: count() })
  .from(delegations)
  .where(
    and(
      eq(delegations.fromDid, patientDid),
      eq(delegations.status, "active")
    )
  );
```

Ini lebih cepat dari on-chain query dan cukup akurat untuk risk assessment. On-chain adalah source of truth untuk verification, tapi untuk Venice input yang butuh real-time speed, DB query lebih appropriate.

---

### E3. Venice risk assessment di-save ke DB?

**Keputusan: Ya, disimpan di DB sebagai audit trail, tapi bukan di tabel terpisah.**

Tambah kolom `riskAssessment` (JSON) di tabel `consents`:
```sql
risk_assessment JSONB -- { risk, reason, action, confidence, assessedAt }
```

Ini penting untuk:
- Audit trail: kenapa consent di-approve atau di-reject
- Compliance: bisa di-show ke institusi kalau ada dispute
- Debug: trace kenapa Venice decide sesuatu

Tidak butuh tabel terpisah untuk MVP.

---

## F. Integrasi dengan Phase 2 (Backend API)

### F1. Agent classes sebagai orchestrator atau langsung akses lib/?

**Keputusan: Agent classes langsung akses `lib/` — bukan wrap API routes.**

```
Agent → lib/db (Drizzle)
Agent → lib/blockchain (Viem/MetaMask)
Agent → lib/oneshot (1Shot relay)
Agent → lib/x402 (payment)
Agent → lib/agents/venice-risk (Venice AI)
```

Agent **tidak** call `fetch("/api/consent")` atau API routes internal. Itu akan tambah latency dan complexity tanpa benefit. API routes tetap ada untuk external consumers (Telegram bot, researcher dashboard) — tapi agent bypass mereka.

---

### F2. Endpoint `POST /api/consent` yang sudah ada — researcher bisa bypass RC Agent?

**Keputusan: Tidak. POST /api/consent diubah menjadi internal-only untuk Phase 3.**

Mulai Phase 3, researcher **wajib** lewat RC Agent endpoint (`POST /api/agent/rc/request`). RC Agent yang akan call `db.insert(consents)` secara internal.

`POST /api/consent` tetap ada tapi:
- Hanya accessible dengan `role: "admin"` JWT
- Atau digunakan oleh integration test

Ini memastikan semua consent yang masuk sudah lewat Venice risk assessment dan x402 payment gate.

---

### F3. Apakah perlu authentication antar-agent?

**Keputusan: Tidak untuk Phase 3. Agent adalah in-process, tidak perlu auth.**

Karena semua agent adalah function calls dalam proses yang sama, tidak ada network boundary yang perlu di-secure. Auth sudah di-handle di API route level (JWT) sebelum agent di-call.

**Catatan untuk future:** Kalau agent di-extract ke microservices, gunakan mutual TLS atau service-to-service JWT. Tapi bukan sekarang.

---

## G. Hackathon Demo Spesifik

### G1. Agent perlu truly autonomous atau cukup deterministic/scripted?

**Keputusan: Deterministic logic dengan Venice AI sebagai satu-satunya AI layer — bukan LLM-driven orchestration.**

- Patient Consent Agent: deterministic if-else berdasarkan Venice output + patient preferences
- RC Agent: deterministic mapping dari form input ke caveat
- Sub-Investigator Agent: deterministic redemption flow
- Venice Risk Agent: satu-satunya yang call AI (Venice API)

**Kenapa tidak LLM-driven orchestration?**
- Reliability: LLM bisa hallucinate di tengah demo
- Speed: Extra LLM call = extra latency saat live demo
- Controllability: Deterministic logic lebih mudah di-debug kalau ada issue

Venice AI membuat sistem ini tetap "AI-powered" untuk pitch, tapi logic utama tetap predictable.

---

### G2. Telegram bot harus sudah jadi untuk Phase 3, atau bisa skip dulu?

**Keputusan: Telegram bot WAJIB untuk Phase 3, minimal untuk patient notification flow.**

A2A coordination tidak bisa di-demo dengan baik tanpa Telegram. Judge perlu lihat:
- Patient menerima notifikasi real-time
- Patient bisa approve/reject dari Telegram
- Patient bisa lihat earnings

**Minimum bot features untuk Phase 3:**
- `/start` + onboarding (bisa simplified, tanpa full Smart Account deploy)
- Notifikasi masuk consent request dengan inline keyboard approve/reject
- Konfirmasi setelah delegation granted
- Notifikasi earnings masuk

Full bot features (withdraw, history, dll) bisa di Phase 4.

---

### G3. Judge lihat kode atau cukup video demo?

**Keputusan: Assume judge lihat keduanya. Kode harus defensible.**

Strategi:
1. **Video demo:** Tunjukkan A2A flow end-to-end (sesuai demo script 2 menit di PRD)
2. **Kode:** Pastikan `lib/agents/` punya 4 class yang clearly separate dengan TypeScript interfaces yang clean
3. **README:** Tambah section "Agent Architecture" yang explain A2A flow dengan diagram

**Apa yang membuat kode defensible untuk A2A track:**
- 4 agent class terpisah (bukan 1 god function)
- Setiap agent punya single responsibility
- Ada clear interface untuk agent-to-agent calls
- Venice AI di-call secara genuine (bukan mock), hasil-nya dipakai untuk decision

**Jangan:** Mock semua agent calls atau hardcode output. Judge technical akan cek apakah Venice API benar-benar di-call.

---

## Summary: Critical Decisions untuk Phase 3

| Decision | Pilihan |
|---|---|
| A2A communication | In-process function calls |
| Agent hosting | In-process, Next.js |
| Escalate mechanism | Telegram inline keyboard + Redis FSM, timeout 24 jam auto-reject |
| Patient preferences | Simple scope-based auto-approve list |
| Feedback loop | Bot handler call agent function langsung setelah patient decision |
| Refund mechanism | DB status update "refunded", no on-chain refund for MVP |
| RC Agent input | Structured form via REST API |
| Caveat mapping | Template-based, no AI translation |
| Sub-Inv "redeem" | Use delegation via 1Shot, bukan redelegation chain |
| Venice caching | Redis cache 5 menit |
| `activeDelegations` | DB count |
| Venice result storage | JSON kolom di tabel `consents` |
| Agent → API routes | Agent bypass API routes, langsung akses `lib/` |
| Consent POST endpoint | Admin-only setelah Phase 3 |
| Inter-agent auth | Tidak perlu (in-process) |
| Agent AI-ness | Deterministic + Venice AI (tidak LLM-driven) |
| Telegram requirement | Wajib untuk Phase 3 (minimal notification flow) |
| Demo strategy | Video + kode keduanya harus defensible |

---

*Document ini adalah binding decision record untuk Phase 3.*
*Jika ada perubahan keputusan, update dokumen ini dan catat alasannya.*
