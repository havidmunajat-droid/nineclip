# nineClip — Sprint 2 PRD: AI Campaign Engine
> Versi 2.0 — Update: Social Verification, Validation Service, Business Logic v2
> Dokumen ini adalah referensi tunggal untuk pengembangan Sprint 2.
> Baca SELURUH dokumen sebelum mulai menulis satu baris kode pun.

---

## DOKUMEN PENDAMPING (WAJIB DIBACA BERSAMAAN)

| File | Isi |
|---|---|
| `SPRINT2_PRD.md` (ini) | Arsitektur teknis, DB schema, API, Frontend routes |
| `BUSINESS_LOGIC_v2.md` | Logika bisnis, reward, formula score, lifecycle campaign |

⚠️ Jika ada konflik antara dua file, **BUSINESS_LOGIC_v2.md yang berlaku** untuk semua hal
terkait perhitungan finansial, reward, dan lifecycle campaign.

---

## 0. Konteks & Aturan Utama

### Yang TIDAK boleh diubah
```
api/src/jobs/pipeline.service.ts   ← JANGAN DIUBAH
api/src/jobs/jobs.processor.ts     ← JANGAN DIUBAH
api/src/jobs/jobs.module.ts        ← JANGAN DIUBAH
src/lib/auth.tsx                   ← JANGAN DIUBAH
src/lib/api.ts                     ← boleh ditambah, tidak boleh hapus/ubah yang sudah ada
```

### Pipeline lama tetap jalan & terlihat
- Halaman `/new`, `/projects`, `/projects/[id]` tetap ada dan accessible
- Fitur AI Clipping (yt-dlp → Groq → FFmpeg) tetap untuk clipper individu
- Pipeline dipakai juga oleh Campaign Engine saat Brand upload video
- Monetisasi fitur lama tetap berjalan

### Filosofi arsitektur Sprint 2
Dua mode dalam satu akun:
- **Tool Mode** (lama): clipper mandiri → buat project → download klip → pakai sendiri
- **Campaign Mode** (baru): Brand → buat campaign → AI matching → clipper distribusi → reward

---

## 1. User System

### Satu akun, dua peran
User yang sama bisa jadi Brand sekaligus Clipper. Tidak ada akun terpisah.

### Onboarding intent-based (landing page)
```
/?intent=brand    → register → is_brand=true  → redirect /campaign/new
/?intent=clipper  → register → redirect /clipper/setup
/?intent=tool     → register → redirect /new (tool mode, default)
```

Penambahan role kedua hanya via Settings, bukan di onboarding utama.

### Perubahan tabel `users`
```sql
ALTER TABLE users ADD COLUMN credit_balance    INTEGER   NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN point_balance     INTEGER   NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN is_clipper        BOOLEAN   NOT NULL DEFAULT false;
ALTER TABLE users ADD COLUMN is_brand          BOOLEAN   NOT NULL DEFAULT false;
ALTER TABLE users ADD COLUMN is_admin          BOOLEAN   NOT NULL DEFAULT false;
ALTER TABLE users ADD COLUMN tnc_accepted_at   TIMESTAMP;
-- tnc_accepted_at NULL = belum setuju T&C, tidak bisa ambil campaign
```

---

## 2. Tabel Database Baru

### 2.1 `clipper_profiles`
```sql
CREATE TABLE clipper_profiles (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  niches                TEXT[]   NOT NULL DEFAULT '{}',
  -- nilai niche: 'bisnis','edukasi','gaming','kuliner','motivasi',
  --              'teknologi','hiburan','kesehatan','travel','lifestyle'
  region                VARCHAR(100),
  language              VARCHAR(50) DEFAULT 'id',
  avg_views             INTEGER DEFAULT 0,
  avg_ctr               DECIMAL(5,2) DEFAULT 0,
  score                 INTEGER DEFAULT 50,
  bio                   TEXT,

  -- Social media accounts (diisi saat verifikasi)
  tiktok_username       VARCHAR(100),
  tiktok_verified       BOOLEAN DEFAULT false,
  tiktok_verified_at    TIMESTAMP,

  youtube_channel_id    VARCHAR(100),
  youtube_username      VARCHAR(100),
  youtube_verified      BOOLEAN DEFAULT false,
  youtube_verified_at   TIMESTAMP,

  instagram_username    VARCHAR(100),
  instagram_verified    BOOLEAN DEFAULT false,
  instagram_verified_at TIMESTAMP,

  -- Penalti dari auto-release booking
  penalty_until         TIMESTAMP,

  created_at            TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE(user_id)
);
```

