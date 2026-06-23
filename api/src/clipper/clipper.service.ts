import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { BASE_REWARD_POINTS, MIN_WITHDRAWAL_POINTS } from '@/campaigns/campaign-packages';
import { UpdateClipperProfileDto } from './dto/update-profile.dto';
import { SubmitDto } from './dto/submit.dto';
import { WithdrawDto } from './dto/withdraw.dto';

// Status keanggotaan yang sudah boleh lihat & download aset campaign.
const ENGAGED = ['accepted', 'submitted', 'verified', 'rewarded'];

@Injectable()
export class ClipperService {
  constructor(private prisma: PrismaService) {}

  // ── Profil DNA ───────────────────────────────────────────────────────────
  async getProfile(userId: string) {
    return this.prisma.clipperProfile.findUnique({ where: { userId } });
  }

  /** Buat/update profil DNA + set is_clipper = true (Section 4.1 PUT). */
  async upsertProfile(userId: string, dto: UpdateClipperProfileDto) {
    const data = {
      niches: dto.niches,
      region: dto.region,
      language: dto.language ?? 'id',
      bio: dto.bio,
      socialTiktok: dto.socialTiktok,
      socialYoutube: dto.socialYoutube,
      socialInstagram: dto.socialInstagram,
    };

    const profile = await this.prisma.clipperProfile.upsert({
      where: { userId },
      create: { userId, ...data },
      update: data,
    });

    await this.prisma.user.update({ where: { id: userId }, data: { isClipper: true } });
    return profile;
  }

  // ── Inbox & detail campaign (brand di-mask) ───────────────────────────────
  async listCampaigns(userId: string) {
    const rows = await this.prisma.campaignClipper.findMany({
      where: { clipperId: userId },
      orderBy: { createdAt: 'desc' },
      include: {
        campaign: {
          select: {
            id: true,
            name: true,
            detectedNiches: true,
            targetPlatforms: true,
            deadline: true,
            status: true,
            viralScore: true,
          },
        },
      },
    });

    return rows.map((r) => this.maskCampaignRow(r));
  }

  async getCampaignDetail(userId: string, campaignId: string) {
    const membership = await this.prisma.campaignClipper.findUnique({
      where: { campaignId_clipperId: { campaignId, clipperId: userId } },
      include: {
        campaign: {
          select: {
            id: true,
            name: true,
            detectedNiches: true,
            targetPlatforms: true,
            deadline: true,
            status: true,
            viralScore: true,
            projectId: true,
          },
        },
      },
    });
    if (!membership) throw new NotFoundException('Undangan campaign tidak ditemukan');

    const masked = this.maskCampaignRow(membership);

    // Klip aset hanya tampil kalau clipper sudah accept & pipeline punya project.
    let clips: unknown[] = [];
    if (ENGAGED.includes(membership.status) && membership.campaign.projectId) {
      clips = await this.prisma.clip.findMany({
        where: { projectId: membership.campaign.projectId },
        orderBy: { viralityScore: 'desc' },
        select: {
          id: true,
          title: true,
          duration: true,
          viralityScore: true,
          aspectRatio: true,
          hasCaptions: true,
          hashtags: true,
        },
      });
    }

    return { ...masked, clips };
  }

  async accept(userId: string, campaignId: string) {
    return this.transition(userId, campaignId, ['invited'], { status: 'accepted' });
  }

  async decline(userId: string, campaignId: string) {
    return this.transition(userId, campaignId, ['invited'], { status: 'declined' });
  }

  async submit(userId: string, campaignId: string, dto: SubmitDto) {
    return this.transition(userId, campaignId, ['accepted'], {
      status: 'submitted',
      submittedUrl: dto.url,
      submittedAt: new Date(),
    });
  }

