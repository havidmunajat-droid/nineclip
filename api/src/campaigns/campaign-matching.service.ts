import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';

/**
 * Sprint 2 — Section 3.4 AI Matching Logic
 *
 * Dipanggil saat campaign transisi processing -> active (pipeline sudah ready).
 * Mencari clipper yang niche-nya overlap dengan detected_niches campaign,
 * urut skor tertinggi, lalu buat record campaign_clippers berstatus 'invited'.
 *
 * Catatan MVP: tiebreak "past_verified" dari PRD disederhanakan menjadi urutan
 * score desc + updatedAt. Penyempurnaan ranking (riwayat verified) menyusul.
 */
@Injectable()
export class CampaignMatchingService {
  private readonly log = new Logger(CampaignMatchingService.name);

  constructor(private prisma: PrismaService) {}

  async matchClippers(campaignId: string): Promise<number> {
    const campaign = await this.prisma.campaign.findUnique({ where: { id: campaignId } });
    if (!campaign) return 0;

    const niches = campaign.detectedNiches ?? [];
    if (niches.length === 0) {
      this.log.warn(`Campaign ${campaignId} tidak punya detected_niches, matching dilewati`);
      return 0;
    }

    // Ambil clipper yang nichenya overlap dengan campaign (array overlap = hasSome).
    const candidates = await this.prisma.clipperProfile.findMany({
      where: { niches: { hasSome: niches } },
      orderBy: [{ score: 'desc' }, { updatedAt: 'desc' }],
      take: campaign.maxClippers,
      select: { userId: true },
    });

    if (candidates.length === 0) {
      this.log.log(`Campaign ${campaignId}: tidak ada clipper yang cocok untuk niche [${niches.join(', ')}]`);
      return 0;
    }

    // Buat invite. skipDuplicates menjaga idempotensi terhadap unique(campaignId, clipperId).
    const result = await this.prisma.campaignClipper.createMany({
      data: candidates.map((c) => ({
        campaignId,
        clipperId: c.userId,
        status: 'invited',
      })),
      skipDuplicates: true,
    });

    // TODO: kirim notifikasi ke clipper (email / in-app) — Sprint berikutnya.
    this.log.log(`Campaign ${campaignId}: ${result.count} clipper di-invite`);
    return result.count;
  }
}
