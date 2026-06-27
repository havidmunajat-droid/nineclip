import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { SocialPlatform } from './bio-token';

export interface FetchedBio {
  bio: string;
  channelId?: string;
}

/**
 * Pengambil bio publik per platform. Desain pluggable + graceful:
 *  - YouTube: YouTube Data API v3 — aktif HANYA jika YOUTUBE_API_KEY ada.
 *  - TikTok: Puppeteer headless — aktif HANYA jika paket 'puppeteer' terpasang.
 *  - Instagram: selalu manual.
 * Selalu mengembalikan null (bukan throw) bila tidak tersedia → caller fallback manual.
 */
@Injectable()
export class SocialFetcherService {
  private readonly log = new Logger(SocialFetcherService.name);

  constructor(private config: ConfigService) {}

  async fetchBio(platform: SocialPlatform, username: string): Promise<FetchedBio | null> {
    try {
      if (platform === 'youtube') return await this.fetchYouTube(username);
      if (platform === 'tiktok') return await this.fetchTikTok(username);
      return null; // instagram → manual
    } catch (e) {
      this.log.warn(`fetchBio ${platform}/${username} gagal: ${(e as Error).message}`);
      return null;
    }
  }

  private async fetchYouTube(username: string): Promise<FetchedBio | null> {
    const key = this.config.get<string>('YOUTUBE_API_KEY');
    if (!key) return null; // belum dikonfigurasi → fallback manual
    const handle = username.replace(/^@/, '');
    const base = 'https://www.googleapis.com/youtube/v3/channels';
    for (const extra of [{ forHandle: `@${handle}` }, { forUsername: handle }]) {
      const { data } = await axios.get<{ items?: Array<{ id: string; snippet?: { description?: string } }> }>(
        base,
        { params: { part: 'snippet', key, ...extra }, timeout: 10_000 },
      );
      const item = data?.items?.[0];
      if (item) return { bio: item.snippet?.description ?? '', channelId: item.id };
    }
    return null;
  }

  private async fetchTikTok(username: string): Promise<FetchedBio | null> {
    // Lazy require — jika puppeteer belum diinstall, fallback manual tanpa crash.
    let puppeteer: { launch: (opts: unknown) => Promise<TikTokBrowser> };
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      puppeteer = require('puppeteer');
    } catch {
      return null;
    }
    const handle = username.replace(/^@/, '');
    const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
    try {
      const page = await browser.newPage();
      await page.goto(`https://www.tiktok.com/@${handle}`, {
        waitUntil: 'domcontentloaded',
        timeout: 15_000,
      });
      const bio = await page.evaluate(() => {
        const el = document.querySelector('[data-e2e="user-bio"]');
        const meta = document.querySelector('meta[name="description"]');
        return el?.textContent ?? meta?.getAttribute('content') ?? '';
      });
      return { bio: bio ?? '' };
    } finally {
      await browser.close();
    }
  }
}

// Tipe minimal Puppeteer (dipakai lewat lazy require, tanpa dependency type).
interface TikTokBrowser {
  newPage: () => Promise<{
    goto: (url: string, opts: unknown) => Promise<unknown>;
    evaluate: (fn: () => string) => Promise<string>;
  }>;
  close: () => Promise<void>;
}
