// Sprint 2 — Section 3.1 Paket Campaign & Section 3.2 Reward
// Single source of truth untuk ekonomi campaign (harga, kredit, reward pool, fee).

export type PackageType = 'starter' | 'growth' | 'pro';

export interface CampaignPackage {
  priceIdr: number;
  credits: number;
  maxClippers: number;
  rewardPool: number; // 70% dari nilai paket
  platformFee: number; // 30% dari nilai paket
}

export const CAMPAIGN_PACKAGES: Record<PackageType, CampaignPackage> = {
  starter: {
    priceIdr: 499_000,
    credits: 50,
    maxClippers: 50,
    rewardPool: 349_300, // 70% × 499000
    platformFee: 149_700, // 30% × 499000
  },
  growth: {
    priceIdr: 1_499_000,
    credits: 180,
    maxClippers: 180,
    rewardPool: 1_049_300,
    platformFee: 449_700,
  },
  pro: {
    priceIdr: 3_999_000,
    credits: 500,
    maxClippers: 500,
    rewardPool: 2_799_300,
    platformFee: 1_199_700,
  },
};

// Section 3.2 — Reward per Clipper
export const BASE_REWARD_POINTS = 10_000; // Rp10.000 per submission terverifikasi

export function getPerformanceBonus(views: number): number {
  if (views >= 100_000) return 100_000; // Rp100.000
  if (views >= 10_000) return 25_000; // Rp25.000
  if (views >= 1_000) return 5_000; // Rp5.000
  return 0;
}

export const MIN_WITHDRAWAL_POINTS = 50_000; // Section 11 — minimum withdrawal Rp50.000