### 2.2 `social_verifications`
```sql
-- Tabel sementara untuk proses Bio Token Verification
CREATE TABLE social_verifications (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  platform    VARCHAR(20)  NOT NULL,  -- 'tiktok', 'youtube', 'instagram'
  username    VARCHAR(100) NOT NULL,
  code        VARCHAR(60)  NOT NULL,  -- format: NC-[userId6char]-[timestamp4char]
  status      VARCHAR(20)  NOT NULL DEFAULT 'pending',
  -- pending → verified → expired
  expires_at  TIMESTAMP    NOT NULL,  -- NOW() + 24 jam
  verified_at TIMESTAMP,
  created_at  TIMESTAMP    NOT NULL DEFAULT NOW()
);
```

### 2.3 `campaigns`
```sql
CREATE TABLE campaigns (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id             UUID NOT NULL REFERENCES users(id),
  name                 VARCHAR(255) NOT NULL,
  video_url            TEXT,
  project_id           UUID REFERENCES projects(id),
  viral_score          INTEGER,
  detected_niches      TEXT[] DEFAULT '{}',
  target_platforms     TEXT[] DEFAULT '{}',  -- 'tiktok','shorts','reels'
  deadline             TIMESTAMP NOT NULL,
  package_type         VARCHAR(20) NOT NULL, -- 'starter','growth','pro','ultra'
  total_credits        INTEGER NOT NULL,
  credits_remaining    INTEGER NOT NULL DEFAULT 0,
  reward_pool          INTEGER NOT NULL,
  platform_fee         INTEGER NOT NULL,
  max_clippers         INTEGER NOT NULL,
  videos_verified      INTEGER NOT NULL DEFAULT 0,
  total_views          BIGINT  NOT NULL DEFAULT 0,
  first_validated_at   TIMESTAMP,
  activated_at         TIMESTAMP,
  extended_at          TIMESTAMP,
  extension_days       INTEGER DEFAULT 0,
  compensation_deadline TIMESTAMP,
  status               VARCHAR(30) NOT NULL DEFAULT 'draft',
  -- draft → processing → active → kpi_missed → completed | expired
  created_at           TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMP NOT NULL DEFAULT NOW()
);
```

### 2.4 `campaign_clippers`
```sql
CREATE TABLE campaign_clippers (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id       UUID NOT NULL REFERENCES campaigns(id),
  clipper_id        UUID NOT NULL REFERENCES users(id),
  status            VARCHAR(30) NOT NULL DEFAULT 'invited',
  -- invited → accepted → declined → submitted → pending_manual_review
  -- → verified → rewarded | rejected | expired
  submitted_url     TEXT,
  submitted_at      TIMESTAMP,
  verified_at       TIMESTAMP,
  booking_expires_at TIMESTAMP,
  slot_number       INTEGER DEFAULT 1,   -- 1 = video pertama, 2 = video kedua
  platform          VARCHAR(20),         -- 'tiktok','youtube','instagram' (dari URL)
  view_count        BIGINT  DEFAULT 0,
  like_count        INTEGER DEFAULT 0,
  comment_count     INTEGER DEFAULT 0,
  share_count       INTEGER DEFAULT 0,
  is_original       BOOLEAN DEFAULT true,
  performance_score INTEGER DEFAULT 0,
  final_rank        INTEGER,
  base_reward       INTEGER DEFAULT 0,
  performance_bonus INTEGER DEFAULT 0,
  total_reward      INTEGER DEFAULT 0,
  created_at        TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE(campaign_id, clipper_id, slot_number)
);
```

### 2.5 `transactions`
```sql
CREATE TABLE transactions (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES users(id),
  type         VARCHAR(40) NOT NULL,
  -- credit_purchase | campaign_debit | reward_earn | bonus_earn
  -- point_withdraw_request | point_withdraw_done
  -- bonus_pool_payout | bonus_pool_residual | voucher_issued
  amount       INTEGER NOT NULL,
  balance_type VARCHAR(10) NOT NULL,  -- 'credit' atau 'point'
  description  TEXT,
  reference_id UUID,
  created_at   TIMESTAMP NOT NULL DEFAULT NOW()
);
```

