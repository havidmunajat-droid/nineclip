# nineClip — Sprint 2 PRD: AI Campaign Engine
> Dokumen ini adalah referensi tunggal untuk pengembangan Sprint 2.
> Baca seluruh dokumen sebelum mulai menulis satu baris kode pun.

---

## 0. Konteks & Aturan Utama

### Yang TIDAK boleh diubah
```
api/src/jobs/pipeline.service.ts   ← JANGAN DIUBAH
api/src/jobs/jobs.processor.ts     ← JANGAN DIUBAH
api/src/jobs/jobs.module.ts        ← JANGAN DIUBAH
src/lib/auth.tsx                   ← JANGAN DIUBAH
src/lib/api.ts                     ← boleh ditambah, tidak boleh dihapus/diubah yang sudah ada
```

### Pipeline lama tetap jalan & terlihat
- Halaman `/new`, `/projects`, `/projects/[id]` tetap ada dan accessible
- Fitur AI Clipping (yt-dlp → Groq → FFmpeg) tetap berfungsi untuk clipper individu
- Pipeline ini juga dipakai oleh Campaign Engine ketika Brand upload video
- Monetisasi fitur lama (subscription/credits per project) tetap berjalan

### Filosofi arsitektur Sprint 2
Platform kini punya **dua mode** dalam satu akun:
- **Tool Mode** (lama): User sebagai clipper mandiri → buat project → download klip → pakai sendiri
- **Campaign Mode** (baru): User sebagai Brand → buat campaign → AI matching → clipper distribusi → reward

---

## 1. User System

### Satu akun, dua peran
User yang sama bisa jadi Brand sekaligus Clipper terdaftar. Tidak ada akun terpisah.

### Perubahan tabel `users`
Tambah kolom berikut ke tabel users yang sudah ada:
```sql
ALTER TABLE users ADD COLUMN credit_balance   INTEGER NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN point_balance    INTEGER NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN is_clipper       BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE users ADD COLUMN is_brand         BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE users ADD COLUMN is_admin         BOOLEAN NOT NULL DEFAULT false;
```

Aturan:
- `is_clipper = true` → user sudah mengisi profil DNA clipper
- `is_brand = true` → user sudah pernah membuat minimal 1 campaign
- `is_admin = true` → akses admin panel (set manual via DB)
- User lama yang sudah ada: semua tetap bisa pakai Tool Mode, `is_clipper` dan `is_brand` default false

---

## 2. Tabel Database Baru

### 2.1 `clipper_profiles`
```sql
CREATE TABLE clipper_profiles (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  niches           TEXT[]   NOT NULL DEFAULT '{}',
  -- contoh niche: 'bisnis', 'edukasi', 'gaming', 'kuliner', 'motivasi', 
  --               'teknologi', 'hiburan', 'kesehatan', 'travel', 'lifestyle'
  region           VARCHAR(100),
  language         VARCHAR(50) DEFAULT 'id',
  avg_views        INTEGER DEFAULT 0,
  avg_ctr          DECIMAL(5,2) DEFAULT 0,
  score            INTEGER DEFAULT 50,  -- 0-100, dihitung otomatis
  bio              TEXT,
  social_tiktok    VARCHAR(255),
  social_youtube   VARCHAR(255),
  social_instagram VARCHAR(255),
  created_at       TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE(user_id)
);
```

### 2.2 `campaigns`
```sql
CREATE TABLE campaigns (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id         UUID NOT NULL REFERENCES users(id),
  name             VARCHAR(255) NOT NULL,
  video_url        TEXT,           -- YouTube URL yang diinput brand
  project_id       UUID REFERENCES projects(id),  -- link ke pipeline project yang diproses
  viral_score      INTEGER,        -- 0-100, rule-based
  detected_niches  TEXT[] DEFAULT '{}',
  target_platforms TEXT[] DEFAULT '{}',  -- 'tiktok', 'shorts', 'reels'
  deadline         TIMESTAMP NOT NULL,
  package_type     VARCHAR(20) NOT NULL, -- 'starter', 'growth', 'pro'
  total_credits    INTEGER NOT NULL,
  reward_pool      INTEGER NOT NULL,   -- 70% dari nilai paket
  platform_fee     INTEGER NOT NULL,   -- 30% dari nilai paket
  max_clippers     INTEGER NOT NULL,
  status           VARCHAR(30) NOT NULL DEFAULT 'draft',
  -- status flow: draft → processing → ready_review → active → completed → expired
  created_at       TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMP NOT NULL DEFAULT NOW()
);
```

