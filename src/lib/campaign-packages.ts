import type { PackageType } from "./types";

/** Mirror dari backend (Section 3.1) — untuk tampilan wizard. */
export interface PackageMeta {
  id: PackageType;
  name: string;
  priceIdr: number;
  credits: number;
  maxClippers: number;
  rewardPool: number;
  platformFee: number;
  tagline: string;
  highlighted?: boolean;
}

export const PACKAGES: PackageMeta[] = [
  {
    id: "starter",
    name: "Starter Pulse",
    priceIdr: 499_000,
    credits: 50,
    maxClippers: 50,
    rewardPool: 349_300,
    platformFee: 149_700,
    tagline: "Coba sebar ke 50 creator pertama.",
  },
  {
    id: "growth",
    name: "Growth Flow",
    priceIdr: 1_499_000,
    credits: 180,
    maxClippers: 180,
    rewardPool: 1_049_300,
    platformFee: 449_700,
    tagline: "Skala menengah, jangkauan lebih luas.",
    highlighted: true,
  },
  {
    id: "pro",
    name: "Pro Surge",
    priceIdr: 3_999_000,
    credits: 500,
    maxClippers: 500,
    rewardPool: 2_799_300,
    platformFee: 1_199_700,
    tagline: "Distribusi masif untuk kampanye besar.",
  },
];

export function packageById(id: PackageType): PackageMeta {
  return PACKAGES.find((p) => p.id === id) ?? PACKAGES[0]!;
}

/** Estimasi reward rata-rata per clipper bila pool dibagi rata. */
export function estRewardPerClipper(pkg: PackageMeta): number {
  return Math.round(pkg.rewardPool / pkg.maxClippers);
}

export function formatIdr(n: number): string {
  return "Rp" + n.toLocaleString("id-ID");
}
