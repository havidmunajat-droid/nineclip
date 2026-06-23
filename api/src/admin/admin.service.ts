import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { BASE_REWARD_POINTS, getPerformanceBonus } from '@/campaigns/campaign-packages';
import { UpdateUserRolesDto, VerifySubmissionDto, WithdrawalActionDto } from './dto/admin.dto';

@Injectable()
export class AdminService {
  constructor(private prisma: PrismaService) {}

  // ── Campaigns (semua brand) ───────────────────────────────────────────────
  listCampaigns() {
    return this.prisma.campaign.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        brand: { select: { id: true, name: true, email: true } },
        _count: { select: { clippers: true } },
      },
    });
  }

  listCampaignClippers(campaignId: string) {
    return this.prisma.campaignClipper.findMany({
      where: { campaignId },
      orderBy: { createdAt: 'desc' },
      include: { clipper: { select: { id: true, name: true, email: true } } },
    });
  }

  /**
   * Verifikasi submission clipper → hitung reward (base + bonus views),
   * kreditkan ke point_balance, catat transaksi. Idempotent via guard status.
   */
  async verifySubmission(campaignId: string, ccId: string, dto: VerifySubmissionDto) {
    const cc = await this.prisma.campaignClipper.findUnique({ where: { id: ccId } });
    if (!cc || cc.campaignId !== campaignId) {
      throw new NotFoundException('Submission tidak ditemukan');
    }
    if (cc.status !== 'submitted') {
      throw new BadRequestException(`Tidak bisa verifikasi status "${cc.status}"`);
    }

    const baseReward = BASE_REWARD_POINTS;
    const performanceBonus = getPerformanceBonus(dto.viewCount);
    const totalReward = baseReward + performanceBonus;

    await this.prisma.$transaction([
      this.prisma.campaignClipper.update({
        where: { id: ccId },
        data: {
          status: 'verified',
          verifiedAt: new Date(),
          viewCount: dto.viewCount,
          baseReward,
          performanceBonus,
          totalReward,
        },
      }),
      this.prisma.user.update({
        where: { id: cc.clipperId },
        data: { pointBalance: { increment: totalReward } },
      }),
      this.prisma.transaction.create({
        data: {
          userId: cc.clipperId,
          type: 'reward_earn',
          amount: baseReward,
          balanceType: 'point',
          description: 'Reward verifikasi klip',
          referenceId: ccId,
        },
      }),
      ...(performanceBonus > 0
        ? [
            this.prisma.transaction.create({
              data: {
                userId: cc.clipperId,
                type: 'bonus_earn',
                amount: performanceBonus,
                balanceType: 'point',
                description: `Bonus performa ${dto.viewCount.toLocaleString('id-ID')} views`,
                referenceId: ccId,
              },
            }),
          ]
        : []),
    ]);

    return this.prisma.campaignClipper.findUniqueOrThrow({ where: { id: ccId } });
  }

  // ── Withdrawals ───────────────────────────────────────────────────────────
  listWithdrawals(status?: string) {
    return this.prisma.withdrawalRequest.findMany({
      where: status ? { status } : undefined,
      orderBy: { createdAt: 'desc' },
      include: { user: { select: { id: true, name: true, email: true } } },
    });
  }

  async actOnWithdrawal(id: string, dto: WithdrawalActionDto) {
    const wr = await this.prisma.withdrawalRequest.findUnique({ where: { id } });
    if (!wr) throw new NotFoundException('Permintaan penarikan tidak ditemukan');
    if (wr.status !== 'pending') {
      throw new BadRequestException(`Permintaan sudah "${wr.status}"`);
    }

    if (dto.action === 'reject') {
      return this.prisma.withdrawalRequest.update({
        where: { id },
        data: { status: 'rejected', adminNote: dto.adminNote, processedAt: new Date() },
      });
    }

    // approve → potong saldo poin + catat transaksi + status processed
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: wr.userId },
      select: { pointBalance: true },
    });
    if (user.pointBalance < wr.amount) {
      throw new BadRequestException('Saldo poin user tidak cukup');
    }

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: wr.userId },
        data: { pointBalance: { decrement: wr.amount } },
      }),
      this.prisma.transaction.create({
        data: {
          userId: wr.userId,
          type: 'point_withdraw_done',
          amount: -wr.amount,
          balanceType: 'point',
          description: 'Penarikan poin diproses',
          referenceId: id,
        },
      }),
      this.prisma.withdrawalRequest.update({
        where: { id },
        data: { status: 'processed', adminNote: dto.adminNote, processedAt: new Date() },
      }),
    ]);

    return this.prisma.withdrawalRequest.findUniqueOrThrow({ where: { id } });
  }

  // ── Users ─────────────────────────────────────────────────────────────────
  listUsers() {
    return this.prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        email: true,
        planId: true,
        isAdmin: true,
        isClipper: true,
        isBrand: true,
        primaryRole: true,
        creditBalance: true,
        pointBalance: true,
        createdAt: true,
      },
    });
  }

  async updateUserRoles(id: string, dto: UpdateUserRolesDto) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('User tidak ditemukan');

    const data: Record<string, boolean> = {};
    if (dto.isAdmin !== undefined) data.isAdmin = dto.isAdmin;
    if (dto.isClipper !== undefined) data.isClipper = dto.isClipper;
    if (dto.isBrand !== undefined) data.isBrand = dto.isBrand;

    return this.prisma.user.update({
      where: { id },
      data,
      select: { id: true, isAdmin: true, isClipper: true, isBrand: true },
    });
  }
}
