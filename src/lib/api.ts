/**
 * Typed API client untuk nineClip backend (NestJS).
 *
 * Model auth: accessToken disimpan di memori + localStorage (dipakai sebagai
 * Bearer header). Refresh token ada di HttpOnly cookie (path /api/v1/auth) yang
 * dikirim otomatis lewat credentials:"include". Saat request kena 401, client
 * mencoba refresh sekali lalu mengulang request.
 *
 * Semua fungsi mengembalikan tipe domain frontend (lihat ./types) — response
 * mentah dari backend di-map di sini, jadi komponen UI tidak perlu berubah.
 */

import type {
  AdminCampaign,
  AdminCampaignClipper,
  AdminUser,
  AdminWithdrawal,
  Campaign,
  CampaignClipper,
  CampaignStatus,
  Clip,
  ClipperCampaign,
  ClipperCampaignDetail,
  ClipperEarnings,
  ClipperProfile,
  CurrentUser,
  Invoice,
  PackageType,
  Project,
  ProcessingStage,
  ProjectStatus,
  ViralScoreResult,
  WalletData,
} from "./types";

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api/v1";

const TOKEN_KEY = "nineclip_token";

// ---------------------------------------------------------------------------
// Token storage
// ---------------------------------------------------------------------------

let accessToken: string | null = null;

export function setAccessToken(token: string | null) {
  accessToken = token;
  if (typeof window !== "undefined") {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  }
}

function getAccessToken(): string | null {
  if (accessToken) return accessToken;
  if (typeof window !== "undefined") {
    accessToken = localStorage.getItem(TOKEN_KEY);
  }
  return accessToken;
}

export function hasStoredToken(): boolean {
  return !!getAccessToken();
}

