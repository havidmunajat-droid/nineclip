# nineClip — Catatan Progress

> Update terakhir: 2026-06-23

---

## Status Keseluruhan

| Milestone | Status |
|---|---|
| M1 — UI lengkap (mock data) | ✅ Selesai |
| M2 — Backend NestJS + DB | ✅ Selesai |
| M3 — Wiring frontend ke API real | ✅ Selesai |
| M4 — Pipeline AI nyata (Groq + yt-dlp + FFmpeg) | ✅ Selesai |
| M4b — Real-time polling status pipeline | ✅ Selesai |
| M4c — Caption burn-in (FFmpeg subtitles) | ✅ Selesai (belum ditest) |
| M5 — Midtrans real / Google OAuth | ⏳ Belum |
| M6 — Editor klip / Admin dashboard | ⏳ Belum |

### Sprint 2 — AI Campaign Engine (PRD: SPRINT2_PRD.md)

| Sesi | Lingkup | Status |
|---|---|---|
| Sesi 1 — Fondasi DB & Auth Guard | 5 tabel baru + 5 kolom users + AdminGuard | ✅ Selesai |
| Intent-Based Onboarding (sisipan Sesi 1) | register intent, primaryRole, role-based dashboard, Settings role kedua | ✅ Selesai |
| Sesi 2 — Viral Score & Campaign API | CampaignModule + endpoint + pipeline connection | ✅ Selesai |
| Sesi 3 — Campaign Wizard Frontend (Brand) | /campaign, /campaign/new, /campaign/[id] | ✅ Selesai |
| Sesi 4 — Clipper Module (BE+FE) | ClipperModule + /clipper/setup, campaigns, [id], earnings | ✅ Selesai |
| Sesi 5 — Admin Panel & Withdrawal | AdminModule + /admin/{withdrawals,campaigns,users} | ✅ Selesai |
| Sesi 6 — Wallet, Navigasi & Polish | /wallet + nav + onboarding polish | ✅ Selesai |

---

## Cara Jalankan (Dev)

```bash
# Frontend — port 3020
npm --prefix C:/Users/ulwan/nineClip run dev -- -p 3020

# Backend — port 3001
npm --prefix C:/Users/ulwan/nineClip/api run start:dev

# Akun demo
# Email   : havid.munajat@gmail.com
# Password: nineclip123
```

---

## Pipeline AI (Alur Lengkap)

```
YouTube URL / Upload
  → yt-dlp download (max 720p, 10 menit timeout)
  → FFmpeg extract audio MP3 mono 64kbps
  → Groq Whisper-large-v3 transkripsi (verbose_json → segments dgn timestamp)
  → Groq Llama-3.3-70b analisis viral → 5-8 segmen JSON
  → FFmpeg cut klip per segmen
  → FFmpeg reframe 9:16 (jika autoReframe aktif)
  → Tulis SRT dari Whisper segments → FFmpeg subtitles burn-in (jika autoCaptions aktif)
  → Simpan klip ke DB → update project status = ready
```

**Catatan teknis penting:**
- `api/bin/yt-dlp.exe` — standalone binary, path via `process.cwd()` (bukan `__dirname`)
- Groq Whisper limit 25 MB → video >~90 menit perlu audio chunking (TODO)
- FFmpeg subtitles filter Windows: path harus forward-slash + escape colon (`C\:/path/...`)
- Caption style: Arial Bold 16pt, putih + outline hitam, teks dibagi max 5 kata per baris (TikTok style)
- BullMQ + Upstash Redis: wajib `enableReadyCheck: false` + `maxRetriesPerRequest: null`

---

## Sprint 2 — Detail Progress (per 2026-06-22)

### Database (Prisma — semua id `cuid()`, bukan UUID)
- **Kolom baru di `User`:** `creditBalance`, `pointBalance`, `isClipper`, `isBrand`, `isAdmin`, `primaryRole` (default `"tool"`)
- **Tabel baru:** `ClipperProfile`, `Campaign`, `CampaignClipper`, `Transaction`, `WithdrawalRequest`
- Migrasi: `sprint2_campaign_engine`, `add_user_primary_role` (additive, no data loss)

### Auth & Onboarding
- `AdminGuard` (`api/src/auth/guards/admin.guard.ts`) — extends JwtGuard, cek `isAdmin` (DB source of truth). Belum di-wire ke route (nunggu Sesi 5).
- `isAdmin` masuk `JwtPayload` + di-set ulang dari DB tiap request.
- **Intent onboarding:** `POST /auth/register` terima `intent` (tool/brand/clipper) → set `primaryRole` + `isBrand`/`isClipper`.
  - Redirect register: brand→`/campaign/new`, clipper→`/clipper/setup`, tool→`/new`
  - Dashboard default (login): brand→`/campaign`, clipper→`/clipper/campaigns`, tool→`/dashboard`
  - Tambah role kedua: `POST /users/me/enable-brand` & `/enable-clipper` (dipakai di Settings, bukan onboarding)