### 2.6 `withdrawal_requests`
```sql
CREATE TABLE withdrawal_requests (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID NOT NULL REFERENCES users(id),
  amount         INTEGER NOT NULL,
  bank_name      VARCHAR(100),
  account_number VARCHAR(50),
  account_name   VARCHAR(100),
  ewallet_type   VARCHAR(50),
  ewallet_number VARCHAR(50),
  status         VARCHAR(20) NOT NULL DEFAULT 'pending',
  -- pending → approved → rejected → processed
  admin_note     TEXT,
  processed_at   TIMESTAMP,
  created_at     TIMESTAMP NOT NULL DEFAULT NOW()
);
```

---

## 3. Business Logic

⚠️ **Seluruh business logic (paket, reward, formula score, lifecycle) ada di BUSINESS_LOGIC_v2.md.**
Section ini hanya quick reference. Untuk implementasi kode, baca BUSINESS_LOGIC_v2.md.

### Quick Reference Paket (dari BUSINESS_LOGIC_v2.md)
```typescript
const PACKAGES = {
  starter: { price_idr: 499_000,   credits: 50,  clipper_invited: 35,  campaign_days: 7  },
  growth:  { price_idr: 1_499_000, credits: 120, clipper_invited: 70,  campaign_days: 7  },
  pro:     { price_idr: 3_999_000, credits: 280, clipper_invited: 150, campaign_days: 14 },
  ultra:   { price_idr: 6_999_000, credits: 500, clipper_invited: 260, campaign_days: 14 },
};
// Alokasi: 20% platform fee, 80% clipper pool (60% base fund + 40% bonus pool)
// Sisa bonus pool tidak terdistribusi → masuk revenue platform
```

### Rule-Based Viral Score (MVP, tidak pakai Groq)
```typescript
function calculateViralScore(title: string, description: string): {
  score: number; niches: string[];
} {
  const NICHE_KEYWORDS: Record<string, string[]> = {
    bisnis:    ['bisnis','business','entrepreneur','startup','revenue','uang','investasi'],
    edukasi:   ['belajar','tutorial','tips','cara','how to','learn','guide'],
    gaming:    ['game','gaming','gameplay','esports','mobile legends','valorant'],
    kuliner:   ['masak','resep','makan','food','kuliner','restaurant','cafe'],
    motivasi:  ['motivasi','inspirasi','sukses','motivation','mindset','growth'],
    teknologi: ['ai','tech','teknologi','coding','programming','software','digital'],
    hiburan:   ['lucu','funny','comedy','viral','meme','entertainment'],
    kesehatan: ['sehat','health','fitness','olahraga','gym','diet'],
    lifestyle: ['lifestyle','vlog','daily','travel','wisata','fashion'],
  };
  const text = (title + ' ' + description).toLowerCase();
  const niches = Object.entries(NICHE_KEYWORDS)
    .filter(([, kw]) => kw.some(k => text.includes(k)))
    .map(([n]) => n);
  let score = 45;
  if (niches.length >= 1) score += 20;
  if (niches.length >= 2) score += 10;
  if (title.length >= 20 && title.length <= 80) score += 10;
  if (['bisnis','edukasi','teknologi'].some(n => niches.includes(n))) score += 5;
  score = Math.min(score + Math.floor(Math.random() * 8), 98);
  return { score, niches: niches.length > 0 ? niches : ['umum'] };
}
```

---

## 4. API Endpoints (NestJS)

Semua endpoint menggunakan prefix `/api`, auth via JWT Bearer.

### 4.1 Modul: Clipper Profile & Social Verification
```
GET    /api/clipper/profile                       → profil clipper user sendiri
PUT    /api/clipper/profile                       → buat/update profil DNA
                                                    (set is_clipper=true)

// --- Social Verification (Bio Token) ---
POST   /api/clipper/social/generate-code
       body: { platform: 'tiktok'|'youtube'|'instagram', username: string }
       → generate kode NC-[hash], simpan ke social_verifications
       → return: { code, instructions, expires_in: '24 jam' }

POST   /api/clipper/social/verify
       body: { platform, username }
       → fetch halaman publik profil platform
       → cari kode di bio text
       → jika ketemu: update clipper_profiles verified=true
       → return: { success, platform, username }

GET    /api/clipper/social/status
       → return status verifikasi semua platform user ini

// --- Campaign ---
GET    /api/clipper/campaigns                     → list campaign invite untuk user
POST   /api/clipper/campaigns/:id/accept          → accept invite (kurangi credits_remaining)
POST   /api/clipper/campaigns/:id/decline         → decline invite
POST   /api/clipper/campaigns/:id/submit          → submit URL social media
                                                    (lihat Section 11 untuk validasi URL)
GET    /api/clipper/earnings                      → saldo poin + riwayat transaksi
POST   /api/clipper/withdraw                      → request withdrawal
```

