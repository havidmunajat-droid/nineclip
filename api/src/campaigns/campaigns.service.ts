import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { Campaign } from '@prisma/client';
import { PrismaService } from '@/prisma/prisma.service';
import { ProjectsService } from '@/projects/projects.service';
import { LifecycleService } from '@/lifecycle/lifecycle.service';
import { AppConfigService } from '@/app-config/app-config.service';
import { CampaignMatchingService } from './campaign-matching.service';
import { CAMPAIGN_PACKAGES, PackageType, computeFundAllocation } from './campaign-packages';
import { calculateViralScore } from './viral-score';
import { CreateCampaignDto } from './dto/create-campaign.dto';
import { UpdateCampaignDto } from './dto/update-campaign.dto';
import { ViralScoreDto } from './dto/viral-score.dto';

interface MidtransSnapResponse {
  token: string;
  redirect_url: string;
}

const ORDER_ID_RE = /^nineclip-campaign-([^-]+)-\d+$/;

@Injectable()
export class CampaignsService {
  private readonly log = new Logger(CampaignsService.name);

  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
    private projects: ProjectsService,
    private matching: CampaignMatchingService,
    private lifecycle: LifecycleService,
    private appConfig: AppConfigService,
  ) {}

  // ── Section 8 — kompensasi KPI tidak tercapai (brand pilih) ─────────────────
  async applyCompensation(brandId: string, id: string, choice: 'extension' | 'voucher') {
    const campaign = await this.getOwned(brandId, id);
    if (campaign.status !== 'kpi_missed') {
      throw new BadRequestException('Campaign tidak menunggu kompensasi');
    }
    if (campaign.compensationDeadline && campaign.compensationDeadline < new Date()) {
      throw new BadRequestException('Batas waktu pemilihan kompensasi sudah lewat');
    }
    return this.lifecycle.applyCompensation(id, choice);
  }

  // ── Section 3.3 + 6.1 Step 1 — Viral Score ──────────────────────────────
  async computeViralScore(dto: ViralScoreDto) {
    const title = dto.title ?? (await this.fetchYoutubeTitle(dto.videoUrl)) ?? '';
    const result = calculateViralScore(title, dto.description ?? '');
    return { ...result, title };
  }

  /** Ambil judul video lewat YouTube oEmbed (tanpa API key, cepat). */
  private async fetchYoutubeTitle(videoUrl: string): Promise<string | null> {
    try {
      const { data } = await axios.get<{ title?: string }>('https://www.youtube.com/oembed', {
        params: { url: videoUrl, format: 'json' },
        timeout: 8000,
      });
      return data.title ?? null;
    } catch {
      this.log.warn(`Gagal ambil metadata oEmbed untuk ${videoUrl}`);
      return null;
    }
  }

  // ── Section 4.2 — Campaign CRUD (Brand) ─────────────────────────────────
  async create(brandId: string, dto: CreateCampaignDto): Promise<Campaign> {
    const pkg = await this.appConfig.getPackage(dto.packageType);
    if (!pkg) throw new BadRequestException('Paket tidak valid');

    const deadline = new Date(dto.deadline);
    if (Number.isNaN(deadline.getTime()) || deadline.getTime() <= Date.now()) {
      throw new BadRequestException('Deadline harus tanggal di masa depan');
    }

    // Viral score dihitung server-side (authoritative), tidak percaya nilai dari client.
    const { score, niches } = await this.computeViralScore({ videoUrl: dto.videoUrl });

    const campaign = await this.prisma.campaign.create({
      data: {
        brandId,
        name: dto.name,
        videoUrl: dto.videoUrl,
        viralScore: score,
        detectedNiches: niches,
        targetPlatforms: dto.targetPlatforms,
        deadline,
        packageType: dto.packageType,
        totalCredits: pkg.credits,
        maxClippers: pkg.maxClippers,
        kpiViews: pkg.kpiViews,
        platformFee: pkg.platformFee,
        rewardPool: pkg.clipperPool,
        baseFund: pkg.baseFund,
        bonusPool: pkg.bonusPool,
        bonusPoolRemaining: pkg.bonusPool,
        rewardPerVideo: pkg.rewardPerVideo,
        status: 'draft',
      },
    });

    // Section 1 — user dianggap brand begitu membuat campaign pertama.
    await this.prisma.user.update({ where: { id: brandId }, data: { isBrand: true } });

    return campaign;
  }

  async findAllForBrand(brandId: string) {
    return this.prisma.campaign.findMany({
      where: { brandId },
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { clippers: true } } },
    });
  }

  async findOne(brandId: string, id: string) {
    const campaign = await this.getOwned(brandId, id);
    return this.reconcilePipeline(campaign);
  }

  async update(brandId: string, id: string, dto: UpdateCampaignDto): Promise<Campaign> {
    const campaign = await this.getOwned(brandId, id);
    if (campaign.status !== 'draft') {
      throw new BadRequestException('Campaign hanya bisa diubah saat status draft');
    }

    const data: Record<string, unknown> = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.targetPlatforms !== undefined) data.targetPlatforms = dto.targetPlatforms;
    if (dto.deadline !== undefined) {
      const deadline = new Date(dto.deadline);
      if (Number.isNaN(deadline.getTime()) || deadline.getTime() <= Date.now()) {
        throw new BadRequestException('Deadline harus tanggal di masa depan');
      }
      data.deadline = deadline;
    }
    if (dto.packageType !== undefined) {
      const pkg = await this.appConfig.getPackage(dto.packageType);
      if (!pkg) throw new BadRequestException('Paket tidak valid');
      data.packageType = dto.packageType;
      data.totalCredits = pkg.credits;
      data.maxClippers = pkg.maxClippers;
      data.kpiViews = pkg.kpiViews;
      data.platformFee = pkg.platformFee;
      data.rewardPool = pkg.clipperPool;
      data.baseFund = pkg.baseFund;
      data.bonusPool = pkg.bonusPool;
      data.bonusPoolRemaining = pkg.bonusPool;
      data.rewardPerVideo = pkg.rewardPerVideo;
    }

    return this.prisma.campaign.update({ where: { id }, data });
  }

  async getClippers(brandId: string, id: string) {
    const campaign = await this.getOwned(brandId, id);
    await this.reconcilePipeline(campaign);
    return this.prisma.campaignClipper.findMany({
      where: { campaignId: id },
      orderBy: { createdAt: 'desc' },
      include: {
        clipper: {
          select: {
            id: true,
            name: true,
            clipperProfile: { select: { score: true, niches: true } },
          },
        },
      },
    });
  }

  // ── Section 4.2 + Section 7 — Pembayaran & koneksi pipeline ──────────────
  async pay(brandId: string, id: string) {
    const campaign = await this.getOwned(brandId, id);
    if (campaign.status !== 'draft') {
      throw new BadRequestException('Campaign sudah dibayar atau tidak dalam status draft');
    }

    const pkg = CAMPAIGN_PACKAGES[campaign.packageType as PackageType];
    const orderId = `nineclip-campaign-${campaign.id}-${Date.now()}`;
    const brand = await this.prisma.user.findUniqueOrThrow({ where: { id: brandId } });

    const serverKey = this.config.getOrThrow<string>('MIDTRANS_SERVER_KEY');
    const isProduction = this.config.get('MIDTRANS_IS_PRODUCTION') === 'true';
    const baseUrl = isProduction
      ? 'https://app.midtrans.com/snap/v1/transactions'
      : 'https://app.sandbox.midtrans.com/snap/v1/transactions';

    const { data } = await axios.post<MidtransSnapResponse>(
      baseUrl,
      {
        transaction_details: { order_id: orderId, gross_amount: pkg.priceIdr },
        customer_details: { first_name: brand.name, email: brand.email },
        item_details: [
          { id: campaign.packageType, price: pkg.priceIdr, quantity: 1, name: `Campaign ${campaign.packageType}` },
        ],
      },
      { auth: { username: serverKey, password: '' }, headers: { 'Content-Type': 'application/json' } },
    );

    return { snapToken: data.token, redirectUrl: data.redirect_url, orderId };
  }

  /** Midtrans memanggil ini tanpa auth (verifikasi signature di production — TODO). */
  async handleWebhook(notification: Record<string, string>) {
    const orderId = notification.order_id ?? '';
    const match = ORDER_ID_RE.exec(orderId);
    if (!match) return { handled: false };

    const campaignId = match[1];
    const status = notification.transaction_status;
    const fraud = notification.fraud_status;
    const paid = (status === 'capture' && fraud === 'accept') || status === 'settlement';
    if (!paid) return { handled: false };

    await this.activatePaidCampaign(campaignId);
    return { handled: true };
  }

  /**
   * Dev-only: simulasikan pembayaran sukses tanpa public webhook URL.
   * Diblokir di production (pakai webhook Midtrans asli di sana).
   */
  async devConfirmPayment(brandId: string, id: string) {
    if (this.config.get('NODE_ENV') === 'production') {
      throw new ForbiddenException('Konfirmasi manual tidak tersedia di production');
    }
    await this.getOwned(brandId, id);
    const campaign = await this.activatePaidCampaign(id);
    return campaign;
  }

  /**
   * Section 7 — saat pembayaran sukses:
   *  1. Debit kredit brand (catat transaksi pembelian + debit campaign)
   *  2. Buat project lewat ProjectsService (dispatch ke pipeline yang sama dgn /new)
   *  3. Set campaign.projectId + status = processing
   * Idempotent: aman dipanggil ganda (webhook + retry).
   */
  private async activatePaidCampaign(campaignId: string): Promise<Campaign> {
    // Guard atomik: hanya draft yang boleh transisi ke processing.
    const flip = await this.prisma.campaign.updateMany({
      where: { id: campaignId, status: 'draft' },
      data: { status: 'processing' },
    });
    if (flip.count === 0) {
      // Sudah diproses sebelumnya — kembalikan apa adanya.
      return this.prisma.campaign.findUniqueOrThrow({ where: { id: campaignId } });
    }

    const campaign = await this.prisma.campaign.findUniqueOrThrow({ where: { id: campaignId } });

    // Catat aliran kredit (beli lalu langsung dipakai untuk campaign).
    await this.prisma.$transaction([
      this.prisma.transaction.create({
        data: {
          userId: campaign.brandId,
          type: 'credit_purchase',
          amount: campaign.totalCredits,
          balanceType: 'credit',
          description: `Pembelian kredit paket ${campaign.packageType}`,
          referenceId: campaign.id,
        },
      }),
      this.prisma.transaction.create({
        data: {
          userId: campaign.brandId,
          type: 'campaign_debit',
          amount: -campaign.totalCredits,
          balanceType: 'credit',
          description: `Aktivasi campaign "${campaign.name}"`,
          referenceId: campaign.id,
        },
      }),
    ]);

    // Buat project + dispatch ke pipeline (yt-dlp → Groq → FFmpeg) yang sudah ada.
    const project = await this.projects.createForCampaign(campaign.brandId, campaign.videoUrl ?? '', campaign.name);

    const updated = await this.prisma.campaign.update({
      where: { id: campaign.id },
      data: { projectId: project.id },
    });

    this.log.log(`Campaign ${campaign.id} → processing, project ${project.id} dispatched`);
    return updated;
  }

  /**
   * Section 7 step 4 — rekonsiliasi poll-driven (tanpa menyentuh pipeline):
   * jika project sudah ready, campaign processing -> active + jalankan matching.
   */
  private async reconcilePipeline(campaign: Campaign): Promise<Campaign> {
    if (campaign.status !== 'processing' || !campaign.projectId) return campaign;

    const project = await this.prisma.project.findUnique({ where: { id: campaign.projectId } });
    if (project?.status !== 'ready') return campaign;

    const flip = await this.prisma.campaign.updateMany({
      where: { id: campaign.id, status: 'processing' },
      data: {
        status: 'active',
        // Campaign live untuk clipper: buka kuota & mulai jam Kondisi C (30 hari absolut).
        activatedAt: new Date(),
        creditsRemaining: campaign.totalCredits,
      },
    });
    if (flip.count > 0) {
      await this.matching.matchClippers(campaign.id);
    }
    return this.prisma.campaign.findUniqueOrThrow({ where: { id: campaign.id } });
  }

  // ── Helpers ──────────────────────────────────────────────────────────────
  private async getOwned(brandId: string, id: string): Promise<Campaign> {
    const campaign = await this.prisma.campaign.findUnique({ where: { id } });
    if (!campaign) throw new NotFoundException('Campaign tidak ditemukan');
    if (campaign.brandId !== brandId) throw new ForbiddenException();
    return campaign;
  }
}
