import { Injectable, NotFoundException, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { UpdatePackageConfigDto, UpdatePlanConfigDto, UpdatePlatformConfigDto } from './dto/app-config.dto';

const DEFAULT_PLANS = [
  {
    planId: 'free', name: 'Free', tagline: 'Coba potong video pertamamu.',
    priceMonthly: 0, priceYearly: 0, minutesPerMonth: 30, highlighted: false,
    features: ['30 menit upload / bulan', 'Klip 9:16 vertikal', 'Auto-caption dasar', 'Watermark nineClip', 'Ekspor 720p'],
  },
  {
    planId: 'creator', name: 'Creator', tagline: 'Untuk kreator yang posting rutin.',
    priceMonthly: 149_000, priceYearly: 1_490_000, minutesPerMonth: 300, highlighted: true,
    features: ['300 menit upload / bulan', 'Tanpa watermark', 'Skor viralitas + alasan AI', 'Auto-reframe wajah', 'Judul & hashtag otomatis', 'Ekspor 1080p'],
  },
  {
    planId: 'pro', name: 'Pro', tagline: 'Untuk agensi & tim konten.',
    priceMonthly: 399_000, priceYearly: 3_990_000, minutesPerMonth: 1200, highlighted: false,
    features: ['1.200 menit upload / bulan', 'Semua fitur Creator', 'Brand kit & template caption', 'Prioritas antrian proses', 'Ekspor 4K', 'Akses API (beta)'],
  },
];

// Nilai default dipakai untuk seed satu kali saja saat tabel kosong.
const DEFAULT_PACKAGES = [
  { packageType: 'starter', name: 'Starter Pulse', priceIdr: 499_000, credits: 50, maxClippers: 35, kpiViews: 50_000, campaignDays: 7, tagline: 'Coba sebar ke 35 creator pertama.', highlighted: false },
  { packageType: 'growth',  name: 'Growth Flow',   priceIdr: 1_499_000, credits: 120, maxClippers: 70, kpiViews: 250_000, campaignDays: 7, tagline: 'Skala menengah, jangkauan lebih luas.', highlighted: true },
  { packageType: 'pro',     name: 'Pro Surge',     priceIdr: 3_999_000, credits: 280, maxClippers: 150, kpiViews: 600_000, campaignDays: 14, tagline: 'Distribusi masif, 14 hari kampanye.', highlighted: false },
  { packageType: 'ultra',   name: 'Ultra Scale',   priceIdr: 6_999_000, credits: 500, maxClippers: 260, kpiViews: 1_000_000, campaignDays: 14, tagline: 'Jutaan views, skala enterprise.', highlighted: false },
];

export interface PlanConfigItem {
  id: string;
  planId: string;
  name: string;
  tagline: string;
  priceMonthly: number;
  priceYearly: number;
  minutesPerMonth: number;
  features: string[];
  highlighted: boolean;
}

export interface ComputedPackage {
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

@Injectable()
export class AppConfigService implements OnModuleInit {
  constructor(private prisma: PrismaService) {}

  async onModuleInit() {
    // Seed plan config jika tabel kosong (idempoten).
    const planCount = await this.prisma.planConfig.count();
    if (planCount === 0) {
      await this.prisma.planConfig.createMany({ data: DEFAULT_PLANS });
    }
    // Seed paket default jika tabel kosong (idempoten).
    const pkgCount = await this.prisma.packageConfig.count();
    if (pkgCount === 0) {
      await this.prisma.packageConfig.createMany({ data: DEFAULT_PACKAGES });
    }
    // Seed platform config jika belum ada.
    await this.prisma.platformConfig.upsert({
      where: { id: 'singleton' },
      create: { id: 'singleton', feePct: 20 },
      update: {},
    });
  }

  async getPackages(): Promise<ComputedPackage[]> {
    const [pkgs, platform] = await Promise.all([
      this.prisma.packageConfig.findMany({ orderBy: { priceIdr: 'asc' } }),
      this.getPlatformConfig(),
    ]);
    return pkgs.map((p) => this.compute(p, platform.feePct));
  }

  async getPackage(packageType: string): Promise<ComputedPackage | null> {
    const [pkg, platform] = await Promise.all([
      this.prisma.packageConfig.findUnique({ where: { packageType } }),
      this.getPlatformConfig(),
    ]);
    if (!pkg) return null;
    return this.compute(pkg, platform.feePct);
  }

  async getPlatformConfig() {
    return this.prisma.platformConfig.findUniqueOrThrow({ where: { id: 'singleton' } });
  }

  async updatePackage(packageType: string, dto: UpdatePackageConfigDto): Promise<ComputedPackage[]> {
    const exists = await this.prisma.packageConfig.findUnique({ where: { packageType } });
    if (!exists) throw new NotFoundException(`Paket '${packageType}' tidak ditemukan`);
    await this.prisma.packageConfig.update({ where: { packageType }, data: dto });
    return this.getPackages();
  }

  async updatePlatformConfig(dto: UpdatePlatformConfigDto): Promise<ComputedPackage[]> {
    await this.prisma.platformConfig.update({ where: { id: 'singleton' }, data: { feePct: dto.feePct } });
    return this.getPackages();
  }

  // ── Subscription plans ───────────────────────────────────────────────────────

  async getPlans(): Promise<PlanConfigItem[]> {
    return this.prisma.planConfig.findMany({ orderBy: { priceMonthly: 'asc' } });
  }

  async getPlan(planId: string): Promise<PlanConfigItem | null> {
    return this.prisma.planConfig.findUnique({ where: { planId } });
  }

  async updatePlan(planId: string, dto: UpdatePlanConfigDto): Promise<PlanConfigItem[]> {
    const exists = await this.prisma.planConfig.findUnique({ where: { planId } });
    if (!exists) throw new NotFoundException(`Plan '${planId}' tidak ditemukan`);
    await this.prisma.planConfig.update({ where: { planId }, data: dto });
    return this.getPlans();
  }

  private compute(
    pkg: { id: string; packageType: string; name: string; priceIdr: number; credits: number; maxClippers: number; kpiViews: number; campaignDays: number; tagline: string; highlighted: boolean },
    feePct: number,
  ): ComputedPackage {
    const platformFee = Math.round(pkg.priceIdr * feePct / 100);
    const clipperPool = pkg.priceIdr - platformFee;
    const baseFund = Math.round(clipperPool * 0.6);
    const bonusPool = clipperPool - baseFund;
    const rewardPerVideo = pkg.credits > 0 ? Math.floor(baseFund / pkg.credits) : 0;
    return { ...pkg, feePct, platformFee, clipperPool, baseFund, bonusPool, rewardPerVideo };
  }
}
