/**
 * Core domain types for nineClip — an AI long-form → short-form clipping tool.
 * These mirror what the NestJS API will eventually return, so the mock layer
 * can be swapped for real fetches without touching the UI.
 */

export type AspectRatio = "9:16" | "1:1" | "16:9";

/** User-selected target length per generated clip. */
export type ClipLengthPreset = "auto" | "lt30" | "30to60" | "60to90";

export const CLIP_LENGTH_LABELS: Record<ClipLengthPreset, string> = {
  auto: "Auto (rekomendasi AI)",
  lt30: "< 30 detik",
  "30to60": "30 – 60 detik",
  "60to90": "60 – 90 detik",
};

export type SourceType = "youtube" | "upload";

export type ProjectStatus = "queued" | "processing" | "ready" | "failed";

export type ProcessingStage =
  | "download"
  | "transcribe"
  | "analyze"
  | "clip"
  | "reframe"
  | "caption"
  | "done";

export interface ProjectSettings {
  clipLength: ClipLengthPreset;
  aspectRatio: AspectRatio;
  language: string;
  autoCaption: boolean;
  autoReframe: boolean;
  generateHashtags: boolean;
}

export interface Project {
  id: string;
  title: string;
  sourceType: SourceType;
  sourceUrl: string;
  /** seconds */
  duration: number;
  /** decorative gradient seed for the mock thumbnail */
  hue: number;
  createdAt: string;
  status: ProjectStatus;
  /** 0..100 — only meaningful while processing */
  progress: number;
  stage: ProcessingStage;
  clipsCount: number;
  settings: ProjectSettings;
}

export interface Clip {
  id: string;
  projectId: string;
  title: string;
  /** seconds within the source video */
  start: number;
  end: number;
  hue: number;
  /** 0..100 predicted virality */
  viralityScore: number;
  viralityReason: string;
  aspectRatio: AspectRatio;
  hasCaptions: boolean;
  transcript: string;
  hashtags: string[];
}

/** A single point on the engagement / virality timeline. */
export interface EngagementPoint {
  /** seconds */
  t: number;
  /** 0..100 */
  score: number;
}

export interface Plan {
  id: string;
  name: string;
  tagline: string;
  priceMonthly: number;
  priceYearly: number;
  minutesPerMonth: number;
  features: string[];
  highlighted?: boolean;
}

export type PrimaryRole = "tool" | "brand" | "clipper";

export interface CurrentUser {
  name: string;
  email: string;
  initials: string;
  planId: string;
  planName: string;
  minutesUsed: number;
  minutesQuota: number;
  // Sprint 2 — peran & saldo
  isBrand: boolean;
  isClipper: boolean;
  isAdmin: boolean;
  primaryRole: PrimaryRole;
  creditBalance: number;
  pointBalance: number;
}

export interface Invoice {
  id: string;
  date: string;
  amount: number;
  plan: string;
  status: "paid" | "pending" | "failed";
  method: string;
}

// ── Sprint 2 — Campaign Engine ──────────────────────────────────────────────

export type PackageType = "starter" | "growth" | "pro" | "ultra";

export type CampaignStatus =
  | "draft"
  | "processing"
  | "ready_review"
  | "active"
  | "kpi_missed"
  | "completed"
  | "expired";

export interface Campaign {
  id: string;
  name: string;
  videoUrl: string;
  projectId: string | null;
  viralScore: number | null;
  detectedNiches: string[];
  targetPlatforms: string[];
  deadline: string;
  packageType: PackageType;
  totalCredits: number;
  rewardPool: number;
  platformFee: number;
  maxClippers: number;
  status: CampaignStatus;
  createdAt: string;
  clippersCount: number;
}

export interface CampaignClipper {
  id: string;
  status: string;
  submittedUrl: string | null;
  viewCount: number | null;
  baseReward: number;
  performanceBonus: number;
  totalReward: number;
  clipperName: string;
  clipperScore: number | null;
}

export interface ViralScoreResult {
  score: number;
  niches: string[];
  title: string;
}

// ── Clipper side ────────────────────────────────────────────────────────────