### 4.2 Modul: Campaign (Brand)
```
POST   /api/campaigns/viral-score    → hitung viral score (no auth needed)
POST   /api/campaigns                → buat campaign baru (status: draft)
GET    /api/campaigns                → list campaigns milik brand ini
GET    /api/campaigns/:id            → detail campaign
PATCH  /api/campaigns/:id            → update (hanya saat masih draft)
POST   /api/campaigns/:id/pay        → trigger Midtrans → sukses → active + matchClippers()
GET    /api/campaigns/:id/clippers   → list clipper assigned ke campaign
POST   /api/campaigns/:id/compensation → brand pilih kompensasi (extension|voucher)
```

### 4.3 Modul: Admin
```
GET    /api/admin/campaigns                               → semua campaign
GET    /api/admin/withdrawals                             → list withdrawal pending
PATCH  /api/admin/withdrawals/:id                         → approve/reject
GET    /api/admin/verifications                           → antrian verifikasi manual
                                                            (TikTok & Instagram)
POST   /api/admin/verifications/:campaignClipperId/approve
       body: { view_count, like_count, comment_count, is_original }
       → update campaign_clippers dengan data manual
       → proses reward jika views >= 200
POST   /api/admin/verifications/:campaignClipperId/reject
       body: { reason }
GET    /api/admin/users                                   → list semua user
PATCH  /api/admin/users/:id                               → toggle flags
```

### 4.4 Modul: Wallet (shared)
```
GET    /api/wallet    → credit balance + poin balance + riwayat transaksi
```

---

## 5. Frontend Routes (Next.js App Router)

```
src/app/
├── (app)/
│   ├── projects/            ← TETAP ADA (tool mode lama)
│   ├── new/                 ← TETAP ADA (tool mode lama)
│   │
│   ├── campaign/            ← Brand side
│   │   ├── new/page.tsx     ← Wizard 4-step
│   │   ├── [id]/page.tsx    ← Dashboard campaign + daftar clipper
│   │   └── page.tsx         ← List semua campaign brand
│   │
│   ├── clipper/
│   │   ├── setup/page.tsx            ← DNA profile + Social Verification (Step 2)
│   │   ├── verify/[platform]/page.tsx ← Panduan tempel kode + tombol cek
│   │   ├── campaigns/
│   │   │   ├── [id]/page.tsx         ← Detail campaign + submit URL
│   │   │   └── page.tsx              ← Inbox invite
│   │   └── earnings/page.tsx         ← Saldo + withdrawal
│   │
│   ├── wallet/page.tsx      ← Credit balance brand
│   │
│   └── admin/
│       ├── verifications/page.tsx   ← Antrian validasi manual TikTok/IG
│       ├── withdrawals/page.tsx
│       ├── campaigns/page.tsx
│       └── users/page.tsx
```

---

## 6. Detail Flow Per Halaman

### 6.1 `/campaign/new` — Wizard 4 Step

**Step 1:** Input YouTube URL → panggil `POST /api/campaigns/viral-score`
→ tampilkan Viral Score + detected niches

**Step 2:** Nama campaign, target platform (TikTok/Shorts/Reels), deadline

**Step 3:** Pilih paket (Starter/Growth/Pro/Ultra) + tampilkan estimasi clipper & reward

**Step 4:** Review + Midtrans Snap → sukses → pipeline + matchClippers() → redirect `/campaign/[id]`

### 6.2 `/campaign/[id]` — Dashboard Brand
Metrik: clipper diundang / aktif / submit / verified / total views
Tabel clipper: nama, platform, status, link, views, reward, aksi admin

### 6.3 `/clipper/setup` — Onboarding Clipper (2 Step)

**Step 1 — DNA Profile:**
Form: niches (multi-select), region, language, bio

**Step 2 — Verifikasi Akun Sosial:**
```
Per platform (TikTok / YouTube / Instagram):
  Klik "Hubungkan [Platform]"
  → sistem generate kode NC-xxxx
  → tampilkan instruksi: "Tempel kode ini di bio [Platform] kamu sementara"
  → redirect ke /clipper/verify/[platform]
```

