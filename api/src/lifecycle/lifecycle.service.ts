import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@/prisma/prisma.service';
import {
  CAMPAIGN_PACKAGES,
  MIN_REWARD_VIEWS,
  PackageType,
} from '@/campaigns/campaign-packages';
import { ScoringService } from '@/scoring/scoring.service';
import { getBonusPayout } from './bonus-payout';

const DAY_MS = 24 * 60 * 60 * 1000;
const ABSOLUTE_TIMEOUT_DAYS = 30; // Kondisi C — anti campaign zombie
const COMPENSATION_WINDOW_MS = 48 * 60 * 60 * 1000;
const EXTENSION_DAYS = 3; // Opsi A kompensasi
const VOUCHER_DISCOUNT = 20; // Opsi B kompensasi (%)

export interface VerifyStats {
  viewCount: number;
  likeCount?: number;
  commentCount?: number;
  shareCount?: number;
  isOriginal?: boolean;
}

@Injectable()
export class LifecycleService {
  private readonly log = new Logger(LifecycleService.name);

  constructor(
    private prisma: PrismaService,
    private scoring: ScoringService,
  ) {}

  // ── Validated Reward (Section 4 + 10) ─────────────────────────────────────
  /**
   * Dipakai admin verify (manual) & validation service (auto, v2-6).
   * views ≥ 200 & original → verified + bayar rewardPerVideo dari base fund,
   * increment videosVerified + totalViews, set firstValidatedAt (sekali).
   * Selain itu → rejected, base reward HANGUS → roll-over ke bonus pool.
   */
  async applyValidatedReward(ccId: string, stats: VerifyStats) {
    const cc = await this.prisma.campaignClipper.findUnique({
      where: { id: ccId },
      include: { campaign: true },
    });
    if (!cc) throw new NotFoundException('Submission tidak ditemukan');
    if (!['submitted', 'pending_manual_review'].includes(cc.status)) {
      throw new BadRequestException(`Tidak bisa verifikasi status "${cc.status}"`);
    }

    const campaign = cc.campaign;
    const views = Math.max(0, Math.floor(stats.viewCount));
    const isOriginal = stats.isOriginal ?? cc.isOriginal;
    const statsData = {
      viewCount: BigInt(views),
      likeCount: stats.likeCount ?? cc.likeCount,
      commentCount: stats.commentCount ?? cc.commentCount,
      shareCount: stats.shareCount ?? cc.shareCount,
      isOriginal,
    };

    if (views >= MIN_REWARD_VIEWS && isOriginal) {
      const reward = campaign.rewardPerVideo;
      await this.prisma.$transaction([
        this.prisma.campaignClipper.update({
          where: { id: ccId },
          data: { ...statsData, status: 'verified', verifiedAt: new Date(), baseReward: reward, totalReward: reward },
        }),
        this.prisma.user.update({
          where: { id: cc.clipperId },
          data: { pointBalance: { increment: reward } },
        }),
        this.prisma.transaction.create({
          data: { userId: cc.clipperId, type: 'reward_earn', amount: reward, balanceType: 'point', description: 'Validated reward', referenceId: ccId },
        }),
        this.prisma.campaign.update({
          where: { id: campaign.id },
          data: {
            videosVerified: { increment: 1 },
            totalViews: { increment: BigInt(views) },
            ...(campaign.firstValidatedAt ? {} : { firstValidatedAt: new Date() }),
          },
        }),
      ]);
      return { verified: true, reward };
    }

    // Hangus → roll-over base reward ke bonus pool (Section 4B).
    await this.prisma.$transaction([
      this.prisma.campaignClipper.update({
        where: { id: ccId },
        data: { ...statsData, status: 'rejected' },
      }),
      this.prisma.campaign.update({
        where: { id: campaign.id },
        data: { bonusPoolRemaining: { increment: campaign.rewardPerVideo } },
      }),
    ]);
    return { verified: false, rolledOver: campaign.rewardPerVideo };
  }

  // ── Penutupan campaign + distribusi bonus pool ────────────────────────────
  /**
   * Tutup campaign: recompute skor final, ranking, distribusi bonus pool
   * top-down dengan cap di pool (berhenti saat payout berikutnya > sisa),
   * residual → platform revenue.
   */
  async closeCampaign(campaignId: string, reason: string) {
    const campaign = await this.prisma.campaign.findUnique({ where: { id: campaignId } });
    if (!campaign) return { closed: false };
    if (!['active', 'kpi_missed'].includes(campaign.status)) return { closed: false };

    await this.scoring.recomputeCampaign(campaignId);

    const verified = await this.prisma.campaignClipper.findMany({
      where: { campaignId, status: 'verified' },
      orderBy: [{ performanceScore: 'desc' }, { viewCount: 'desc' }, { verifiedAt: 'asc' }],
    });

    const pkg = campaign.packageType as PackageType;
    const ops: Prisma.PrismaPromise<unknown>[] = [];
    let remaining = campaign.bonusPoolRemaining;
    let stopped = false;
    let rank = 0;
    let paid = 0;

    for (const cc of verified) {
      rank++;
      const payout = getBonusPayout(pkg, rank);
      if (!stopped && payout > 0 && payout <= remaining) {
        remaining -= payout;
        paid++;
        ops.push(
          this.prisma.campaignClipper.update({
            where: { id: cc.id },
            data: { finalRank: rank, performanceBonus: payout, totalReward: cc.baseReward + payout, status: 'rewarded' },
          }),
          this.prisma.user.update({ where: { id: cc.clipperId }, data: { pointBalance: { increment: payout } } }),
          this.prisma.transaction.create({
            data: { userId: cc.clipperId, type: 'bonus_pool_payout', amount: payout, balanceType: 'point', description: `Bonus pool rank #${rank}`, referenceId: cc.id },
          }),
        );
      } else {
        // Payout berikutnya melebihi sisa pool → berhenti bayar (Opsi top-down cap).
        if (payout > remaining) stopped = true;
        ops.push(
          this.prisma.campaignClipper.update({ where: { id: cc.id }, data: { finalRank: rank } }),
        );
      }
    }

    const residual = remaining;
    if (residual > 0) {
      const platformId = await this.getPlatformUserId();
      ops.push(
        this.prisma.transaction.create({
          data: { userId: platformId, type: 'bonus_pool_residual', amount: residual, balanceType: 'point', description: `Sisa bonus pool "${campaign.name}"`, referenceId: campaignId },
        }),
      );
    }

    const finalStatus = reason.startsWith('completed') ? 'completed' : 'expired';
    ops.push(
      this.prisma.campaign.update({ where: { id: campaignId }, data: { status: finalStatus, bonusPoolRemaining: residual } }),
    );

    await this.prisma.$transaction(ops);
    this.log.log(`Campaign ${campaignId} closed (${reason}): ${rank} ranked, ${paid} dibayar, residual ${residual}`);
    return { closed: true, status: finalStatus, ranked: rank, paid, residual };
  }

