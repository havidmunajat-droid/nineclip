# nineClip — Business Logic v2
> Dokumen ini MENGGANTIKAN Section 3 (Business Logic) di SPRINT2_PRD.md.
> Baca dokumen ini setelah SPRINT2_PRD.md. Jika ada konflik, dokumen ini yang berlaku.
> Update: seluruh fix berdasarkan review spec Kitab 9 nineClip.

---

## 0. Perubahan Utama dari v1

| # | Yang Berubah | v1 (lama) | v2 (ini) |
|---|---|---|---|
| 1 | Platform fee | 30% | 20% |
| 2 | Definisi kredit | ambigu | 1 kredit = 1 video slot |
| 3 | Sisa bonus pool | tidak didefinisikan | masuk revenue platform |
| 4 | Paket | 3 tier | 4 tier (+ Ultra) |
| 5 | Formula score | views mentah | normalized rank-based |
| 6 | Retention Rate | ada di formula | dihapus dari MVP |
| 7 | Campaign timeout | tidak ada | 30 hari absolut |
| 8 | Kompensasi brand | sistem otomatis | brand pilih via dashboard |

---

## 1. Definisi Kredit (Redefine)

```
1 Kredit = 1 Video Slot

Setiap clipper bisa mengambil 1 atau 2 slot (submit 1 atau 2 video).
Hard cap total video yang diterima = total kredit paket.
Sistem STOP menerima submission baru ketika kredit = 0,
meskipun ada clipper yang statusnya masih "accepted".
```

Aturan slot:
- Clipper ambil slot pertama → sistem kurangi 1 kredit dari campaign
- Clipper ambil slot kedua → sistem kurangi 1 kredit lagi (jika masih tersedia)
- Jika kredit habis saat clipper ingin ambil slot kedua → slot ditolak, clipper dinotifikasi
- Kredit yang di-booking timer 24 jam dihitung sebagai "reserved" (bukan dikurangi permanen)

---

## 2. Struktur Paket

```typescript
const PACKAGES = {
  starter: {
    price_idr:       499_000,
    total_credits:   50,          // = max 50 video submissions
    clipper_invited: 35,          // invited lebih dari credits/2 karena ada dropout
    kpi_views:       50_000,
    campaign_days:   7,           // Kondisi A: 7 hari sejak video pertama tervalidasi
  },
  growth: {
    price_idr:       1_499_000,
    total_credits:   120,
    clipper_invited: 70,
    kpi_views:       250_000,
    campaign_days:   7,
  },
  pro: {
    price_idr:       3_999_000,
    total_credits:   280,
    clipper_invited: 150,
    kpi_views:       600_000,
    campaign_days:   14,
  },
  ultra: {
    price_idr:       6_999_000,
    total_credits:   500,
    clipper_invited: 260,
    kpi_views:       1_000_000,
    campaign_days:   14,
  },
};
```

---

## 3. Alokasi Dana (Fund Allocation)

Setiap pembayaran brand langsung dipecah saat transaksi sukses:

```
Total Bayar Brand
    ├── 20% → Platform Fee (langsung jadi revenue platform)
    └── 80% → Clipper Pool
               ├── 60% dari Clipper Pool → Base Fund (untuk Validated Reward)
               └── 40% dari Clipper Pool → Bonus Pool (untuk Top Performer)
```

### Tabel Breakdown Per Paket

| Komponen | Starter | Growth | Pro | Ultra |
|---|---|---|---|---|
| Harga Brand | Rp499.000 | Rp1.499.000 | Rp3.999.000 | Rp6.999.000 |
| Platform Fee (20%) | Rp99.800 | Rp299.800 | Rp799.800 | Rp1.399.800 |
| Clipper Pool (80%) | Rp399.200 | Rp1.199.200 | Rp3.199.200 | Rp5.599.200 |
| Base Fund (60% pool) | Rp239.520 | Rp719.520 | Rp1.919.520 | Rp3.359.520 |
| Bonus Pool (40% pool) | Rp159.680 | Rp479.680 | Rp1.279.680 | Rp2.239.680 |