export interface ClipperProfile {
  niches: string[];
  region: string | null;
  language: string;
  bio: string | null;
  socialTiktok: string | null;
  socialYoutube: string | null;
  socialInstagram: string | null;
  score: number;
}

export interface ClipperCampaign {
  campaignId: string;
  name: string;
  brand: string;
  niches: string[];
  targetPlatforms: string[];
  deadline: string;
  campaignStatus: string;
  viralScore: number | null;
  /** Status keanggotaan clipper: invited | accepted | declined | submitted |
   *  pending_manual_review | verified | rewarded | rejected | expired */
  status: string;
  submittedUrl: string | null;
  submittedAt: string | null;
  bookingExpiresAt: string | null;
  platform: string | null;
  baseReward: number;
  performanceBonus: number;
  performanceScore: number;
  totalReward: number;
  viewCount: number | null;
  estimatedBaseReward: number;
}

export interface SocialVerificationStatus {
  tiktok: { verified: boolean; username: string | null };
  youtube: { verified: boolean; username: string | null };
  instagram: { verified: boolean; username: string | null };
  anyVerified: boolean;
}

export interface AdminManualVerification {
  id: string;
  status: string;
  submittedUrl: string | null;
  platform: string | null;
  submittedAt: string | null;
  campaign: { id: string; name: string; packageType: string };
  clipper: { id: string; name: string; email: string };
}

export interface ClipperClip {
  id: string;
  title: string;
  duration: number;
  viralityScore: number;
  aspectRatio: string;
  hasCaptions: boolean;
  hashtags: string[];
}

export interface ClipperCampaignDetail extends ClipperCampaign {
  clips: ClipperClip[];
}

export interface PointTransaction {
  id: string;
  type: string;
  amount: number;
  description: string | null;
  createdAt: string;
}

export interface WithdrawalRequest {
  id: string;
  amount: number;
  status: string;
  bankName: string | null;
  accountNumber: string | null;
  ewalletType: string | null;
  ewalletNumber: string | null;
  createdAt: string;
}

export interface ClipperEarnings {
  pointBalance: number;
  transactions: PointTransaction[];
  withdrawals: WithdrawalRequest[];
}

// ── Wallet ──────────────────────────────────────────────────────────────────

export interface WalletTransaction {
  id: string;
  type: string;
  amount: number;
  balanceType: string;
  description: string | null;
  createdAt: string;
}

export interface WalletData {
  creditBalance: number;
  pointBalance: number;
  transactions: WalletTransaction[];
}

// ── App Config (admin-configurable pricing) ─────────────────────────────────

export interface PackageConfigItem {
  id: string;
  packageType: string;
  name: string;
  priceIdr: number;
  credits: number;
  maxClippers: number;
  kpiViews: number;
  campaignDays: number;
  tagline: string;
  highlighted: boolean;
  // computed
  feePct: number;
  platformFee: number;
  clipperPool: number;
  baseFund: number;
  bonusPool: number;
  rewardPerVideo: number;
}

export interface AppConfig {
  packages: PackageConfigItem[];
  platform: { id: string; feePct: number };
}

// ── Admin side ──────────────────────────────────────────────────────────────

export interface AdminCampaign {
  id: string;
  name: string;
  status: CampaignStatus;
  packageType: string;
  viralScore: number | null;
  rewardPool: number;
  maxClippers: number;
  createdAt: string;
  brand: { id: string; name: string; email: string };
  _count: { clippers: number };
}

export interface AdminCampaignClipper {
  id: string;
  status: string;
  submittedUrl: string | null;
  viewCount: number | null;
  baseReward: number;
  performanceBonus: number;
  totalReward: number;
  clipper: { id: string; name: string; email: string };
}

export interface AdminWithdrawal {
  id: string;
  amount: number;
  status: string;
  bankName: string | null;
  accountNumber: string | null;
  accountName: string | null;
  ewalletType: string | null;
  ewalletNumber: string | null;
  adminNote: string | null;
  createdAt: string;
  user: { id: string; name: string; email: string };
}

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  planId: string;
  isAdmin: boolean;
  isClipper: boolean;
  isBrand: boolean;
  primaryRole: string;
  creditBalance: number;
  pointBalance: number;
  createdAt: string;
}
