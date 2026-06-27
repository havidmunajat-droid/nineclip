// Business Logic v2 — Section 2 & 3 (BUSINESS_LOGIC_v2.md)
// Single source of truth ekonomi campaign: paket, alokasi dana, reward.
// Jika konflik dengan SPRINT2_PRD.md → file BUSINESS_LOGIC_v2.md yang berlaku.

export type PackageType = 'starter' | 'growth' | 'pro' | 'ultra';

export interface CampaignPackage {
  priceIdr: number;
  credits: number; // 1 kredit = 1 slot video (hard cap total submission)
  clipperInvited: number; // jumlah clipper diundang (lebih besar dari credits/2: antisipasi dropout)
  kpiViews: number; // target total views campaign
  campaignDays: number; // Kondisi A: 7 (starter/growth) | 14 (pro/ultra)
}

export const CAMPAIGN_PACKAGES: Record<PackageType, CampaignPackage> = {
  starter: { priceIdr: 499_000, credits: 50, clipperInvited: 35, kpiViews: 50_000, campaignDays: 7 },
  growth: { priceIdr: 1_499_000, credits: 120, clipperInvited: 70, kpiViews: 250_000, campaignDays: 7 },
  pro: { priceIdr: 3_999_000, credits: 280, clipperInvited: 150, kpiViews: 600_000, campaignDays: 14 },
  ultra: { priceIdr: 6_999_000, credits: 500, clipperInvited: 260, kpiViews: 1_000_000, campaignDays: 14 },
};

// ── Section 3 — Alokasi Dana ────────────────────────────────────────────────
// Total bayar brand → 20% platform fee + 80% clipper pool.
// Clipper pool → 60% base fund (validated reward) + 40% bonus pool (top performer).
export const PLATFORM_FEE_RATE = 0.2;
export const BASE_FUND_RATE = 0.6; // dari clipper pool
export const BONUS_POOL_RATE = 0.4; // dari clipper pool

export interface FundAllocation {
  platformFee: number; // 20% harga
  clipperPool: number; // 80% harga (disimpan juga sebagai rewardPool utk kompat)
  baseFund: number; // 60% pool → Validated Reward
  bonusPool: number; // 40% pool → Top Performer
  rewardPerVideo: number; // baseFund ÷ credits (Validated Reward per video)
}

/**
 * Hitung alokasi dana saat brand bayar. Memakai pembulatan yang mereproduksi
 * tabel BUSINESS_LOGIC_v2 Section 3 persis (mis. Starter reward/video Rp4.790).
 */
export function computeFundAllocation(priceIdr: number, credits: number): FundAllocation {
  const platformFee = Math.round(priceIdr * PLATFORM_FEE_RATE);
  const clipperPool = priceIdr - platformFee; // sisa = 80%
  const baseFund = Math.round(clipperPool * BASE_FUND_RATE);
  const bonusPool = clipperPool - baseFund; // sisa = 40%
  const rewardPerVideo = credits > 0 ? Math.floor(baseFund / credits) : 0;
  return { platformFee, clipperPool, baseFund, bonusPool, rewardPerVideo };
}

// ── Withdrawal ──────────────────────────────────────────────────────────────
export const MIN_WITHDRAWAL_POINTS = 50_000; // minimum withdrawal Rp50.000
export const MIN_REWARD_VIEWS = 200; // Section 4A — ambang views minimum dapat reward

// ── DEPRECATED (v1) — masih dipakai admin verify lama; diganti di v2-3/v2-4 ───
// v2 reward = rewardPerVideo (validated) + bonus pool by rank, bukan formula ini.
/** @deprecated v1 — dihapus saat reward engine v2 (v2-3/v2-4) aktif. */
export const BASE_REWARD_POINTS = 10_000;
/** @deprecated v1 — diganti Performance Score + Bonus Pool payout di v2-3/v2-4. */
export function getPerformanceBonus(views: number): number {
  if (views >= 100_000) return 100_000;
  if (views >= 10_000) return 25_000;
  if (views >= 1_000) return 5_000;
  return 0;
}