  // ── Earnings & withdrawal ─────────────────────────────────────────────────
  async getEarnings(userId: string) {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { pointBalance: true },
    });

    const transactions = await this.prisma.transaction.findMany({
      where: { userId, balanceType: 'point' },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    const withdrawals = await this.prisma.withdrawalRequest.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    return { pointBalance: user.pointBalance, transactions, withdrawals };
  }

  async withdraw(userId: string, dto: WithdrawDto) {
    if (dto.amount < MIN_WITHDRAWAL_POINTS) {
      throw new BadRequestException(`Minimum penarikan ${MIN_WITHDRAWAL_POINTS} poin`);
    }
    if (dto.method === 'bank' && (!dto.bankName || !dto.accountNumber || !dto.accountName)) {
      throw new BadRequestException('Data bank tidak lengkap');
    }
    if (dto.method === 'ewallet' && (!dto.ewalletType || !dto.ewalletNumber)) {
      throw new BadRequestException('Data e-wallet tidak lengkap');
    }

    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { pointBalance: true },
    });

    // Cegah over-request: saldo harus menutup semua penarikan pending + yang baru.
    const pending = await this.prisma.withdrawalRequest.aggregate({
      where: { userId, status: { in: ['pending', 'approved'] } },
      _sum: { amount: true },
    });
    const committed = (pending._sum.amount ?? 0) + dto.amount;
    if (committed > user.pointBalance) {
      throw new BadRequestException('Saldo poin tidak cukup untuk penarikan ini');
    }

    return this.prisma.withdrawalRequest.create({
      data: {
        userId,
        amount: dto.amount,
        status: 'pending',
        bankName: dto.method === 'bank' ? dto.bankName : null,
        accountNumber: dto.method === 'bank' ? dto.accountNumber : null,
        accountName: dto.method === 'bank' ? dto.accountName : null,
        ewalletType: dto.method === 'ewallet' ? dto.ewalletType : null,
        ewalletNumber: dto.method === 'ewallet' ? dto.ewalletNumber : null,
      },
    });
  }

  // ── Download aset (klip pipeline), akses lewat keanggotaan campaign ────────
  async getDownloadableClip(userId: string, clipId: string) {
    const clip = await this.prisma.clip.findUnique({
      where: { id: clipId },
      select: { id: true, filePath: true, projectId: true },
    });
    if (!clip) throw new NotFoundException('Klip tidak ditemukan');

    const membership = await this.prisma.campaignClipper.findFirst({
      where: {
        clipperId: userId,
        status: { in: ENGAGED },
        campaign: { projectId: clip.projectId },
      },
    });
    if (!membership) throw new ForbiddenException('Kamu belum berhak mengunduh aset ini');

    return clip;
  }

  // ── Helpers ────────────────────────────────────────────────────────────────
  private async transition(
    userId: string,
    campaignId: string,
    allowed: string[],
    data: Record<string, unknown>,
  ) {
    const membership = await this.prisma.campaignClipper.findUnique({
      where: { campaignId_clipperId: { campaignId, clipperId: userId } },
    });
    if (!membership) throw new NotFoundException('Undangan campaign tidak ditemukan');
    if (!allowed.includes(membership.status)) {
      throw new BadRequestException(`Aksi tidak valid untuk status "${membership.status}"`);
    }
    return this.prisma.campaignClipper.update({ where: { id: membership.id }, data });
  }

  private maskCampaignRow(row: {
    status: string;
    submittedUrl: string | null;
    submittedAt: Date | null;
    baseReward: number;
    performanceBonus: number;
    totalReward: number;
    viewCount: number | null;
    campaign: {
      id: string;
      name: string;
      detectedNiches: string[];
      targetPlatforms: string[];
      deadline: Date;
      status: string;
      viralScore: number | null;
    };
  }) {
    return {
      campaignId: row.campaign.id,
      name: row.campaign.name,
      brand: 'Brand Verified', // identitas brand di-mask (Section 6.3)
      niches: row.campaign.detectedNiches,
      targetPlatforms: row.campaign.targetPlatforms,
      deadline: row.campaign.deadline,
      campaignStatus: row.campaign.status,
      viralScore: row.campaign.viralScore,
      status: row.status,
      submittedUrl: row.submittedUrl,
      submittedAt: row.submittedAt,
      baseReward: row.baseReward,
      performanceBonus: row.performanceBonus,
      totalReward: row.totalReward,
      viewCount: row.viewCount,
      estimatedBaseReward: BASE_REWARD_POINTS,
    };
  }
}