  // ── KPI missed & kompensasi (Section 8) ───────────────────────────────────
  async triggerKpiMissed(campaignId: string) {
    await this.prisma.campaign.update({
      where: { id: campaignId },
      data: { status: 'kpi_missed', compensationDeadline: new Date(Date.now() + COMPENSATION_WINDOW_MS) },
    });
    // TODO: notifikasi brand (in-app + email) — Sprint berikutnya.
  }

  async applyCompensation(campaignId: string, choice: 'extension' | 'voucher') {
    const campaign = await this.prisma.campaign.findUnique({ where: { id: campaignId } });
    if (!campaign) throw new NotFoundException('Campaign tidak ditemukan');
    if (campaign.status !== 'kpi_missed') {
      throw new BadRequestException('Campaign tidak menunggu kompensasi');
    }

    if (choice === 'extension') {
      await this.prisma.campaign.update({
        where: { id: campaignId },
        data: { status: 'active', extendedAt: new Date(), extensionDays: EXTENSION_DAYS, compensationDeadline: null },
      });
      return { applied: 'extension', days: EXTENSION_DAYS };
    }

    // Voucher 20% untuk campaign berikutnya, lalu campaign ditutup (performer tetap dibayar).
    const code = `NCV-${campaignId.slice(0, 6).toUpperCase()}-${Date.now().toString(36).slice(-4).toUpperCase()}`;
    await this.prisma.voucher.create({
      data: { brandId: campaign.brandId, campaignId, code, discountPercent: VOUCHER_DISCOUNT, expiresAt: new Date(Date.now() + 90 * DAY_MS) },
    });
    await this.prisma.transaction.create({
      data: { userId: campaign.brandId, type: 'voucher_issued', amount: VOUCHER_DISCOUNT, balanceType: 'credit', description: `Voucher diskon ${VOUCHER_DISCOUNT}% (${code})`, referenceId: campaignId },
    });
    await this.closeCampaign(campaignId, 'completed_voucher');
    return { applied: 'voucher', code };
  }

  // ── Cron tick (hourly) ─────────────────────────────────────────────────────
  /** Cek penutupan semua campaign aktif: Kondisi C → B → A (Section 7). */
  async checkExpiry() {
    const campaigns = await this.prisma.campaign.findMany({ where: { status: 'active' } });
    const now = Date.now();
    let closed = 0;
    let kpiMissed = 0;

    for (const c of campaigns) {
      // Kondisi C — absolut 30 hari sejak activatedAt.
      if (c.activatedAt && now >= c.activatedAt.getTime() + ABSOLUTE_TIMEOUT_DAYS * DAY_MS) {
        await this.closeCampaign(c.id, 'expired_absolute');
        closed++;
        continue;
      }
      // Kondisi B — semua kredit tervalidasi.
      if (c.videosVerified >= c.totalCredits) {
        await this.closeCampaign(c.id, 'completed_quota');
        closed++;
        continue;
      }
      // Kondisi A — batas waktu sejak video pertama tervalidasi (+ extension).
      if (c.firstValidatedAt) {
        const days = (CAMPAIGN_PACKAGES[c.packageType as PackageType]?.campaignDays ?? 7) + c.extensionDays;
        const deadline = c.firstValidatedAt.getTime() + days * DAY_MS;
        if (now >= deadline) {
          if (c.totalViews >= BigInt(c.kpiViews)) {
            await this.closeCampaign(c.id, 'completed_time');
            closed++;
          } else {
            await this.triggerKpiMissed(c.id);
            kpiMissed++;
          }
        }
      }
    }
    return { closed, kpiMissed };
  }

  /** Default Opsi A (extension) jika brand tidak respons dalam 48 jam. */
  async checkCompensationDeadline() {
    const overdue = await this.prisma.campaign.findMany({
      where: { status: 'kpi_missed', compensationDeadline: { lt: new Date() } },
      select: { id: true },
    });
    for (const c of overdue) await this.applyCompensation(c.id, 'extension');
    return overdue.length;
  }

  // ── Helper ─────────────────────────────────────────────────────────────────
  /** Akun sistem untuk ledger platform revenue (residual bonus pool). Lazy upsert. */
  private async getPlatformUserId(): Promise<string> {
    const u = await this.prisma.user.upsert({
      where: { email: 'platform@nineclip.local' },
      create: { email: 'platform@nineclip.local', name: 'nineClip Platform' },
      update: {},
      select: { id: true },
    });
    return u.id;
  }
}