### Validated Reward per Video (Base Fund ÷ Total Kredit)

| Paket | Reward/Video | Reward/Clipper (2 video) |
|---|---|---|
| Starter | Rp4.790 | Rp9.580 |
| Growth | Rp5.996 | Rp11.992 |
| Pro | Rp6.855 | Rp13.710 |
| Ultra | Rp6.719 | Rp13.438 |

---

## 4. Aturan Validated Reward

### 4A. Syarat Mendapat Base Reward
Clipper HANYA mendapat Validated Reward jika:
1. Video sudah disubmit dan diverifikasi admin ✓
2. Total views video ≥ 200 selama masa campaign ✓
3. Campaign belum expired saat verifikasi ✓

### 4B. Roll-over Anti-Spam
```
IF views < 200:
    Validated Reward video ini = HANGUS
    Dana hangus → roll-over ke Bonus Pool kampanye tersebut
    (Bonus Pool bisa membesar dari Base Fund yang hangus)
```

### 4C. Sisa Bonus Pool → Platform Revenue
```
Setelah seluruh payout Top Performer dibayarkan:
    Sisa Bonus Pool yang tidak terdistribusi = MASUK REVENUE PLATFORM

Ini adalah additional revenue di atas Platform Fee 20%.
Catat di transactions dengan type = 'bonus_pool_residual'
```

Tabel payout Top Performer (fixed amounts):

| Peringkat | Starter | Growth | Pro | Ultra |
|---|---|---|---|---|
| Juara 1 | Rp49.580 | Rp111.992 | Rp313.710 | Rp463.438 |
| Rank 2–5 (each) | Rp29.580 | Rp51.992 | Rp113.710 | Rp163.438 |
| Rank 6–10 (each) | Rp17.580 | Rp31.992 | Rp53.710 | Rp63.438 |
| Rank 11–20 (each) | N/A | Rp15.992 | Rp31.710 | Rp27.938 |

Sisa Bonus Pool setelah payout (masuk platform):

| Paket | Bonus Pool | Total Dibayar | Sisa → Platform |
|---|---|---|---|
| Starter | Rp159.680 | ~Rp160.000 | ≈ Rp0 |
| Growth | Rp479.680 | Rp400.000 | **Rp79.680** |
| Pro | Rp1.279.680 | Rp1.080.000 | **Rp199.680** |
| Ultra | Rp2.239.680 | Rp1.445.000 | **Rp794.680** |

Effective total revenue platform per paket (fee + sisa):
- Starter: ~Rp99.800 (20%)
- Growth: ~Rp379.480 (25.3%)
- Pro: ~Rp999.480 (25%)
- Ultra: ~Rp2.194.480 (31.4%)

---

## 5. Performance Score Engine (MVP)

### Formula MVP

```typescript
// Retention Rate DIHAPUS dari MVP (butuh API platform, kompleks)
// Akan ditambahkan di Sprint 3

function calculatePerformanceScore(
  clipperViews: number,
  maxViewsInCampaign: number,  // views tertinggi di kampanye ini
  likes: number,
  comments: number,
  shares: number,
  isOriginal: boolean,         // dari AI originality check
): number {

  // Normalized Views (0–100), rank-based
  const normViews = maxViewsInCampaign > 0
    ? (clipperViews / maxViewsInCampaign) * 100
    : 0;

  // Normalized Engagement (0–100)
  // engagement_rate = (likes+comments+shares) / views, scaled to 0-100
  // typical good engagement ~5%, excellent ~10%+
  const rawEngagement = clipperViews > 0
    ? ((likes + comments + shares) / clipperViews) * 100
    : 0;
  const normEngagement = Math.min(rawEngagement * 10, 100); // scale up, cap at 100

  // Originality Check (0 atau 100 di MVP)
  const originality = isOriginal ? 100 : 0;

  // Final Score (0–100)
  const score =
    (normViews * 0.70) +
    (normEngagement * 0.20) +
    (originality * 0.10);

  return Math.round(Math.min(score, 100));
}
```