### 2.3 `campaign_clippers`
```sql
CREATE TABLE campaign_clippers (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id      UUID NOT NULL REFERENCES campaigns(id),
  clipper_id       UUID NOT NULL REFERENCES users(id),
  status           VARCHAR(30) NOT NULL DEFAULT 'invited',
  -- status flow: invited → accepted → declined → submitted → verified → rewarded
  submitted_url    TEXT,
  submitted_at     TIMESTAMP,
  verified_at      TIMESTAMP,
  base_reward      INTEGER DEFAULT 0,
  performance_bonus INTEGER DEFAULT 0,
  total_reward     INTEGER DEFAULT 0,
  view_count       INTEGER,
  created_at       TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE(campaign_id, clipper_id)
);
```

### 2.4 `transactions`
```sql
CREATE TABLE transactions (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID NOT NULL REFERENCES users(id),
  type             VARCHAR(40) NOT NULL,
  -- tipe: 'credit_purchase', 'campaign_debit', 'reward_earn', 'bonus_earn',
  --       'point_withdraw_request', 'point_withdraw_done'
  amount           INTEGER NOT NULL,  -- positif = masuk, negatif = keluar
  balance_type     VARCHAR(10) NOT NULL,  -- 'credit' atau 'point'
  description      TEXT,
  reference_id     UUID,   -- campaign_id atau campaign_clipper_id tergantung konteks
  created_at       TIMESTAMP NOT NULL DEFAULT NOW()
);
```

### 2.5 `withdrawal_requests`
```sql
CREATE TABLE withdrawal_requests (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID NOT NULL REFERENCES users(id),
  amount           INTEGER NOT NULL,  -- dalam poin (1 poin = Rp1)
  bank_name        VARCHAR(100),
  account_number   VARCHAR(50),
  account_name     VARCHAR(100),
  ewallet_type     VARCHAR(50),   -- 'gopay', 'ovo', 'dana', 'shopee'
  ewallet_number   VARCHAR(50),
  status           VARCHAR(20) NOT NULL DEFAULT 'pending',
  -- pending → approved → rejected → processed
  admin_note       TEXT,
  processed_at     TIMESTAMP,
  created_at       TIMESTAMP NOT NULL DEFAULT NOW()
);
```

---

## 3. Business Logic

### 3.1 Paket Campaign
```typescript
const CAMPAIGN_PACKAGES = {
  starter: {
    price_idr:   499_000,
    credits:     50,
    max_clippers: 50,
    reward_pool: 349_300,   // 70% × 499000
    platform_fee: 149_700,  // 30% × 499000
  },
  growth: {
    price_idr:   1_499_000,
    credits:     180,
    max_clippers: 180,
    reward_pool: 1_049_300,
    platform_fee: 449_700,
  },
  pro: {
    price_idr:   3_999_000,
    credits:     500,
    max_clippers: 500,
    reward_pool: 2_799_300,
    platform_fee: 1_199_700,
  },
};
```

### 3.2 Reward per Clipper
```typescript
// Base reward per video terverifikasi
const BASE_REWARD_POINTS = 10_000; // Rp10.000

// Performance bonus berdasarkan views
function getPerformanceBonus(views: number): number {
  if (views >= 100_000) return 100_000;  // Rp100.000
  if (views >= 10_000)  return 25_000;   // Rp25.000
  if (views >= 1_000)   return 5_000;    // Rp5.000
  return 0;
}
```

