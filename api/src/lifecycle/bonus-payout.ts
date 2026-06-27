import { PackageType } from '@/campaigns/campaign-packages';

interface PayoutTier {
  rank1: number;
  rank2to5: number; // per orang
  rank6to10: number; // per orang
  rank11to20: number; // per orang
}

// Section 4C BUSINESS_LOGIC_v2 — nominal payout per peringkat (per orang).
const BONUS_PAYOUT: Record<PackageType, PayoutTier> = {
  starter: { rank1: 49_580, rank2to5: 29_580, rank6to10: 17_580, rank11to20: 0 },
  growth: { rank1: 111_992, rank2to5: 51_992, rank6to10: 31_992, rank11to20: 15_992 },
  pro: { rank1: 313_710, rank2to5: 113_710, rank6to10: 53_710, rank11to20: 31_710 },
  ultra: { rank1: 463_438, rank2to5: 163_438, rank6to10: 63_438, rank11to20: 27_938 },
};

/** Nominal payout untuk final rank (1-based) sesuai paket. 0 jika di luar tier. */
export function getBonusPayout(pkg: PackageType, rank: number): number {
  const t = BONUS_PAYOUT[pkg];
  if (!t) return 0;
  if (rank === 1) return t.rank1;
  if (rank <= 5) return t.rank2to5;
  if (rank <= 10) return t.rank6to10;
  if (rank <= 20) return t.rank11to20;
  return 0;
}