### Originality Check (MVP Simplified)
```typescript
// MVP: check hash fingerprint video yang disubmit
// Jika URL atau video fingerprint sudah ada di campaign → isOriginal = false
// Sprint 3: AI visual similarity check yang lebih canggih

async function checkOriginality(
  submittedUrl: string,
  campaignId: string,
): Promise<boolean> {
  const existing = await db.query(
    `SELECT id FROM campaign_clippers
     WHERE campaign_id = $1
       AND submitted_url = $2
       AND status IN ('submitted', 'verified', 'rewarded')`,
    [campaignId, submittedUrl]
  );
  return existing.length === 0;
}
```

### Kapan Score Dihitung
- Score per clipper dihitung **setiap 6 jam** selama campaign aktif (cron job)
- Final ranking ditentukan **saat campaign closed** (kondisi A atau B tercapai)
- Payout Bonus Pool dilakukan **H+1 setelah campaign closed**

---

## 6. Sistem Booking Kuota (24-Jam Timer)

```typescript
// Saat clipper klik "Ambil Campaign"
async function bookSlot(clipperId: string, campaignId: string): Promise<void> {
  // 1. Cek apakah kredit masih tersedia
  const campaign = await getCampaign(campaignId);
  if (campaign.credits_remaining <= 0) throw new Error('CREDITS_EXHAUSTED');

  // 2. Kurangi credits_remaining (reserved state)
  await db.query(
    `UPDATE campaigns SET credits_remaining = credits_remaining - 1 WHERE id = $1`,
    [campaignId]
  );

  // 3. Buat record campaign_clippers
  await db.insert('campaign_clippers', {
    campaign_id: campaignId,
    clipper_id: clipperId,
    status: 'accepted',
    booking_expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000), // +24 jam
  });

  // 4. Schedule auto-release job via BullMQ (delay 24 jam)
  await videoSubmitQueue.add(
    'check-booking-expiry',
    { clipperId, campaignId },
    { delay: 24 * 60 * 60 * 1000 }
  );
}

// Auto-release jika 24 jam lewat tanpa submit
async function autoReleaseSlot(clipperId: string, campaignId: string): Promise<void> {
  const record = await getCampaignClipper(clipperId, campaignId);
  if (record.status !== 'accepted') return; // sudah submit, skip

  // Kembalikan kredit ke campaign
  await db.query(
    `UPDATE campaigns SET credits_remaining = credits_remaining + 1 WHERE id = $1`,
    [campaignId]
  );

  // Update status clipper
  await db.query(
    `UPDATE campaign_clippers SET status = 'expired', updated_at = NOW()
     WHERE campaign_id = $1 AND clipper_id = $2`,
    [campaignId, clipperId]
  );

  // Penalty: clipper tidak bisa join campaign manapun selama 48 jam
  await db.query(
    `UPDATE clipper_profiles
     SET penalty_until = NOW() + INTERVAL '48 hours'
     WHERE user_id = $1`,
    [clipperId]
  );
}
```

---

## 7. Campaign Lifecycle & Timeout

### Status Flow Campaign
```
draft → processing → active → [completed | expired]
```

### Kondisi Penutupan Campaign (mana yang lebih dulu)