### 3.3 Rule-Based Viral Score
```typescript
// Dipanggil saat Brand submit YouTube URL, sebelum pipeline jalan
function calculateViralScore(title: string, description: string): {
  score: number;
  niches: string[];
} {
  const NICHE_KEYWORDS: Record<string, string[]> = {
    bisnis:     ['bisnis', 'business', 'entrepreneur', 'startup', 'revenue', 'profit', 'uang', 'modal', 'investasi'],
    edukasi:    ['belajar', 'tutorial', 'tips', 'cara', 'bagaimana', 'how to', 'learn', 'guide', 'penjelasan'],
    gaming:     ['game', 'gaming', 'gameplay', 'esports', 'mobile legends', 'valorant', 'minecraft', 'ff', 'genshin'],
    kuliner:    ['masak', 'resep', 'makan', 'food', 'kuliner', 'restaurant', 'cafe', 'jajan', 'street food'],
    motivasi:   ['motivasi', 'inspirasi', 'sukses', 'motivation', 'mindset', 'growth', 'semangat', 'bangkit'],
    teknologi:  ['ai', 'tech', 'teknologi', 'coding', 'programming', 'software', 'digital', 'gadget', 'review'],
    hiburan:    ['lucu', 'funny', 'comedy', 'entertainment', 'viral', 'meme', 'receh', 'ngakak'],
    kesehatan:  ['sehat', 'health', 'fitness', 'olahraga', 'gym', 'diet', 'nutrisi', 'dokter', 'tips kesehatan'],
    lifestyle:  ['lifestyle', 'vlog', 'daily', 'travel', 'wisata', 'fashion', 'style', 'aesthetic'],
  };

  const text = (title + ' ' + description).toLowerCase();
  const detectedNiches = Object.entries(NICHE_KEYWORDS)
    .filter(([_, keywords]) => keywords.some(k => text.includes(k)))
    .map(([niche]) => niche);

  // Hitung skor dari faktor-faktor sederhana
  let score = 45;
  if (detectedNiches.length >= 1) score += 20;
  if (detectedNiches.length >= 2) score += 10;
  if (title.length >= 20 && title.length <= 80) score += 10;
  if (['bisnis', 'edukasi', 'teknologi', 'motivasi'].some(n => detectedNiches.includes(n))) score += 5;
  score = Math.min(score + Math.floor(Math.random() * 8), 98);

  return {
    score,
    niches: detectedNiches.length > 0 ? detectedNiches : ['umum'],
  };
}
```

### 3.4 AI Matching Logic
```typescript
// Dipanggil saat campaign status berubah dari ready_review → active (setelah pembayaran)
async function matchClippers(campaignId: string): Promise<void> {
  const campaign = await getCampaign(campaignId);

  // Ambil clipper yang nichenya overlap dengan campaign
  const candidates = await db.query(`
    SELECT cp.user_id, cp.score, cp.niches,
           COUNT(FILTER (cc.status = 'verified')) as past_verified
    FROM clipper_profiles cp
    LEFT JOIN campaign_clippers cc ON cc.clipper_id = cp.user_id AND cc.status = 'verified'
    WHERE cp.niches && $1::text[]   -- overlap array
    GROUP BY cp.user_id, cp.score, cp.niches
    ORDER BY cp.score DESC, past_verified DESC
    LIMIT $2
  `, [campaign.detected_niches, campaign.max_clippers]);

  // Buat campaign_clipper records dengan status 'invited'
  for (const candidate of candidates) {
    await db.insert('campaign_clippers', {
      campaign_id: campaignId,
      clipper_id:  candidate.user_id,
      status:      'invited',
    });
    // TODO: kirim notifikasi ke clipper (bisa email atau in-app notif)
  }
}
```

### 3.5 Withdrawal — Manual Admin (MVP)
- Clipper request withdrawal → record masuk ke `withdrawal_requests` dengan status `pending`
- Minimum withdrawal: 50.000 poin (Rp50.000)
- Admin approve/reject via admin panel
- Saat admin approve: kurangi `point_balance` user, update status → `processed`
- Otomasi disbursement via Xendit/Midtrans akan ditambah di Sprint 3

---

## 4. API Endpoints Baru (NestJS)

Semua endpoint baru menggunakan prefix `/api`. Auth via JWT Bearer (sama seperti sekarang).