// ---------------------------------------------------------------------------
// Core fetch with refresh-on-401
// ---------------------------------------------------------------------------

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function rawFetch(
  path: string,
  opts: RequestInit,
  withAuth: boolean,
): Promise<Response> {
  const headers: Record<string, string> = {
    ...(opts.headers as Record<string, string> | undefined),
  };
  const token = getAccessToken();
  if (withAuth && token) headers["Authorization"] = `Bearer ${token}`;
  if (opts.body && !(opts.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }
  return fetch(`${API_BASE}${path}`, {
    ...opts,
    headers,
    credentials: "include",
  });
}

async function tryRefresh(): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/auth/refresh`, {
      method: "POST",
      credentials: "include",
    });
    if (!res.ok) return false;
    const data = (await res.json()) as { accessToken: string };
    setAccessToken(data.accessToken);
    return true;
  } catch {
    return false;
  }
}

async function apiFetch<T>(
  path: string,
  opts: RequestInit = {},
  withAuth = true,
): Promise<T> {
  let res = await rawFetch(path, opts, withAuth);

  if (res.status === 401 && withAuth) {
    const refreshed = await tryRefresh();
    if (refreshed) {
      res = await rawFetch(path, opts, withAuth);
    }
  }

  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as
      | { message?: string | string[] }
      | null;
    const msg = Array.isArray(body?.message)
      ? body!.message.join(", ")
      : body?.message ?? res.statusText;
    throw new ApiError(res.status, msg);
  }

  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

// ---------------------------------------------------------------------------
// Backend response shapes (parsial, hanya yang dipakai)
// ---------------------------------------------------------------------------

interface ApiUser {
  id: string;
  name: string;
  email: string;
  planId: string;
  planName: string;
  minutesUsed: number;
  minutesQuota: number;
  isBrand?: boolean;
  isClipper?: boolean;
  isAdmin?: boolean;
  primaryRole?: string;
  creditBalance?: number;
  pointBalance?: number;
}

interface ApiProjectSettings {
  clipLength?: string;
  language?: string;
  autoCaptions?: boolean;
  autoReframe?: boolean;
  viralityAnalysis?: boolean;
}

interface ApiProject {
  id: string;
  title: string;
  sourceType: string;
  sourceUrl: string | null;
  duration: number | null;
  hue: number;
  status: string;
  progress: number;
  stage: string | null;
  settings: ApiProjectSettings | null;
  createdAt: string;
  _count?: { clips: number };
}

interface ApiClip {
  id: string;
  projectId: string;
  title: string;
  start: number;
  end: number;
  hue: number;
  viralityScore: number;
  viralityReason: string | null;
  aspectRatio: string;
  hasCaptions: boolean;
  transcript: string | null;
  hashtags: string[];
}

interface ApiSubscription {
  id: string;
  planId: string;
  status: string;
  method: string | null;
  amount: number | null;
  createdAt: string;
  orderId: string | null;
}

// ---------------------------------------------------------------------------
// Mappers: backend → tipe domain frontend
// ---------------------------------------------------------------------------

function initialsOf(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

function mapUser(u: ApiUser): CurrentUser {
  const role = (u.primaryRole as CurrentUser["primaryRole"]) ?? "tool";
  return {
    name: u.name,
    email: u.email,
    initials: initialsOf(u.name),
    planId: u.planId,
    planName: u.planName,
    minutesUsed: u.minutesUsed,
    minutesQuota: u.minutesQuota,
    isBrand: u.isBrand ?? false,
    isClipper: u.isClipper ?? false,
    isAdmin: u.isAdmin ?? false,
    primaryRole: role === "brand" || role === "clipper" ? role : "tool",
    creditBalance: u.creditBalance ?? 0,
    pointBalance: u.pointBalance ?? 0,
  };
}

function mapProject(p: ApiProject): Project {
  const s = p.settings ?? {};
  return {
    id: p.id,
    title: p.title,
    sourceType: p.sourceType === "upload" ? "upload" : "youtube",
    sourceUrl: p.sourceUrl ?? "",
    duration: p.duration ?? 0,
    hue: p.hue,
    createdAt: p.createdAt,
    status: (p.status as ProjectStatus) ?? "queued",
    progress: p.progress,
    stage: (p.stage as ProcessingStage) ?? "done",
    clipsCount: p._count?.clips ?? 0,
    settings: {
      clipLength: (s.clipLength as Project["settings"]["clipLength"]) ?? "auto",
      aspectRatio: "9:16",
      language: s.language ?? "id",
      autoCaption: s.autoCaptions ?? true,
      autoReframe: s.autoReframe ?? true,
      generateHashtags: s.viralityAnalysis ?? true,
    },
  };
}

function mapClip(c: ApiClip): Clip {
  return {
    id: c.id,
    projectId: c.projectId,
    title: c.title,
    start: c.start,
    end: c.end,
    hue: c.hue,
    viralityScore: c.viralityScore,
    viralityReason: c.viralityReason ?? "",
    aspectRatio: (c.aspectRatio as Clip["aspectRatio"]) ?? "9:16",
    hasCaptions: c.hasCaptions,
    transcript: c.transcript ?? "",
    hashtags: c.hashtags,
  };
}

function mapInvoice(s: ApiSubscription): Invoice {
  const statusMap: Record<string, Invoice["status"]> = {
    active: "paid",
    expired: "paid",
    cancelled: "failed",
  };
  const methodLabels: Record<string, string> = {
    gopay: "GoPay",
    bca_va: "BCA Virtual Account",
    qris: "QRIS",
    credit_card: "Kartu Kredit",
  };
  return {
    id: s.orderId ?? s.id,
    date: s.createdAt,
    amount: s.amount ?? 0,
    plan: `${s.planId.charAt(0).toUpperCase()}${s.planId.slice(1)} (bulanan)`,
    status: statusMap[s.status] ?? "paid",
    method: s.method ? methodLabels[s.method] ?? s.method : "—",
  };
}

// ---------------------------------------------------------------------------
// Auth endpoints
// ---------------------------------------------------------------------------

export async function login(email: string, password: string): Promise<void> {
  const data = await apiFetch<{ accessToken: string }>(
    "/auth/login",
    { method: "POST", body: JSON.stringify({ email, password }) },
    false,
  );
  setAccessToken(data.accessToken);
}

export async function register(
  name: string,
  email: string,
  password: string,
  intent: "tool" | "brand" | "clipper" = "tool",
): Promise<void> {
  await apiFetch(
    "/auth/register",
    { method: "POST", body: JSON.stringify({ name, email, password, intent }) },
    false,
  );
  // auto-login setelah daftar
  await login(email, password);
}

export async function logout(): Promise<void> {
  try {
    await apiFetch("/auth/logout", { method: "POST" });
  } finally {
    setAccessToken(null);
  }
}

// ---------------------------------------------------------------------------
// Data endpoints
// ---------------------------------------------------------------------------

export async function getMe(): Promise<CurrentUser> {
  return mapUser(await apiFetch<ApiUser>("/users/me"));
}

export async function getProjects(): Promise<Project[]> {
  const list = await apiFetch<ApiProject[]>("/projects");
  return list.map(mapProject);
}

export async function getProject(id: string): Promise<Project> {
  return mapProject(await apiFetch<ApiProject>(`/projects/${id}`));
}

export async function getClips(projectId: string): Promise<Clip[]> {
  const list = await apiFetch<ApiClip[]>(`/clips/project/${projectId}`);
  return list.map(mapClip);
}

export interface CreateProjectInput {
  sourceType: "youtube" | "upload";
  sourceUrl?: string;
  title?: string;
  clipLength: string;
  language: string;
  autoCaptions: boolean;
  autoReframe: boolean;
  viralityAnalysis: boolean;
}

export async function createProject(
  input: CreateProjectInput,
  file?: File,
): Promise<Project> {
  let body: string | FormData;
  if (file) {
    const fd = new FormData();
    (Object.entries(input) as [string, unknown][]).forEach(([k, v]) => {
      if (v !== undefined) fd.append(k, String(v));
    });
    fd.append("file", file);
    body = fd;
  } else {
    body = JSON.stringify(input);
  }
  return mapProject(
    await apiFetch<ApiProject>("/projects", { method: "POST", body }),
  );
}

export async function updateProfile(name: string): Promise<CurrentUser> {
  return mapUser(
    await apiFetch<ApiUser>("/users/me", {
      method: "PATCH",
      body: JSON.stringify({ name }),
    }),
  );
}

export async function enableBrand(): Promise<CurrentUser> {
  return mapUser(await apiFetch<ApiUser>("/users/me/enable-brand", { method: "POST" }));
}

export async function enableClipper(): Promise<CurrentUser> {
  return mapUser(await apiFetch<ApiUser>("/users/me/enable-clipper", { method: "POST" }));
}

export async function getInvoices(): Promise<Invoice[]> {
  const list = await apiFetch<ApiSubscription[]>("/subscriptions/invoices");
  return list.map(mapInvoice);
}

// ---------------------------------------------------------------------------
// Campaign endpoints (Sprint 2)
// ---------------------------------------------------------------------------

interface ApiCampaign {
  id: string;
  name: string;
  videoUrl: string | null;
  projectId: string | null;
  viralScore: number | null;
  detectedNiches: string[];
  targetPlatforms: string[];
  deadline: string;
  packageType: string;
  totalCredits: number;
  rewardPool: number;
  platformFee: number;
  maxClippers: number;
  status: string;
  createdAt: string;
  _count?: { clippers: number };
}

interface ApiCampaignClipper {
  id: string;
  status: string;
  submittedUrl: string | null;
  viewCount: number | null;
  baseReward: number;
  performanceBonus: number;
  totalReward: number;
  clipper?: {
    id: string;
    name: string;
    clipperProfile?: { score: number; niches: string[] } | null;
  };
}

function mapCampaign(c: ApiCampaign): Campaign {
  return {
    id: c.id,
    name: c.name,
    videoUrl: c.videoUrl ?? "",
    projectId: c.projectId,
    viralScore: c.viralScore,
    detectedNiches: c.detectedNiches ?? [],
    targetPlatforms: c.targetPlatforms ?? [],
    deadline: c.deadline,
    packageType: (c.packageType as PackageType) ?? "starter",
    totalCredits: c.totalCredits,
    rewardPool: c.rewardPool,
    platformFee: c.platformFee,
    maxClippers: c.maxClippers,
    status: (c.status as CampaignStatus) ?? "draft",
    createdAt: c.createdAt,
    clippersCount: c._count?.clippers ?? 0,
  };
}

function mapCampaignClipper(c: ApiCampaignClipper): CampaignClipper {
  return {
    id: c.id,
    status: c.status,
    submittedUrl: c.submittedUrl,
    viewCount: c.viewCount,
    baseReward: c.baseReward,
    performanceBonus: c.performanceBonus,
    totalReward: c.totalReward,
    clipperName: c.clipper?.name ?? "Creator",
    clipperScore: c.clipper?.clipperProfile?.score ?? null,
  };
}

export async function computeViralScore(videoUrl: string): Promise<ViralScoreResult> {
  return apiFetch<ViralScoreResult>(
    "/campaigns/viral-score",
    { method: "POST", body: JSON.stringify({ videoUrl }) },
    false,
  );
}

export interface CreateCampaignInput {
  name: string;
  videoUrl: string;
  targetPlatforms: string[];
  deadline: string;
  packageType: PackageType;
}

export async function createCampaign(input: CreateCampaignInput): Promise<Campaign> {
  return mapCampaign(
    await apiFetch<ApiCampaign>("/campaigns", { method: "POST", body: JSON.stringify(input) }),
  );
}

export async function getCampaigns(): Promise<Campaign[]> {
  const list = await apiFetch<ApiCampaign[]>("/campaigns");
  return list.map(mapCampaign);
}

export async function getCampaign(id: string): Promise<Campaign> {
  return mapCampaign(await apiFetch<ApiCampaign>(`/campaigns/${id}`));
}

export async function updateCampaign(
  id: string,
  input: Partial<CreateCampaignInput>,
): Promise<Campaign> {
  return mapCampaign(
    await apiFetch<ApiCampaign>(`/campaigns/${id}`, {
      method: "PATCH",
      body: JSON.stringify(input),
    }),
  );
}

export interface PayResult {
  snapToken: string;
  redirectUrl: string;
  orderId: string;
}

export async function payCampaign(id: string): Promise<PayResult> {
  return apiFetch<PayResult>(`/campaigns/${id}/pay`, { method: "POST" });
}

/** DEV-only: simulasikan pembayaran sukses (blocked di production). */
export async function devConfirmPayCampaign(id: string): Promise<Campaign> {
  return mapCampaign(await apiFetch<ApiCampaign>(`/campaigns/${id}/pay/confirm`, { method: "POST" }));
}

export async function getCampaignClippers(id: string): Promise<CampaignClipper[]> {
  const list = await apiFetch<ApiCampaignClipper[]>(`/campaigns/${id}/clippers`);
  return list.map(mapCampaignClipper);
}

// ---------------------------------------------------------------------------
// Clipper endpoints (Sprint 2)
// ---------------------------------------------------------------------------

export interface ClipperProfileInput {
  niches: string[];
  region?: string;
  language?: string;
  bio?: string;
  socialTiktok?: string;
  socialYoutube?: string;
  socialInstagram?: string;
}

export async function getClipperProfile(): Promise<ClipperProfile | null> {
  return apiFetch<ClipperProfile | null>("/clipper/profile");
}

export async function updateClipperProfile(input: ClipperProfileInput): Promise<ClipperProfile> {
  return apiFetch<ClipperProfile>("/clipper/profile", {
    method: "PUT",
    body: JSON.stringify(input),
  });
}

export async function getClipperCampaigns(): Promise<ClipperCampaign[]> {
  return apiFetch<ClipperCampaign[]>("/clipper/campaigns");
}

export async function getClipperCampaign(id: string): Promise<ClipperCampaignDetail> {
  return apiFetch<ClipperCampaignDetail>(`/clipper/campaigns/${id}`);
}

export async function acceptInvite(id: string): Promise<void> {
  await apiFetch(`/clipper/campaigns/${id}/accept`, { method: "POST" });
}

export async function declineInvite(id: string): Promise<void> {
  await apiFetch(`/clipper/campaigns/${id}/decline`, { method: "POST" });
}

export async function submitClip(id: string, url: string): Promise<void> {
  await apiFetch(`/clipper/campaigns/${id}/submit`, {
    method: "POST",
    body: JSON.stringify({ url }),
  });
}

export async function getEarnings(): Promise<ClipperEarnings> {
  return apiFetch<ClipperEarnings>("/clipper/earnings");
}

export interface WithdrawInput {
  amount: number;
  method: "bank" | "ewallet";
  bankName?: string;
  accountNumber?: string;
  accountName?: string;
  ewalletType?: string;
  ewalletNumber?: string;
}

export async function requestWithdraw(input: WithdrawInput): Promise<void> {
  await apiFetch("/clipper/withdraw", { method: "POST", body: JSON.stringify(input) });
}

// ---------------------------------------------------------------------------
// Wallet endpoint (Sprint 2)
// ---------------------------------------------------------------------------

export async function getWallet(): Promise<WalletData> {
  return apiFetch<WalletData>('/wallet');
}

// ---------------------------------------------------------------------------
// Admin endpoints (Sprint 2) — guard is_admin di backend
// ---------------------------------------------------------------------------

export async function adminGetCampaigns(): Promise<AdminCampaign[]> {
  return apiFetch<AdminCampaign[]>("/admin/campaigns");
}

export async function adminGetCampaignClippers(id: string): Promise<AdminCampaignClipper[]> {
  return apiFetch<AdminCampaignClipper[]>(`/admin/campaigns/${id}/clippers`);
}

export async function adminVerify(
  campaignId: string,
  ccId: string,
  viewCount: number,
): Promise<void> {
  await apiFetch(`/admin/campaigns/${campaignId}/clippers/${ccId}/verify`, {
    method: "POST",
    body: JSON.stringify({ viewCount }),
  });
}

export async function adminGetWithdrawals(status?: string): Promise<AdminWithdrawal[]> {
  const q = status ? `?status=${status}` : "";
  return apiFetch<AdminWithdrawal[]>(`/admin/withdrawals${q}`);
}

export async function adminActWithdrawal(
  id: string,
  action: "approve" | "reject",
  adminNote?: string,
): Promise<void> {
  await apiFetch(`/admin/withdrawals/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ action, adminNote }),
  });
}

export async function adminGetUsers(): Promise<AdminUser[]> {
  return apiFetch<AdminUser[]>("/admin/users");
}

export async function adminUpdateUser(
  id: string,
  roles: { isAdmin?: boolean; isClipper?: boolean; isBrand?: boolean },
): Promise<void> {
  await apiFetch(`/admin/users/${id}`, { method: "PATCH", body: JSON.stringify(roles) });
}

/** Unduh aset klip (POST + Bearer → blob → trigger download di browser). */
export async function downloadClipperClip(clipId: string): Promise<void> {
  const res = await rawFetch(
    `/clipper/clips/${clipId}/download`,
    { method: "POST" },
    true,
  );
  if (!res.ok) throw new ApiError(res.status, "Gagal mengunduh klip");
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `clip-${clipId}.mp4`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