```typescript
// Kondisi A: Batas waktu (dihitung dari video pertama tervalidasi)
// Starter & Growth: 7 hari kalender
// Pro & Ultra: 14 hari kalender
const CAMPAIGN_DAYS = { starter: 7, growth: 7, pro: 14, ultra: 14 };

// Kondisi B: Semua kredit habis tervalidasi
const isQuotaFull = (campaign) =>
  campaign.videos_verified >= campaign.total_credits;

// Kondisi C (NEW): Absolute timeout — 30 hari sejak campaign aktif
// Mencegah campaign 'zombie' yang tidak pernah punya video tervalidasi
const ABSOLUTE_TIMEOUT_DAYS = 30;

// Cron job setiap jam: cek semua campaign aktif
async function checkCampaignExpiry(): Promise<void> {
  const campaigns = await db.query(
    `SELECT * FROM campaigns WHERE status = 'active'`
  );

  for (const c of campaigns) {
    const now = new Date();

    // Cek Kondisi C dulu (absolute)
    const activatedAt = new Date(c.activated_at);
    const absoluteDeadline = new Date(activatedAt);
    absoluteDeadline.setDate(absoluteDeadline.getDate() + ABSOLUTE_TIMEOUT_DAYS);
    if (now >= absoluteDeadline) {
      await closeCampaign(c.id, 'expired_absolute');
      continue;
    }

    // Cek Kondisi B (kuota penuh)
    if (isQuotaFull(c)) {
      await closeCampaign(c.id, 'completed_quota');
      continue;
    }

    // Cek Kondisi A (batas waktu dari video pertama tervalidasi)
    if (c.first_validated_at) {
      const deadline = new Date(c.first_validated_at);
      deadline.setDate(deadline.getDate() + CAMPAIGN_DAYS[c.package_type]);
      if (now >= deadline) {
        const kpiMet = c.total_views >= c.kpi_views;
        if (kpiMet) {
          await closeCampaign(c.id, 'completed_time');
        } else {
          await triggerKpiMissedFlow(c.id); // lihat Section 8
        }
      }
    }
  }
}
```

---

## 8. Penanganan KPI Views Tidak Tercapai

### No Refund Policy
Platform **TIDAK** melakukan refund tunai. Dana sudah terkunci di pool.

### Flow Kompensasi (Brand Pilih)

```
Campaign expired & KPI tidak tercapai
    → Status campaign: 'kpi_missed'
    → Kirim notifikasi ke brand dashboard
    → Brand diberikan pilihan dalam 48 jam:

    OPSI A: Perpanjangan Waktu 3 Hari (gratis)
    OPSI B: Voucher Diskon 20% untuk campaign berikutnya

    Jika brand tidak merespons dalam 48 jam:
    → Default: OPSI A (perpanjangan otomatis)
```

```typescript
async function triggerKpiMissedFlow(campaignId: string): Promise<void> {
  await db.query(
    `UPDATE campaigns
     SET status = 'kpi_missed',
         compensation_deadline = NOW() + INTERVAL '48 hours'
     WHERE id = $1`,
    [campaignId]
  );
  // Notifikasi ke brand (in-app + email)
  await sendBrandNotification(campaignId, 'kpi_missed');
}

async function applyCompensation(
  campaignId: string,
  choice: 'extension' | 'voucher'
): Promise<void> {
  if (choice === 'extension') {
    await db.query(
      `UPDATE campaigns
       SET status = 'active',
           extended_at = NOW(),
           extension_days = 3
       WHERE id = $1`,
      [campaignId]
    );
  } else {
    // Generate voucher 20% untuk brand
    await createVoucher(campaignId, 20);
    await db.query(
      `UPDATE campaigns SET status = 'completed' WHERE id = $1`,
      [campaignId]
    );
  }
}

// Cron: default ke extension jika 48 jam tidak ada response
async function checkCompensationDeadline(): Promise<void> {
  const overdue = await db.query(
    `SELECT id FROM campaigns
     WHERE status = 'kpi_missed'
       AND compensation_deadline < NOW()`
  );
  for (const c of overdue) {
    await applyCompensation(c.id, 'extension'); // default Opsi A
  }
}
```

---

## 9. Perubahan DB Schema dari v1

Tambahkan kolom berikut ke tabel yang sudah didefinisikan di SPRINT2_PRD.md:

### Tabel `campaigns` — tambah kolom
```sql
ALTER TABLE campaigns ADD COLUMN credits_remaining    INTEGER NOT NULL DEFAULT 0;
ALTER TABLE campaigns ADD COLUMN videos_verified      INTEGER NOT NULL DEFAULT 0;
ALTER TABLE campaigns ADD COLUMN total_views          BIGINT  NOT NULL DEFAULT 0;
ALTER TABLE campaigns ADD COLUMN first_validated_at   TIMESTAMP;
ALTER TABLE campaigns ADD COLUMN activated_at         TIMESTAMP;
ALTER TABLE campaigns ADD COLUMN extended_at          TIMESTAMP;
ALTER TABLE campaigns ADD COLUMN extension_days       INTEGER DEFAULT 0;
ALTER TABLE campaigns ADD COLUMN compensation_deadline TIMESTAMP;
-- status tambah nilai baru: 'kpi_missed'
```