### 4.1 Modul: Clipper Profile
```
GET    /api/clipper/profile          → ambil profil clipper user sendiri
PUT    /api/clipper/profile          → buat/update profil (juga set is_clipper=true)
GET    /api/clipper/campaigns        → list campaign yang di-invite untuk user ini
POST   /api/clipper/campaigns/:id/accept   → accept invite
POST   /api/clipper/campaigns/:id/decline  → decline invite
POST   /api/clipper/campaigns/:id/submit   → submit social media URL
GET    /api/clipper/earnings         → ringkasan poin + riwayat transaksi
POST   /api/clipper/withdraw         → request withdrawal
```

### 4.2 Modul: Campaign (Brand)
```
POST   /api/campaigns/viral-score    → hitung viral score dari YouTube URL (rule-based, no auth)
POST   /api/campaigns                → buat campaign baru (status: draft)
GET    /api/campaigns                → list campaigns milik brand
GET    /api/campaigns/:id            → detail campaign
PATCH  /api/campaigns/:id            → update campaign (hanya kalau masih draft)
POST   /api/campaigns/:id/pay        → trigger Midtrans Snap → kalau sukses → active + trigger matching
GET    /api/campaigns/:id/clippers   → list clipper yang di-assign ke campaign ini
```

### 4.3 Modul: Admin
```
GET    /api/admin/campaigns                    → semua campaign (semua brand)
GET    /api/admin/withdrawals                  → list withdrawal pending
PATCH  /api/admin/withdrawals/:id              → approve/reject withdrawal
POST   /api/admin/campaigns/:id/clippers/:cid/verify  → verifikasi submission clipper
GET    /api/admin/users                        → list semua user
PATCH  /api/admin/users/:id                    → toggle is_admin, is_clipper, is_brand
```

### 4.4 Wallet (shared Brand & Clipper)
```
GET    /api/wallet                   → balance credit + poin + riwayat transaksi
```

---

## 5. Frontend Routes Baru (Next.js App Router)

### Struktur folder
```
src/app/
├── (app)/                          ← sudah ada, jangan diubah strukturnya
│   ├── projects/                   ← TETAP ADA (tool mode)
│   ├── new/                        ← TETAP ADA (tool mode)
│   ├── dashboard/                  ← TETAP ADA atau buat baru sebagai home
│   │
│   ├── campaign/                   ← BARU: Brand side
│   │   ├── new/
│   │   │   └── page.tsx            ← Wizard 4-step buat campaign
│   │   ├── [id]/
│   │   │   └── page.tsx            ← Detail campaign + daftar clipper + metrik
│   │   └── page.tsx                ← List semua campaign milik brand
│   │
│   ├── clipper/                    ← BARU: Clipper side
│   │   ├── setup/
│   │   │   └── page.tsx            ← Form isi DNA profile (onboarding clipper)
│   │   ├── campaigns/
│   │   │   ├── [id]/
│   │   │   │   └── page.tsx        ← Detail campaign invite + tombol accept/submit
│   │   │   └── page.tsx            ← List campaign yang di-invite
│   │   └── earnings/
│   │       └── page.tsx            ← Saldo poin + riwayat + form withdrawal
│   │
│   ├── wallet/
│   │   └── page.tsx                ← BARU: Credit balance + transaksi (brand side)
│   │
│   └── admin/                      ← BARU (akses terbatas is_admin=true)
│       ├── withdrawals/
│       │   └── page.tsx
│       ├── campaigns/
│       │   └── page.tsx
│       └── users/
│           └── page.tsx
```

---

## 6. Detail Flow Per Halaman

### 6.1 `/campaign/new` — Wizard 4 Step

**Step 1 — Upload Video**
- Input: YouTube URL atau upload file
- Submit → panggil `POST /api/campaigns/viral-score` → tampilkan hasil:
  - Viral Score (angka besar, misal 87/100)
  - Detected niches (badge per niche)
  - Tombol "Lanjut ke Step 2"

**Step 2 — Detail Campaign**
- Input: Nama campaign, Target platform (checkbox: TikTok / Shorts / Reels), Deadline (date picker)