Minimal 1 platform harus terverifikasi sebelum bisa ambil campaign.
Setelah setup: is_clipper = true

### 6.4 `/clipper/verify/[platform]` — Halaman Verifikasi Bio

```
Tampilkan:
  - Kode yang harus ditempel: [NC-A3X9KQ]
  - Screenshot panduan: di mana letak bio di platform tersebut
  - Countdown timer: kode berlaku XX jam XX menit
  - Tombol "Saya sudah tempel kode, verifikasi sekarang"
    → panggil POST /api/clipper/social/verify
    → sukses: centang hijau, tombol "Lanjut"
    → gagal: pesan error + tombol retry
  - Catatan: "Setelah berhasil, bio kamu boleh diganti kembali"
```

### 6.5 `/clipper/campaigns` — Inbox Invite
List campaign: nama, niche, deadline, platform, estimasi reward
Filter: invited / accepted / completed
Tombol: Accept / Decline

### 6.6 `/clipper/campaigns/[id]` — Detail Campaign

Jika status `invited`: brief campaign + tombol Accept / Decline
Jika status `accepted`:
  - Instruksi + tombol download aset video (klip dari pipeline)
  - **Form submit URL** — hanya terima URL dari platform yang sudah terverifikasi clipper ini
  - Countdown timer 24 jam tersisa
Jika status `submitted` / `pending_manual_review`: "Sedang diverifikasi"
Jika status `verified`: tampilkan reward yang diterima

### 6.7 `/clipper/earnings` — Earnings & Withdrawal
Saldo poin + ekuivalen Rp, riwayat transaksi, form withdrawal (min 50.000 poin)

### 6.8 `/admin/verifications` — Antrian Validasi Manual
```
Tabel: clipper, platform, link video, tanggal submit
Per baris:
  - Tombol buka link (buka tab baru)
  - Input: view_count, like_count, comment_count
  - Checkbox: "Hashtag sesuai brief" + "Konten orisinal"
  - Tombol Approve / Reject + field alasan
Filter: pending / approved / rejected
```

---

## 7. Validation Service — Alur Submission Video

Saat clipper submit URL, sistem melakukan langkah berikut secara berurutan:

```
STEP 1: Parse URL
  → Ekstrak platform + username + videoId dari URL
  → Platform diterima:
      youtube.com/shorts/[id] | youtu.be/[id]
      tiktok.com/@[user]/video/[id] | vm.tiktok.com/[code]
      instagram.com/reels/[id] | instagram.com/p/[id]
  → URL tidak dikenal → tolak otomatis

STEP 2: Validasi Kepemilikan Akun
  → Cocokkan username dari URL dengan akun terverifikasi di clipper_profiles
  → Tidak cocok → tolak: "URL bukan dari akun yang kamu verifikasi"

STEP 3: Fetch Stats (per platform)

  YOUTUBE (otomatis via YouTube Data API v3):
    → Env: YOUTUBE_API_KEY di api/.env
    → Endpoint: youtube.googleapis.com/youtube/v3/videos
    → Fields: viewCount, likeCount, commentCount, publishedAt, privacyStatus
    → Jika privacyStatus !== 'public' → tolak: "Video tidak publik"
    → Simpan stats → update campaign_clippers
    → Lanjut ke Step 4 (auto)

  TIKTOK (semi-otomatis via scraping publik):
    → Fetch halaman tiktok.com/@user/video/[id] via Puppeteer/Playwright
    → Parse viewCount dari script tag JSON
    → Simpan stats → update campaign_clippers
    → Lanjut ke Step 4 (auto jika berhasil)
    → Jika scraping gagal → masuk manual queue (status: pending_manual_review)

  INSTAGRAM (manual):
    → Set status: pending_manual_review
    → Masuk ke /admin/verifications queue
    → Admin input stats manual

STEP 4: Cek Originality
  → Cek: URL yang sama sudah pernah disubmit di campaign ini?
  → Jika duplikat → tolak

STEP 5: Cek Views Minimum
  → (Untuk YouTube & TikTok otomatis) views >= 200?
  → Jika sudah >= 200 → proses reward langsung
  → Jika belum >= 200 → set status 'submitted', pantau terus (cron tiap 6 jam)
  → Setelah campaign closed: < 200 → reward hangus → roll ke bonus pool

STEP 6: Notifikasi
  → Clipper dapat notif: approved/pending/rejected
```

