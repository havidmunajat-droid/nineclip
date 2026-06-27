import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { CampaignClipper } from '@prisma/client';
import { PrismaService } from '@/prisma/prisma.service';
import { BASE_REWARD_POINTS, MIN_WITHDRAWAL_POINTS } from '@/campaigns/campaign-packages';
import { ValidationService } from '@/validation/validation.service';
import { UpdateClipperProfileDto } from './dto/update-profile.dto';
import { SubmitDto } from './dto/submit.dto';
import { WithdrawDto } from './dto/withdraw.dto';

// Status keanggotaan yang menempati slot "hidup" (boleh lihat & download aset).
const ENGAGED = ['accepted', 'submitted', 'verified', 'rewarded'];
// Section 6 BUSINESS_LOGIC_v2 — jendela booking & penalti.
const BOOKING_WINDOW_MS = 24 * 60 * 60 * 1000; // 24 jam untuk submit setelah booking
const PENALTY_MS = 48 * 60 * 60 * 1000; // penalti 48 jam jika slot hangus

@Injectable()
export class ClipperService {
  private readonly log = new Logger(ClipperService.name);

  constructor(
    private prisma: PrismaService,
    @InjectQueue('booking-expiry') private bookingQueue: Queue,
    private validation: ValidationService,
  ) {}

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
    // v2: clipper bisa punya >1 slot per campaign. v2-1 pakai findFirst (ambil slot
    // pertama) agar setara perilaku lama; logika slot-aware penuh di v2-2.
    const membership = await this.prisma.campaignClipper.findFirst({
      where: { campaignId, clipperId: userId },
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

  // ── T&C (Section 10 PRD) — wajib disetujui sebelum booking pertama ─────────
  async acceptTnc(userId: string) {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { tncAcceptedAt: true },
    });
    if (user.tncAcceptedAt) return { tncAcceptedAt: user.tncAcceptedAt };
    return this.prisma.user.update({
      where: { id: userId },
      data: { tncAcceptedAt: new Date() },
      select: { tncAcceptedAt: true },
    });
  }