**Step 3 — Pilih Paket**
- 3 kartu: Starter (Rp499k / 50 clipper), Growth (Rp1.49jt / 180 clipper), Pro (Rp3.99jt / 500 clipper)
- Per kartu tampilkan: harga, estimasi clipper, estimasi reward per clipper

**Step 4 — Review & Bayar**
- Summary lengkap
- Tombol "Bayar Sekarang" → Midtrans Snap popup
- Setelah sukses: backend trigger pipeline (sama seperti `/new`) + trigger matching AI
- Redirect ke `/campaign/[id]`

### 6.2 `/campaign/[id]` — Dashboard Campaign Brand

Tampilkan:
- Status campaign (badge)
- Viral Score + niche
- Metrik: Total clipper diundang / Aktif / Submit / Verified / Total views estimasi
- Tabel clipper: nama, status, link submission, views, reward
- Progress bar reward pool terpakai

### 6.3 `/clipper/campaigns` — Inbox Clipper

- Hanya tampil campaign yang statusnya `invited` untuk user ini
- Per item: nama campaign, brand (masked: "Brand Verified"), niche, deadline, estimasi reward
- Tombol Accept / Decline

### 6.4 `/clipper/campaigns/[id]` — Detail Campaign Clipper

- Jika status `accepted`: tampilkan instruksi + tombol download aset video (klip dari pipeline)
- Form submit URL social media
- Jika status `submitted`: tampilkan "Menunggu verifikasi"
- Jika status `verified`: tampilkan reward yang diterima

### 6.5 `/clipper/earnings` — Earnings & Withdrawal

- Saldo poin saat ini (besar, prominent)
- Equivalen rupiah (poin / 1000 = Rp, atau 1 poin = Rp1 sesuai PRD)
- Riwayat transaksi (tabel: tanggal, deskripsi, jumlah poin)
- Form withdrawal:
  - Pilih metode: Bank Transfer / E-Wallet
  - Input rekening/nomor
  - Input jumlah (min 50.000 poin)
  - Submit → status `pending`, tunggu admin

### 6.6 `/admin/withdrawals`

- Tabel: user, jumlah, metode, rekening, tanggal request
- Per baris: tombol Approve / Reject + field catatan admin
- Filter: pending / approved / rejected

---

## 7. Koneksi Pipeline Lama dengan Campaign

Ketika Brand submit YouTube URL di Step 1 campaign:
1. Backend panggil rule-based viral score (tidak pakai Groq, cepat)
2. Saat Brand bayar (`POST /api/campaigns/:id/pay`) dan Midtrans sukses:
   - Buat record `projects` seperti biasa (gunakan `ProjectsService` yang sudah ada)
   - Dispatch job ke BullMQ (persis sama dengan `/new`)
   - Set `campaigns.project_id = newProject.id`
   - Campaign status → `processing`
3. Polling frontend campaign page setiap 3 detik (persis seperti `/projects/[id]`)
4. Saat project status = `ready`, campaign status → `active`, jalankan `matchClippers()`
5. Klip yang dihasilkan pipeline inilah yang bisa didownload clipper dari `/clipper/campaigns/[id]`

---

## 8. Navigasi & UX

### Navbar/Sidebar perlu menambahkan

Jika `is_clipper = true` → tampilkan menu "Kampanye Saya" → `/clipper/campaigns`
Jika pernah buat campaign (is_brand = true) → tampilkan menu "Campaign Brand" → `/campaign`
Selalu tampilkan: "Proyek" (tool mode lama) → `/projects`

### Onboarding flow

Jika user pertama kali klik "Daftar sebagai Clipper":
1. Redirect ke `/clipper/setup`
2. Isi form DNA (niches, region, language, social links)
3. Simpan → `is_clipper = true` di users, buat clipper_profiles record

---

## 9. Urutan Pengerjaan — Sesi per Sesi

### Sesi 1 — Fondasi DB & Auth Guard
**Instruksi ke Claude Code:**
> "Kerjakan hanya Sesi 1. Baca SPRINT2_PRD.md.
> Task: (1) buat migrasi Prisma/SQL untuk semua tabel baru di Section 2,
> (2) tambah kolom baru ke tabel users (Section 1),
> (3) update NestJS auth guard agar bisa cek is_admin untuk route admin.
> Jangan ubah file di api/src/jobs/ sama sekali."

