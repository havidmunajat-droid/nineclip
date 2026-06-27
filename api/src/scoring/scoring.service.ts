import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { calculatePerformanceScore } from './performance-score';

// Status yang punya submission & layak dihitung skornya.
const SCORABLE = ['submitted', 'pending_manual_review', 'verified', 'rewarded'];

@Injectable()
export class ScoringService {
  private readonly log = new Logger(ScoringService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Hitung ulang performance score semua clipper di satu campaign.
   * maxViewsInCampaign diambil dari data aktual campaign tsb (dinamis), bukan tetap.
   */
  async recomputeCampaign(campaignId: string): Promise<number> {
    const rows = await this.prisma.campaignClipper.findMany({
      where: { campaignId, status: { in: SCORABLE } },
      select: {
        id: true,
        viewCount: true,
        likeCount: true,
        commentCount: true,
        shareCount: true,
        isOriginal: true,
      },
    });
    if (rows.length === 0) return 0;

    const maxViews = rows.reduce((m, r) => {
      const v = Number(r.viewCount);
      return v > m ? v : m;
    }, 0);

    for (const r of rows) {
      const score = calculatePerformanceScore(
        Number(r.viewCount),
        maxViews,
        r.likeCount,
        r.commentCount,
        r.shareCount,
        r.isOriginal,
      );
      await this.prisma.campaignClipper.update({
        where: { id: r.id },
        data: { performanceScore: score },
      });
    }
    return rows.length;
  }

  /** Cron 6 jam — recompute semua campaign aktif. */
  async recomputeAllActive(): Promise<{ campaigns: number; clippers: number }> {
    const campaigns = await this.prisma.campaign.findMany({
      where: { status: 'active' },
      select: { id: true },
    });
    let clippers = 0;
    for (const c of campaigns) {
      clippers += await this.recomputeCampaign(c.id);
    }
    this.log.log(`Scoring recompute: ${campaigns.length} campaign aktif, ${clippers} submission`);
    return { campaigns: campaigns.length, clippers };
  }
}
