import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';

export const PLANS: Record<string, { name: string; minutesQuota: number; priceMonthly: number }> = {
  free: { name: 'Gratis', minutesQuota: 30, priceMonthly: 0 },
  creator: { name: 'Creator', minutesQuota: 300, priceMonthly: 149_000 },
  pro: { name: 'Pro', minutesQuota: 1200, priceMonthly: 399_000 },
};

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

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
      },
    });
    if (!user) throw new NotFoundException('User tidak ditemukan');

    const plan = PLANS[user.planId] ?? PLANS['free'];
    return { ...user, planName: plan.name, minutesQuota: plan.minutesQuota };
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
    const plan = PLANS[user.planId] ?? PLANS['free'];
    return user.minutesUsed + requestedMinutes <= plan.minutesQuota;
  }
}