---

## 8. Social Verification — Detail Teknis

### Bio Token Format
```
NC-[6char userId]-[4char timestamp]
Contoh: NC-A3X9KQ-7F2B
```

### Cara Kerja Per Platform

**TikTok** ✅ Otomatis
```typescript
// Fetch profil publik
const url = `https://www.tiktok.com/@${username}`;
// Gunakan Puppeteer (headless) untuk handle JS rendering
// Cari token di: document.querySelector('.tiktok-bio') atau meta description
// Timeout: 15 detik
```

**YouTube** ✅ Otomatis
```typescript
// YouTube Data API v3
const url = `https://www.googleapis.com/youtube/v3/channels?part=snippet&forUsername=${username}&key=${YOUTUBE_API_KEY}`;
// Cari token di: channel.snippet.description
// Atau cari di channel URL: youtube.com/@${username}/about
```

**Instagram** ⚠️ Manual untuk MVP
```
Instagram aktif memblokir scraping.
MVP: verifikasi manual oleh admin — admin cek bio IG user secara visual.
Sprint 3: implementasi Meta Basic Display API setelah app approval.
```

### Env Variables yang Dibutuhkan
```
YOUTUBE_API_KEY=xxx        ← YouTube Data API v3
PUPPETEER_EXECUTABLE_PATH= ← path Chrome untuk Puppeteer (jika tidak default)
```

---

## 9. Koneksi Pipeline Lama dengan Campaign

Brand submit YouTube URL → saat bayar:
1. Buat record `projects` via `ProjectsService` (SAMA PERSIS dengan flow `/new`)
2. Dispatch job ke BullMQ (pipeline tidak diubah)
3. Set `campaigns.project_id = newProject.id`, status → `processing`
4. Frontend polling setiap 3 detik (sama seperti `/projects/[id]`)
5. Project `ready` → campaign `active` → jalankan `matchClippers()`
6. Klip hasil pipeline ini yang bisa didownload clipper

---

## 10. Navigasi & UX

### Sidebar/Navbar
```
Selalu: "Proyek" → /projects   (tool mode)
Jika is_clipper: "Kampanye Saya" → /clipper/campaigns
Jika is_brand:   "Campaign Brand" → /campaign
Jika is_admin:   "Admin" → /admin (dropdown)
```

### Guard: T&C Modal
Sebelum clipper bisa klik "Ambil Campaign" PERTAMA KALI:
→ Tampilkan TnC modal (komponen terpisah: `ClipperTnCModal`)
→ Setelah setuju: set `users.tnc_accepted_at = NOW()`
→ Cek di backend: jika `tnc_accepted_at IS NULL` → return 403 + error `TNC_NOT_ACCEPTED`

### Guard: Verifikasi Sosial
Sebelum clipper bisa submit URL video:
→ Cek apakah ada minimal 1 platform terverifikasi di clipper_profiles
→ Jika belum ada → redirect ke /clipper/setup?step=2

---

## 11. Urutan Pengerjaan — Sesi per Sesi

### Sesi 1 — Fondasi DB & Auth Guard
```
Baca SPRINT2_PRD.md dan BUSINESS_LOGIC_v2.md.
Kerjakan HANYA Sesi 1:
  (1) Migrasi SQL untuk SEMUA tabel baru di Section 2
  (2) Kolom baru ke tabel users (Section 1)
  (3) NestJS auth guard untuk cek is_admin dan tnc_accepted_at
Jangan sentuh api/src/jobs/ sama sekali.
Konfirmasi schema sebelum jalankan migrasi.
```

### Sesi 2 — Campaign API Backend
```
Baca SPRINT2_PRD.md dan BUSINESS_LOGIC_v2.md.
Kerjakan HANYA Sesi 2:
  (1) CampaignModule NestJS — endpoint Section 4.2
  (2) Rule-based viral score — Section 3
  (3) Koneksi campaign ke pipeline — Section 9
  (4) matchClippers() service
PENTING: Viral score = rule-based. JANGAN panggil Groq.
PENTING: Gunakan ProjectsService yang sudah ada untuk pipeline.
```

### Sesi 3 — Campaign Frontend (Brand)
```
Baca SPRINT2_PRD.md.
Kerjakan HANYA Sesi 3:
  (1) /campaign/new — wizard 4 step (Section 6.1)
  (2) /campaign/[id] — dashboard brand (Section 6.2)
  (3) /campaign — list campaigns