### Sesi 2 — Viral Score & Campaign API (Backend)
**Instruksi ke Claude Code:**
> "Kerjakan hanya Sesi 2. Baca SPRINT2_PRD.md.
> Task: (1) buat CampaignModule di NestJS dengan semua endpoint di Section 4.2,
> (2) implementasi rule-based viral score dari Section 3.3,
> (3) buat service untuk koneksi pipeline ke campaign (Section 7).
> Jangan ubah file di api/src/jobs/ sama sekali."

### Sesi 3 — Campaign Wizard Frontend (Brand)
**Instruksi ke Claude Code:**
> "Kerjakan hanya Sesi 3. Baca SPRINT2_PRD.md.
> Task: buat halaman /campaign/new (wizard 4 step) dan /campaign/[id]
> sesuai Section 6.1 dan 6.2. Gunakan komponen UI yang sudah ada di proyek."

### Sesi 4 — Clipper Module (Backend + Frontend)
**Instruksi ke Claude Code:**
> "Kerjakan hanya Sesi 4. Baca SPRINT2_PRD.md.
> Task: (1) buat ClipperModule di NestJS (semua endpoint Section 4.1),
> (2) buat halaman /clipper/setup, /clipper/campaigns, /clipper/campaigns/[id],
> (3) buat halaman /clipper/earnings sesuai Section 6.3-6.5."

### Sesi 5 — Admin Panel & Withdrawal
**Instruksi ke Claude Code:**
> "Kerjakan hanya Sesi 5. Baca SPRINT2_PRD.md.
> Task: (1) buat AdminModule di NestJS (endpoint Section 4.3),
> (2) buat halaman /admin/withdrawals dan /admin/campaigns,
> (3) guard route admin hanya untuk is_admin=true."

### Sesi 6 — Wallet, Navigasi & Polish
**Instruksi ke Claude Code:**
> "Kerjakan hanya Sesi 6. Baca SPRINT2_PRD.md.
> Task: (1) buat /wallet page, (2) update sidebar/navbar sesuai Section 8,
> (3) buat onboarding flow clipper setup, (4) pastikan semua menu lama
> (/projects, /new) tetap ada dan accessible."

---

## 10. Hal-hal yang Sering Salah — Ingatkan Claude Code

1. **Pipeline tidak boleh diubah** — pipeline.service.ts adalah blackbox
2. **Koneksi campaign ke pipeline** lewat ProjectsService yang sudah ada, bukan membuat pipeline baru
3. **Viral score** di MVP adalah rule-based, BUKAN memanggil Groq
4. **Withdrawal** hanya manual admin, belum otomatis ke rekening
5. **Clipper dibebaskan** untuk edit video di mana saja — nineClip tidak paksa pakai tool internal
6. **User yang sama** bisa jadi clipper dan brand sekaligus — tidak ada akun terpisah
7. **Fetur lama** (Tool Mode / /projects) tetap ada, tetap punya monetisasi sendiri

---

## 11. Ringkasan Paket & Reward (Quick Reference)

| Paket | Harga | Max Clipper | Reward Pool (70%) | Platform Fee (30%) |
|---|---|---|---|---|
| Starter Pulse | Rp499.000 | 50 | Rp349.300 | Rp149.700 |
| Growth Flow | Rp1.499.000 | 180 | Rp1.049.300 | Rp449.700 |
| Pro Surge | Rp3.999.000 | 500 | Rp2.799.300 | Rp1.199.700 |

**Reward per clipper:**
- Base reward: Rp10.000 (10.000 poin) per submission terverifikasi
- Bonus 1.000–9.999 views: +Rp5.000
- Bonus 10.000–99.999 views: +Rp25.000
- Bonus 100.000+ views: +Rp100.000

**Currency:**
- Brand bayar dengan IDR → dapat Campaign Credit
- Clipper dapat Clipper Point (1 Point = Rp1)
- Minimum withdrawal: 50.000 poin (Rp50.000)
