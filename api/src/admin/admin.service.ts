import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { LifecycleService } from '@/lifecycle/lifecycle.service';
import { ValidationService } from '@/validation/validation.service';
import { ManualApproveDto } from '@/validation/dto/manual-approve.dto';
import { UpdateUserRolesDto, VerifySubmissionDto, WithdrawalActionDto } from './dto/admin.dto';

@Injectable()
export class AdminService {
  constructor(
    private prisma: PrismaService,
    private lifecycle: LifecycleService,
    private validation: ValidationService,
  ) {}

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
   * Verifikasi submission clipper (v2) → Validated Reward via LifecycleService:
   * views ≥ 200 & original → verified + bayar rewardPerVideo + videosVerified++,
   * selain itu → rejected + roll-over ke bonus pool. Bonus pool dibayar saat close.
   */
  async verifySubmission(campaignId: string, ccId: string, dto: VerifySubmissionDto) {
    const cc = await this.prisma.campaignClipper.findUnique({ where: { id: ccId } });
    if (!cc || cc.campaignId !== campaignId) {
      throw new NotFoundException('Submission tidak ditemukan');
    }
    await this.lifecycle.applyValidatedReward(ccId, {
      viewCount: dto.viewCount,
      likeCount: dto.likeCount,
      commentCount: dto.commentCount,
      shareCount: dto.shareCount,
      isOriginal: dto.isOriginal,
    });
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

  // ── Manual verification queue (v2-6) ─────────────────────────────────────
  listManualQueue() {
    return this.validation.listManualQueue();
  }

  approveManual(ccId: string, dto: ManualApproveDto) {
    return this.validation.approveManual(ccId, dto);
  }

  rejectManual(ccId: string) {
    return this.validation.rejectManual(ccId);
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