- `GET /users/me` kini expose `isBrand/isClipper/isAdmin/primaryRole/creditBalance/pointBalance`.

### Campaign API (`api/src/campaigns/`) — real path `/api/v1/campaigns`
```
POST   /viral-score        no-auth, rule-based (oEmbed title, no Groq)
POST   /payment/webhook    no-auth (Midtrans)
POST   /                   buat draft (viral score dihitung server-side)
GET    /                   list campaign brand
GET    /:id                detail + rekonsiliasi pipeline
PATCH  /:id                update (draft only)
POST   /:id/pay            Midtrans Snap sandbox
POST   /:id/pay/confirm    DEV-only (simulasi bayar, blocked di production)
GET    /:id/clippers       list clipper assigned
```
- Paket & reward: `campaign-packages.ts` (starter/growth/pro, base reward 10k + bonus views).
- Matching: `campaign-matching.service.ts` (niche overlap `hasSome`, urut score desc, invite ≤ maxClippers).
- **Koneksi pipeline (Section 7):** `ProjectsService.createForCampaign()` (additive, tanpa quota-check) → dispatch ke queue `video-processing` yang sama dgn `/new`. Aktivasi campaign **poll-driven**: saat `GET /:id` dan project `ready` → campaign `processing→active` + matching. `jobs/` TIDAK disentuh.

### Sesi 3 — Campaign Wizard Frontend (Brand)
- `/campaign` (list), `/campaign/new` (wizard 4-step + viral score live), `/campaign/[id]` (dashboard + polling 3 detik).
- Tombol bayar pakai **dev-confirm** (simulasi sandbox) → memicu pipeline asli. Midtrans Snap nyata = M5.

### Sesi 4 — Clipper Module (Backend + Frontend)
- **ClipperModule** (`api/src/clipper/`) — real path `/api/v1/clipper`:
  ```
  GET/PUT /profile · GET /campaigns · GET /campaigns/:id
  POST /campaigns/:id/{accept,decline,submit} · GET /earnings · POST /withdraw
  POST /clips/:clipId/download   (tambahan: stream aset, akses via keanggotaan campaign)
  ```
  - PUT /profile set `is_clipper=true`. Brand di-mask "Brand Verified" di response clipper.
  - Withdrawal: min 50.000 poin, guard over-request (pending+baru ≤ saldo). Saldo dipotong saat admin approve (Sesi 5), bukan saat request.
- Frontend: `/clipper/setup` (DNA form 10 niche), `/clipper/campaigns` (inbox accept/decline + campaign aktif), `/clipper/campaigns/[id]` (download aset + submit + reward), `/clipper/earnings` (saldo + riwayat + form withdrawal). Sidebar clipper + menu "Earnings".

### Sesi 5 — Admin Panel & Withdrawal
- **AdminModule** (`api/src/admin/`) — guard `AdminGuard` (is_admin), real path `/api/v1/admin`:
  ```
  GET /campaigns · GET /campaigns/:id/clippers
  POST /campaigns/:id/clippers/:cid/verify   (hitung reward → kredit point_balance + transaksi)
  GET /withdrawals?status= · PATCH /withdrawals/:id  (approve→potong saldo+processed / reject)
  GET /users · PATCH /users/:id   (toggle is_admin/is_clipper/is_brand)
  ```
  - **Verify**: base 10.000 + bonus(views) → status verified, kredit point_balance, transaksi reward_earn + bonus_earn.
  - **Approve withdrawal**: cek saldo → potong point_balance + transaksi point_withdraw_done + status processed. Reject: status rejected tanpa potong.
- Frontend: `/admin/withdrawals` (filter + approve/reject + catatan), `/admin/campaigns` (expand → verifikasi submission via input views), `/admin/users` (toggle peran). Komponen `AdminOnly` (klien) + menu Admin di sidebar (is_admin).
- **Cara jadi admin**: set `is_admin=true` via DB / `/admin/users`. Akun demo sudah di-set admin. is_admin = DB source of truth (token lama langsung berlaku).

