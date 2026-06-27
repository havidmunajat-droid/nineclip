import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { PrismaService } from '@/prisma/prisma.service';
import { ParsedSubmissionUrl, parseSubmissionUrl } from './url-parser';
import { ManualApproveDto } from './dto/manual-approve.dto';

@Injectable()
export class ValidationService {
  private readonly log = new Logger(ValidationService.name);

  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
  ) {}

  /**
   * Dipanggil secara fire-and-forget setelah clipper submit URL (Section 7 PRD).
   * Alur:
   *  1. Parse URL → platform + videoId + username
   *  2. Cek kepemilikan (username dari URL vs akun terverifikasi clipper)
   *  3. Fetch stats platform-specific, atau set pending_manual_review
   */
  async validateSubmission(ccId: string): Promise<void> {
    const cc = await this.prisma.campaignClipper.findUnique({
      where: { id: ccId },
      include: { clipper: { include: { clipperProfile: true } } },
    });
    if (!cc || !cc.submittedUrl) return;

    const parsed = parseSubmissionUrl(cc.submittedUrl);
    if (!parsed) {
      await this.setRejected(ccId);
      this.log.warn(`[${ccId}] URL tidak dikenal: ${cc.submittedUrl}`);
      return;
    }

    await this.prisma.campaignClipper.update({
      where: { id: ccId },
      data: { platform: parsed.platform },
    });

    const profile = cc.clipper.clipperProfile;
    if (!this.checkOwnership(parsed, profile)) {
      await this.setRejected(ccId);
      this.log.warn(`[${ccId}] Kepemilikan tidak cocok: platform=${parsed.platform}`);
      return;
    }

    switch (parsed.platform) {
      case 'youtube':
        await this.handleYoutube(ccId, parsed.videoId, profile?.youtubeChannelId ?? null);
        break;
      case 'tiktok':
        await this.handleTiktok(
          ccId,
          parsed.videoId,
          parsed.username ?? profile?.tiktokUsername ?? null,
        );
        break;
      case 'instagram':
        await this.setManual(ccId);
        break;
    }
  }

  // ── Admin manual queue ──────────────────────────────────────────────────────

  listManualQueue() {
    return this.prisma.campaignClipper.findMany({
      where: { status: 'pending_manual_review' },
      orderBy: { submittedAt: 'asc' },
      include: {
        campaign: { select: { id: true, name: true, packageType: true } },
        clipper: { select: { id: true, name: true, email: true } },
      },
    });
  }

  /**
   * Admin isi stats manual → kembali ke 'submitted' → siap diverifikasi
   * via endpoint yang sudah ada (POST /admin/campaigns/:id/clippers/:cid/verify).
   */
  async approveManual(ccId: string, dto: ManualApproveDto) {
    const cc = await this.prisma.campaignClipper.findUnique({ where: { id: ccId } });
    if (!cc) throw new NotFoundException('Submission tidak ditemukan');
    if (cc.status !== 'pending_manual_review') {
      throw new BadRequestException(`Tidak bisa approve: status "${cc.status}"`);
    }
    return this.prisma.campaignClipper.update({
      where: { id: ccId },
      data: {
        viewCount: BigInt(dto.viewCount),
        likeCount: dto.likeCount,
        commentCount: dto.commentCount,
        shareCount: dto.shareCount,
        isOriginal: dto.isOriginal,
        status: 'submitted',
      },
    });
  }

  async rejectManual(ccId: string) {
    const cc = await this.prisma.campaignClipper.findUnique({ where: { id: ccId } });
    if (!cc) throw new NotFoundException('Submission tidak ditemukan');
    if (cc.status !== 'pending_manual_review') {
      throw new BadRequestException(`Tidak bisa reject: status "${cc.status}"`);
    }
    // Kredit tidak dikembalikan — slot sudah dipakai saat clipper submit.
    return this.prisma.campaignClipper.update({
      where: { id: ccId },
      data: { status: 'rejected' },
    });
  }

  // ── Platform handlers ────────────────────────────────────────────────────────

  private async handleYoutube(
    ccId: string,
    videoId: string,
    expectedChannelId: string | null,
  ) {
    const key = this.config.get<string>('YOUTUBE_API_KEY');
    if (!key) {
      await this.setManual(ccId);
      return;
    }
    try {
      const { data } = await axios.get<YoutubeApiResponse>(
        'https://www.googleapis.com/youtube/v3/videos',
        { params: { part: 'statistics,snippet', id: videoId, key }, timeout: 10_000 },
      );
      const item = data?.items?.[0];
      if (!item) throw new Error('Video tidak ditemukan di YouTube API');

      // Verifikasi kepemilikan via channelId jika profil sudah menyimpannya
      if (expectedChannelId && item.snippet.channelId !== expectedChannelId) {
        await this.setRejected(ccId);
        this.log.warn(
          `[${ccId}] channelId mismatch: expected=${expectedChannelId} got=${item.snippet.channelId}`,
        );
        return;
      }

      await this.prisma.campaignClipper.update({
        where: { id: ccId },
        data: {
          viewCount: BigInt(item.statistics.viewCount ?? '0'),
          likeCount: Number(item.statistics.likeCount ?? 0),
          commentCount: Number(item.statistics.commentCount ?? 0),
          shareCount: 0, // YouTube API tidak sediakan shareCount
          // status tetap 'submitted' → admin finalkan via POST verify
        },
      });
    } catch (e) {
      this.log.warn(`[${ccId}] YouTube API error: ${(e as Error).message}`);
      await this.setManual(ccId);
    }
  }

  private async handleTiktok(
    ccId: string,
    videoId: string,
    username: string | null,
  ) {
    if (!username) {
      await this.setManual(ccId);
      return;
    }

    let puppeteer: { launch: (opts: object) => Promise<TiktokBrowser> };
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      puppeteer = require('puppeteer');
    } catch {
      await this.setManual(ccId);
      return;
    }

    const execPath = this.config.get<string>('PUPPETEER_EXECUTABLE_PATH');
    const browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
      executablePath: execPath || undefined,
    });
    try {
      const page = await browser.newPage();
      await page.setUserAgent(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      );
      await page.goto(`https://www.tiktok.com/@${username}/video/${videoId}`, {
        waitUntil: 'domcontentloaded',
        timeout: 25_000,
      });

      const stats = await page.evaluate(() => {
        // Coba __NEXT_DATA__ (pola Next.js lama TikTok)
        const nextEl = document.getElementById('__NEXT_DATA__');
        if (nextEl) {
          try {
            const d = JSON.parse(nextEl.textContent ?? '') as {
              props?: { pageProps?: { itemInfo?: { itemStruct?: { stats?: TkStats } } } };
            };
            const s = d?.props?.pageProps?.itemInfo?.itemStruct?.stats;
            if (s) return buildStats(s);
          } catch { /* lanjut */ }
        }
        // Coba SIGI_STATE (versi terbaru TikTok)
        const sigiEl = document.getElementById('SIGI_STATE');
        if (sigiEl) {
          try {
            const d = JSON.parse(sigiEl.textContent ?? '') as {
              ItemModule?: Record<string, { stats?: TkStats }>;
            };
            const items = d?.ItemModule;
            if (items) {
              const first = Object.values(items)[0];
              if (first?.stats) return buildStats(first.stats);
            }
          } catch { /* lanjut */ }
        }
        return null;

        // helper (harus di dalam evaluate karena scope browser)
        interface TkStats { playCount?: number; diggCount?: number; commentCount?: number; shareCount?: number }
        function buildStats(s: TkStats) {
          return { viewCount: s.playCount ?? 0, likeCount: s.diggCount ?? 0, commentCount: s.commentCount ?? 0, shareCount: s.shareCount ?? 0 };
        }
      });

      if (stats) {
        await this.prisma.campaignClipper.update({
          where: { id: ccId },
          data: {
            viewCount: BigInt(stats.viewCount),
            likeCount: stats.likeCount,
            commentCount: stats.commentCount,
            shareCount: stats.shareCount,
          },
        });
        return;
      }
    } catch (e) {
      this.log.warn(`[${ccId}] TikTok scrape error: ${(e as Error).message}`);
    } finally {
      await browser.close();
    }

    await this.setManual(ccId);
  }

  // ── Helpers ──────────────────────────────────────────────────────────────────

  private checkOwnership(
    parsed: ParsedSubmissionUrl,
    profile: {
      tiktokVerified: boolean;
      tiktokUsername: string | null;
      youtubeVerified: boolean;
      instagramVerified: boolean;
    } | null,
  ): boolean {
    if (!profile) return false;
    switch (parsed.platform) {
      case 'tiktok':
        if (!profile.tiktokVerified) return false;
        if (parsed.username && profile.tiktokUsername) {
          return parsed.username.toLowerCase() === profile.tiktokUsername.toLowerCase();
        }
        return true; // short URL tanpa @username — percaya pada verified flag
      case 'youtube':
        return profile.youtubeVerified;
      case 'instagram':
        return profile.instagramVerified;
    }
  }

  private async setManual(ccId: string) {
    await this.prisma.campaignClipper.update({
      where: { id: ccId },
      data: { status: 'pending_manual_review' },
    });
  }

  private async setRejected(ccId: string) {
    await this.prisma.campaignClipper.update({
      where: { id: ccId },
      data: { status: 'rejected' },
    });
  }
}

// ── Tipe minimal (tidak perlu install @types/puppeteer) ──────────────────────
interface TiktokPage {
  setUserAgent: (ua: string) => Promise<void>;
  goto: (url: string, opts: object) => Promise<void>;
  evaluate: <T>(fn: () => T) => Promise<T>;
}
interface TiktokBrowser {
  newPage: () => Promise<TiktokPage>;
  close: () => Promise<void>;
}

interface YoutubeApiResponse {
  items?: Array<{
    snippet: { channelId: string };
    statistics: { viewCount?: string; likeCount?: string; commentCount?: string };
  }>;
}