### Tabel `campaign_clippers` — tambah kolom
```sql
ALTER TABLE campaign_clippers ADD COLUMN booking_expires_at TIMESTAMP;
ALTER TABLE campaign_clippers ADD COLUMN performance_score  INTEGER DEFAULT 0;
ALTER TABLE campaign_clippers ADD COLUMN final_rank         INTEGER;
ALTER TABLE campaign_clippers ADD COLUMN view_count         BIGINT  DEFAULT 0;
ALTER TABLE campaign_clippers ADD COLUMN like_count         INTEGER DEFAULT 0;
ALTER TABLE campaign_clippers ADD COLUMN comment_count      INTEGER DEFAULT 0;
ALTER TABLE campaign_clippers ADD COLUMN share_count        INTEGER DEFAULT 0;
ALTER TABLE campaign_clippers ADD COLUMN is_original        BOOLEAN DEFAULT true;
ALTER TABLE campaign_clippers ADD COLUMN slot_number        INTEGER DEFAULT 1;
-- slot_number: 1 = video pertama, 2 = video kedua clipper ini
-- status tambah nilai: 'expired' (booking hangus karena 24 jam)
```

### Tabel `clipper_profiles` — tambah kolom
```sql
ALTER TABLE clipper_profiles ADD COLUMN penalty_until TIMESTAMP;
-- jika NOW() < penalty_until → clipper tidak bisa join campaign baru
```

### Tabel `transactions` — tipe baru
```
type values tambahan:
  'bonus_pool_payout'     → payout bonus pool ke clipper top performer
  'bonus_pool_residual'   → sisa bonus pool masuk platform revenue
  'voucher_issued'        → voucher kompensasi diterbitkan
```

---

## 10. Ringkasan Logika untuk Claude Code

```
SAAT BRAND BAYAR:
  → Potong Platform Fee 20%
  → Sisihkan Base Fund 60% dari 80%
  → Sisihkan Bonus Pool 40% dari 80%
  → Set credits_remaining = total_credits
  → Campaign status = 'active', simpan activated_at

SAAT CLIPPER AMBIL SLOT:
  → Cek credits_remaining > 0
  → Cek penalty_until < NOW()
  → Kurangi credits_remaining -1
  → Set booking_expires_at = NOW() + 24 jam
  → Schedule BullMQ job auto-release

SAAT CLIPPER SUBMIT VIDEO:
  → Cek masih dalam 24 jam booking
  → Set status = 'submitted'
  → Run originality check

SAAT ADMIN VERIFIKASI:
  → Cek views >= 200
  → Jika YA: status = 'verified', bayar Validated Reward dari Base Fund
              Increment campaign.videos_verified
              Jika first_validated_at NULL: set sekarang
  → Jika TIDAK: status = 'rejected', dana hangus → tambah ke bonus_pool_remaining

SAAT CAMPAIGN CLOSED:
  → Hitung final Performance Score semua clipper
  → Rank clipper berdasarkan score
  → Bayar Bonus Pool sesuai tabel payout
  → Sisa Bonus Pool → catat sebagai 'bonus_pool_residual' (platform revenue)
  → Kirim notifikasi ke semua clipper

JIKA KPI TIDAK TERCAPAI:
  → Status = 'kpi_missed'
  → Tunggu pilihan brand 48 jam
  → Default: perpanjang 3 hari
```

---

> File ini versi: v2.0 — tanggal update sesuai tanggal implementasi Sprint 2 Session 2+
> Untuk pertanyaan logika bisnis: rujuk file ini. Untuk teknis API/DB struktur dasar: rujuk SPRINT2_PRD.md