Gunakan komponen UI yang sudah ada. Jangan install library baru tanpa konfirmasi.
```

### Sesi 4 — Clipper Module + Social Verification
```
Baca SPRINT2_PRD.md — fokus Section 4.1, 6.3, 6.4, 6.5, 8.
Kerjakan HANYA Sesi 4:
  BAGIAN A — Backend:
    (1) ClipperModule NestJS — semua endpoint Section 4.1
    (2) SocialVerificationService — generate kode + fetch & cek bio publik
        TikTok: Puppeteer, YouTube: YouTube Data API v3, Instagram: manual flag
  BAGIAN B — Frontend:
    (3) /clipper/setup — 2 step: DNA profile + social verification
    (4) /clipper/verify/[platform] — panduan + tombol cek
    (5) /clipper/campaigns dan /clipper/campaigns/[id]
    (6) /clipper/earnings
Install Puppeteer jika belum ada: npm install puppeteer
Kerjakan Bagian A sampai selesai dulu, konfirmasi, baru Bagian B.
```

### Sesi 5 — Validation Service + Admin Panel
```
Baca SPRINT2_PRD.md — fokus Section 7, 4.3, 6.8.
Kerjakan HANYA Sesi 5:
  (1) ValidationService — alur lengkap Section 7
      YouTube: YouTube Data API v3 (auto)
      TikTok: Puppeteer scraping (auto, fallback manual)
      Instagram: langsung masuk manual queue
  (2) AdminModule NestJS — endpoint Section 4.3
  (3) /admin/verifications — antrian validasi manual (Section 6.8)
  (4) /admin/withdrawals dan /admin/campaigns
  (5) Guard: semua route /admin/* hanya is_admin=true
```

### Sesi 6 — Wallet, Navigasi & Polish
```
Baca SPRINT2_PRD.md — fokus Section 10.
Kerjakan HANYA Sesi 6:
  (1) /wallet page
  (2) Update sidebar/navbar — Section 10
  (3) T&C modal guard (ClipperTnCModal) + cek tnc_accepted_at di backend
  (4) Pastikan semua route LAMA masih ada: /new, /projects, /projects/[id]
  (5) Test flow end-to-end: brand buat campaign → clipper ambil → submit → admin verif
```

---

## 12. Hal-hal yang Sering Salah — Ingatkan Claude Code

1. `api/src/jobs/` tidak boleh disentuh dalam kondisi apapun
2. Koneksi campaign ke pipeline LEWAT ProjectsService yang sudah ada
3. Viral score MVP = rule-based, BUKAN Groq
4. Withdrawal = manual admin, belum otomatis disbursement
5. Business logic (reward, score, lifecycle) ada di BUSINESS_LOGIC_v2.md bukan di sini
6. Social verification = Bio Token (bukan OAuth) — tidak butuh app approval platform
7. YouTube = YouTube Data API (official), TikTok = scraping publik, Instagram = manual
8. Submission URL harus cocok dengan username yang SUDAH TERVERIFIKASI clipper tersebut
9. Sisa bonus pool → `bonus_pool_residual` → platform revenue, bukan dibiarkan menggantung
10. T&C modal hanya muncul SEKALI (first time), cek `tnc_accepted_at IS NULL`
11. `credits_remaining` dikurangi saat BOOKING (reserved), bukan saat submit
12. Penalti clipper: `penalty_until` di clipper_profiles, cek sebelum boleh ambil campaign baru

---

## 13. Quick Reference Finansial (dari BUSINESS_LOGIC_v2.md)

| Paket | Harga | Kredit | Clipper | Pool Clipper (80%) | Platform Fee (20%) |
|---|---|---|---|---|---|
| Starter | Rp499.000 | 50 | 35 | Rp399.200 | Rp99.800 |
| Growth | Rp1.499.000 | 120 | 70 | Rp1.199.200 | Rp299.800 |
| Pro | Rp3.999.000 | 280 | 150 | Rp3.199.200 | Rp799.800 |
| Ultra | Rp6.999.000 | 500 | 260 | Rp5.599.200 | Rp1.399.800 |

**Reward per video (Base Fund ÷ kredit):**
Starter Rp4.790 | Growth Rp5.996 | Pro Rp6.855 | Ultra Rp6.719

**Minimum views untuk dapat reward: 200 views**
**Minimum withdrawal: 50.000 poin (Rp50.000)**
**1 Clipper Point = Rp1**