### Frontend (onboarding)
- Landing 2-CTA (`role-chooser.tsx`) → `/register?intent=...`
- Register intent-aware (Suspense + `useSearchParams`), Settings "Mode & Peran", sidebar menu per peran.
- Placeholder pages: `/campaign`, `/campaign/new`, `/clipper/setup`, `/clipper/campaigns` (diisi konten asli di Sesi 3 & 4).
- `src/lib/roles.ts` — helper `onboardingPathFor` / `dashboardPathFor`.

### Sesi 6 — Wallet, Navigasi & Polish
- **WalletModule** (`api/src/wallet/`) — `GET /api/v1/wallet` (JwtGuard): return `{creditBalance, pointBalance, transactions[]}`. 50 transaksi terakhir, urut desc.
- **`/wallet` page** (`src/app/(app)/wallet/page.tsx`): kartu kredit brand + kartu poin clipper (conditional jika isClipper), riwayat transaksi dengan filter tab Semua/Kredit/Poin. Link "Buat campaign" & "Tarik poin →".
- **Sidebar fix** (`sidebar.tsx`):
  - `baseNav` kini selalu punya `/projects` ("Proyek") — PRD Section 8 terpenuhi.
  - `/wallet` masuk `roleNav` untuk user `isBrand=true`.
  - `FolderOpen` icon dari lucide-react untuk Proyek.
- **Modifikasi existing**: `app.module.ts` (register WalletModule), `types.ts` (tambah `WalletTransaction`, `WalletData`), `api.ts` (tambah `getWallet()`), `sidebar.tsx` (tambah Proyek + Wallet).
- **Verifikasi**: `/wallet` render ✅, sidebar 1280px tampil Proyek + Wallet ✅, FE tsc clean ✅, BE tsc clean ✅, `GET /wallet` return 200 ✅.

### Catatan penting Sprint 2
- `is_brand`/`is_clipper` di-set saat register dari intent (DNA profile & campaign pertama jadi langkah lanjutan, bukan syarat flag).
- Viral score rule-based pakai substring `includes()` → bisa false-positive (mis. `ff` dalam "Official" → niche gaming). Sesuai PRD verbatim.
- `pay/confirm` dev-only untuk tes lokal tanpa public webhook URL. Midtrans nyata = M5.
- Google OAuth belum meneruskan intent (tombol masih mock).
- Project hasil campaign muncul di list `/projects` brand (userId sama) — belum difilter.

---

## Infra Dev (Cloud Free Tier)

| Komponen | Provider | Catatan |
|---|---|---|
| Postgres | Neon (ap-southeast-1) | `DATABASE_URL` direct (non-pooler) |
| Redis/Queue | Upstash | `rediss://` TLS |
| AI Transkripsi | Groq Whisper-large-v3 | API key di `api/.env` |
| AI Analisis | Groq Llama-3.3-70b-versatile | Same API key |

---

## File Kunci

| File | Fungsi |
|---|---|
| `api/src/jobs/pipeline.service.ts` | Full pipeline: download, transcribe, analyze, clip, reframe, caption |
| `api/src/jobs/jobs.processor.ts` | BullMQ processor, orchestrate pipeline stages |
| `api/src/jobs/jobs.module.ts` | Module registration |
| `src/lib/api.ts` | Typed fetch client ke backend |
| `src/lib/auth.tsx` | AuthProvider, useAuth hook |
| `src/app/(app)/projects/[id]/page.tsx` | Project detail + polling real-time setiap 3 detik |
| `src/components/app/processing-view.tsx` | UI progress pipeline (real data dari polling) |

---

## Open Items (Prioritas)

### Segera ditest
- [ ] **Caption burn-in** — buat project baru dengan toggle "Auto-captions" aktif, cek klip yang didownload apakah ada teks terbakar

### Backlog
- [ ] Midtrans Snap nyata (saat ini placeholder sandbox key)
- [ ] Google OAuth (GoogleButton masih mock redirect)
- [ ] Engagement curve backend endpoint (masih sintetis di frontend)
- [ ] Editor klip dedicated `/clips/[id]/edit`
- [ ] Admin dashboard
- [ ] Groq Whisper chunking untuk video >90 menit
- [ ] Test pipeline dengan konten long-form (podcast/webinar) → verifikasi 5-8 klip
- [ ] Production deploy (Railway sudah ada config, tinggal env vars)

---

## Test Caption (Cara Cepat)

1. Buka `http://localhost:3020/new`
2. Tab YouTube → tempel link video dengan banyak dialog (bukan lagu)
3. Di sidebar: aktifkan toggle **"Auto-captions"**
4. Klik Generate → tunggu pipeline selesai (~5-15 menit tergantung video)
5. Di halaman project → klik **Unduh** pada klip
6. Buka file `.mp4` → teks subtitle harus terbakar di video
