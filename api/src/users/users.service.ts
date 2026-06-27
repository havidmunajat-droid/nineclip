import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { AppConfigService } from '@/app-config/app-config.service';

// Fallback statis — dipakai jika DB belum ter-seed (startup race condition).
const PLAN_FALLBACK: Record<string, { name: string; minutesPerMonth: number }> = {
  free:    { name: 'Free',    minutesPerMonth: 30 },
  creator: { name: 'Creator', minutesPerMonth: 300 },
  pro:     { name: 'Pro',     minutesPerMonth: 1200 },
};

@Injectable()
export class UsersService {
  constructor(
    private prisma: PrismaService,
    private appConfig: AppConfigService,
  ) {}

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        planId: true,
        minutesUsed: true,
        createdAt: true,
        // Sprint 2 — peran & saldo untuk routing dashboard + wallet
        isBrand: true,
        isClipper: true,
        isAdmin: true,
        primaryRole: true,
        creditBalance: true,
        pointBalance: true,
        tncAcceptedAt: true,
      },
    });
    if (!user) throw new NotFoundException('User tidak ditemukan');

    const plan = (await this.appConfig.getPlan(user.planId)) ?? PLAN_FALLBACK[user.planId] ?? PLAN_FALLBACK['free']!;
    return { ...user, planName: plan.name, minutesQuota: plan.minutesPerMonth };
  }

  /** Settings → "Aktifkan mode Brand". Idempotent. */
  async enableBrand(userId: string) {
    await this.prisma.user.update({ where: { id: userId }, data: { isBrand: true } });
    return this.getProfile(userId);
  }

  /**
   * Settings → "Daftar sebagai Creator". Set is_clipper; DNA profile diisi
   * setelahnya lewat /clipper/setup (ClipperModule). Idempotent.
   */
  async enableClipper(userId: string) {
    await this.prisma.user.update({ where: { id: userId }, data: { isClipper: true } });
    return this.getProfile(userId);
  }

  async updateProfile(userId: string, data: { name?: string }) {
    return this.prisma.user.update({
      where: { id: userId },
      data,
      select: { id: true, name: true, email: true, planId: true },
    });
  }

  async deductMinutes(userId: string, minutes: number) {
    await this.prisma.user.update({
      where: { id: userId },
      data: { minutesUsed: { increment: minutes } },
    });
  }

  async hasQuota(userId: string, requestedMinutes: number): Promise<boolean> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) return false;
    const plan = (await this.appConfig.getPlan(user.planId)) ?? PLAN_FALLBACK[user.planId] ?? PLAN_FALLBACK['free']!;
    return user.minutesUsed + requestedMinutes <= plan.minutesPerMonth;
  }
}
