import type { PackageType } from "./types";

/** Mirror dari backend campaign-packages.ts (Business Logic v2 Section 3). */
export interface PackageMeta {
  id: PackageType;
  name: string;
  priceIdr: number;
  credits: number;     // = slot video total (hard cap)
  maxClippers: number; // = clipperInvited (lebih besar dari credits)
  rewardPool: number;  // 80% harga → clipper pool
  platformFee: number; // 20% harga
  baseFund: number;    // 60% pool → validated reward
  bonusPool: number;   // 40% pool → top performer
  rewardPerVideo: number; // baseFund ÷ credits
  kpiViews: number;
  campaignDays: number;
  tagline: string;
  highlighted?: boolean;
}

export const PACKAGES: PackageMeta[] = [
  {
    id: "starter",
    name: "Starter Pulse",
    priceIdr: 499_000,
    credits: 50,
    maxClippers: 35,
    rewardPool: 399_200,
    platformFee: 99_800,
    baseFund: 239_520,
    bonusPool: 159_680,
    rewardPerVideo: 4_790,
    kpiViews: 50_000,
    campaignDays: 7,
    tagline: "Coba sebar ke 35 creator pertama.",
  },
  {
    id: "growth",
    name: "Growth Flow",
    priceIdr: 1_499_000,
    credits: 120,
    maxClippers: 70,
    rewardPool: 1_199_200,
    platformFee: 299_800,
    baseFund: 719_520,
    bonusPool: 479_680,
    rewardPerVideo: 5_996,
    kpiViews: 250_000,
    campaignDays: 7,
    tagline: "Skala menengah, jangkauan lebih luas.",
    highlighted: true,
  },
  {
    id: "pro",
    name: "Pro Surge",
    priceIdr: 3_999_000,
    credits: 280,
    maxClippers: 150,
    rewardPool: 3_199_200,
    platformFee: 799_800,
    baseFund: 1_919_520,
    bonusPool: 1_279_680,
    rewardPerVideo: 6_855,
    kpiViews: 600_000,
    campaignDays: 14,
    tagline: "Distribusi masif, 14 hari kampanye.",
  },
  {
    id: "ultra",
    name: "Ultra Scale",
    priceIdr: 6_999_000,
    credits: 500,
    maxClippers: 260,
    rewardPool: 5_599_200,
    platformFee: 1_399_800,
    baseFund: 3_359_520,
    bonusPool: 2_239_680,
    rewardPerVideo: 6_719,
    kpiViews: 1_000_000,
    campaignDays: 14,
    tagline: "Jutaan views, skala enterprise.",
  },
];

export function packageById(id: PackageType): PackageMeta {
  return PACKAGES.find((p) => p.id === id) ?? PACKAGES[0]!;
}

/** Estimasi reward per clipper dari base fund (validated reward) per video. */
export function estRewardPerClipper(pkg: PackageMeta): number {
  return pkg.rewardPerVideo;
}

export function formatIdr(n: number): string {
  return "Rp" + n.toLocaleString("id-ID");
}