  // ── Booking slot (Section 6 BUSINESS_LOGIC_v2) ─────────────────────────────
  /**
   * "Ambil Campaign" — booking 1 slot: kurangi 1 kredit (reserved) & kunci 24 jam.
   * Maks 2 slot/clipper. Gate: T&C disetujui + tidak dalam penalti + kredit tersedia.
   * Menjadwalkan auto-release lewat queue 'booking-expiry' (terpisah dari pipeline).
   */
  async accept(userId: string, campaignId: string): Promise<CampaignClipper> {
    const campaign = await this.prisma.campaign.findUnique({ where: { id: campaignId } });
    if (!campaign) throw new NotFoundException('Campaign tidak ditemukan');
    if (campaign.status !== 'active') {
      throw new BadRequestException('Campaign tidak sedang menerima booking');
    }

    // Gate 1 — T&C wajib disetujui.
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { tncAcceptedAt: true },
    });
    if (!user.tncAcceptedAt) throw new ForbiddenException('TNC_NOT_ACCEPTED');

    // Gate 2 — tidak sedang kena penalti auto-release.
    const profile = await this.prisma.clipperProfile.findUnique({
      where: { userId },
      select: { penaltyUntil: true },
    });
    if (profile?.penaltyUntil && profile.penaltyUntil > new Date()) {
      throw new ForbiddenException('PENALTY_ACTIVE');
    }

    // Booking hanya untuk clipper yang pernah diundang (punya row di campaign ini).
    const rows = await this.prisma.campaignClipper.findMany({
      where: { campaignId, clipperId: userId },
    });
    if (rows.length === 0) throw new NotFoundException('Kamu belum diundang ke campaign ini');
    const liveCount = rows.filter((r) => ENGAGED.includes(r.status)).length;
    if (liveCount >= 2) throw new BadRequestException('Maksimal 2 slot per campaign');

    // Reserve kredit atomik (cegah balapan saat kredit tinggal sedikit).
    const reserve = await this.prisma.campaign.updateMany({
      where: { id: campaignId, status: 'active', creditsRemaining: { gt: 0 } },
      data: { creditsRemaining: { decrement: 1 } },
    });
    if (reserve.count === 0) throw new BadRequestException('CREDITS_EXHAUSTED');

    const bookingExpiresAt = new Date(Date.now() + BOOKING_WINDOW_MS);
    // Pakai ulang row undangan / slot yang sudah bebas; kalau tidak ada, buat slot baru.
    const reusable =
      rows.find((r) => r.status === 'invited') ??
      rows.find((r) => r.status === 'declined' || r.status === 'expired');

    let cc: CampaignClipper;
    try {
      if (reusable) {
        cc = await this.prisma.campaignClipper.update({
          where: { id: reusable.id },
          data: { status: 'accepted', bookingExpiresAt, submittedUrl: null, submittedAt: null },
        });
      } else {
        const used = rows.map((r) => r.slotNumber);
        const slotNumber = [1, 2].find((n) => !used.includes(n));
        if (!slotNumber) throw new BadRequestException('Maksimal 2 slot per campaign');
        cc = await this.prisma.campaignClipper.create({
          data: { campaignId, clipperId: userId, status: 'accepted', slotNumber, bookingExpiresAt },
        });
      }
    } catch (err) {
      // Rollback reserve kredit jika gagal booking row.
      await this.prisma.campaign.update({
        where: { id: campaignId },
        data: { creditsRemaining: { increment: 1 } },
      });
      throw err;
    }

    await this.bookingQueue.add(
      'expire',
      { campaignClipperId: cc.id },
      { delay: BOOKING_WINDOW_MS, jobId: `booking-${cc.id}` },
    );

    return cc;
  }

  async decline(userId: string, campaignId: string) {
    // Decline hanya untuk undangan yang belum di-booking (tidak menyentuh kredit).
    return this.transition(userId, campaignId, ['invited'], { status: 'declined' });
  }

  /**
   * Submit URL untuk slot ter-booking, selama masih dalam jendela 24 jam.
   * Validasi platform/kepemilikan akun penuh menyusul di v2-6.
   */
  async submit(userId: string, campaignId: string, dto: SubmitDto) {
    const slot = await this.prisma.campaignClipper.findFirst({
      where: { campaignId, clipperId: userId, status: 'accepted' },
      orderBy: { slotNumber: 'asc' },
    });
    if (!slot) throw new BadRequestException('Tidak ada slot aktif untuk disubmit');
    if (slot.bookingExpiresAt && slot.bookingExpiresAt <= new Date()) {
      throw new BadRequestException('BOOKING_EXPIRED');
    }

    // Originality check (Section 5) — URL yang sama sudah disubmit di campaign ini?
    const isOriginal = await this.checkOriginality(campaignId, dto.url, slot.id);

    const cc = await this.prisma.campaignClipper.update({
      where: { id: slot.id },
      data: {
        status: 'submitted',
        submittedUrl: dto.url,
        submittedAt: new Date(),
        isOriginal,
      },
    });

    // v2-6: validasi URL + fetch stats async (Puppeteer bisa lambat 20-30 detik)
    void this.validation.validateSubmission(cc.id).catch((e) =>
      this.log.warn(`validateSubmission [${cc.id}] error: ${(e as Error).message}`),
    );

    return cc;
  }

  /** True jika URL belum pernah disubmit di campaign ini (anti reupload, Section 5). */
  private async checkOriginality(
    campaignId: string,
    url: string,
    selfId: string,
  ): Promise<boolean> {
    const dup = await this.prisma.campaignClipper.findFirst({
      where: {
        campaignId,
        submittedUrl: url,
        id: { not: selfId },
        status: { in: ['submitted', 'pending_manual_review', 'verified', 'rewarded'] },
      },
      select: { id: true },
    });
    return !dup;
  }

  /**
   * Dipanggil BookingProcessor saat timer 24 jam habis. Jika slot masih 'accepted'
   * (belum submit): kembalikan kredit, set 'expired', kenakan penalti 48 jam. Idempotent.
   */
  async autoReleaseBooking(campaignClipperId: string) {
    const cc = await this.prisma.campaignClipper.findUnique({ where: { id: campaignClipperId } });
    if (!cc || cc.status !== 'accepted') return { released: false };

    await this.prisma.$transaction([
      this.prisma.campaignClipper.update({ where: { id: cc.id }, data: { status: 'expired' } }),
      this.prisma.campaign.update({
        where: { id: cc.campaignId },
        data: { creditsRemaining: { increment: 1 } },
      }),
      this.prisma.clipperProfile.updateMany({
        where: { userId: cc.clipperId },
        data: { penaltyUntil: new Date(Date.now() + PENALTY_MS) },
      }),
    ]);
    return { released: true };
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
    // v2-1: findFirst (setara perilaku lama 1-slot); slot-aware penuh di v2-2.
    const membership = await this.prisma.campaignClipper.findFirst({
      where: { campaignId, clipperId: userId },
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
    bookingExpiresAt: Date | null;
    platform: string | null;
    baseReward: number;
    performanceBonus: number;
    performanceScore: number;
    totalReward: number;
    viewCount: bigint; // kolom kini BIGINT NOT NULL (v2)
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
      bookingExpiresAt: row.bookingExpiresAt,
      platform: row.platform,
      baseReward: row.baseReward,
      performanceBonus: row.performanceBonus,
      performanceScore: row.performanceScore,
      totalReward: row.totalReward,
      viewCount: Number(row.viewCount),
      estimatedBaseReward: BASE_REWARD_POINTS,
    };
  }
}
