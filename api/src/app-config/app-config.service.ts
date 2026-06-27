import { Injectable, NotFoundException, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { UpdatePackageConfigDto, UpdatePlatformConfigDto } from './dto/app-config.dto';

// Nilai default dipakai untuk seed satu kali saja saat tabel kosong.
const DEFAULT_PACKAGES = [
  { packageType: 'starter', name: 'Starter Pulse', priceIdr: 499_000, credits: 50, maxClippers: 35, kpiViews: 50_000, campaignDays: 7, tagline: 'Coba sebar ke 35 creator pertama.', highlighted: false },
  { packageType: 'growth',  name: 'Growth Flow',   priceIdr: 1_499_000, credits: 120, maxClippers: 70, kpiViews: 250_000, campaignDays: 7, tagline: 'Skala menengah, jangkauan lebih luas.', highlighted: true },
  { packageType: 'pro',     name: 'Pro Surge',     priceIdr: 3_999_000, credits: 280, maxClippers: 150, kpiViews: 600_000, campaignDays: 14, tagline: 'Distribusi masif, 14 hari kampanye.', highlighted: false },
  { packageType: 'ultra',   name: 'Ultra Scale',   priceIdr: 6_999_000, credits: 500, maxClippers: 260, kpiViews: 1_000_000, campaignDays: 14, tagline: 'Jutaan views, skala enterprise.', highlighted: false },
];

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
    // Seed paket default jika tabel kosong (idempoten).
    const count = await this.prisma.packageConfig.count();
    if (count === 0) {
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
