import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { SocialFetcherService } from './social-fetcher.service';
import {
  SOCIAL_PLATFORMS,
  SocialPlatform,
  bioContainsCode,
  generateBioToken,
} from './bio-token';

const CODE_TTL_MS = 24 * 60 * 60 * 1000;

@Injectable()
export class SocialVerificationService {
  constructor(
    private prisma: PrismaService,
    private fetcher: SocialFetcherService,
  ) {}

  /** Generate kode bio + simpan ke social_verifications (satu pending aktif per platform). */
  async generateCode(userId: string, platform: string, username: string) {
    const p = this.assertPlatform(platform);
    const handle = username.trim().replace(/^@/, '');
    if (!handle) throw new BadRequestException('Username wajib diisi');

    await this.prisma.socialVerification.updateMany({
      where: { userId, platform: p, status: 'pending' },
      data: { status: 'expired' },
    });

    const code = generateBioToken(userId);
    await this.prisma.socialVerification.create({
      data: {
        userId,
        platform: p,
        username: handle,
        code,
        status: 'pending',
        expiresAt: new Date(Date.now() + CODE_TTL_MS),
      },
    });

    return {
      code,
      platform: p,
      username: handle,
      expiresIn: '24 jam',
      instructions: `Tempel kode ${code} ke bio ${p} kamu sementara, lalu klik "Verifikasi". Setelah berhasil, bio boleh diganti lagi.`,
    };
  }

  /** Ambil bio publik, cari kode, kalau cocok → tandai platform terverifikasi. */
  async verify(userId: string, platform: string, username: string) {
    const p = this.assertPlatform(platform);
    const handle = username.trim().replace(/^@/, '');

    const pending = await this.prisma.socialVerification.findFirst({
      where: { userId, platform: p, status: 'pending' },
      orderBy: { createdAt: 'desc' },
    });
    if (!pending) throw new BadRequestException('NO_PENDING_CODE');
    if (pending.expiresAt <= new Date()) {
      await this.prisma.socialVerification.update({ where: { id: pending.id }, data: { status: 'expired' } });
      throw new BadRequestException('CODE_EXPIRED');
    }

    const { bio, channelId } = await this.resolveBio(p, handle, pending.code);

    if (bio === null) {
      return {
        success: false,
        manual: true,
        platform: p,
        message: 'Verifikasi otomatis belum tersedia untuk platform ini. Menunggu review manual.',
      };
    }
    if (!bioContainsCode(bio, pending.code)) {
      return {
        success: false,
        platform: p,
        message: 'Kode belum ditemukan di bio. Pastikan sudah ditempel lalu coba lagi.',
      };
    }

    await this.prisma.socialVerification.update({
      where: { id: pending.id },
      data: { status: 'verified', verifiedAt: new Date() },
    });
    await this.markProfileVerified(userId, p, pending.username, channelId);
    return { success: true, platform: p, username: pending.username };
  }

  async getStatus(userId: string) {
    const prof = await this.prisma.clipperProfile.findUnique({ where: { userId } });
    return {
      tiktok: { verified: prof?.tiktokVerified ?? false, username: prof?.tiktokUsername ?? null },
      youtube: { verified: prof?.youtubeVerified ?? false, username: prof?.youtubeUsername ?? null },
      instagram: { verified: prof?.instagramVerified ?? false, username: prof?.instagramUsername ?? null },
      anyVerified: !!(prof?.tiktokVerified || prof?.youtubeVerified || prof?.instagramVerified),
    };
  }

  // ── Helpers ─────────────────────────────────────────────────────────────────
  /**
   * Ambil bio. Di non-production ada test seam untuk username khusus agar alur
   * sukses/gagal bisa di-E2E tanpa Puppeteer / API key.
   */
  private async resolveBio(
    platform: SocialPlatform,
    handle: string,
    code: string,
  ): Promise<{ bio: string | null; channelId?: string }> {
    if (process.env.NODE_ENV !== 'production') {
      if (handle === '__nineclip_test_match__') return { bio: `nineClip verify ${code}` };
      if (handle === '__nineclip_test_nomatch__') return { bio: 'tidak ada kode di sini' };
    }
    const fetched = await this.fetcher.fetchBio(platform, handle);
    return { bio: fetched?.bio ?? null, channelId: fetched?.channelId };
  }

  private async markProfileVerified(
    userId: string,
    platform: SocialPlatform,
    username: string,
    channelId?: string,
  ) {
    const now = new Date();
    const data =
      platform === 'tiktok'
        ? { tiktokUsername: username, tiktokVerified: true, tiktokVerifiedAt: now }
        : platform === 'youtube'
          ? { youtubeUsername: username, youtubeVerified: true, youtubeVerifiedAt: now, youtubeChannelId: channelId ?? null }
          : { instagramUsername: username, instagramVerified: true, instagramVerifiedAt: now };
    await this.prisma.clipperProfile.upsert({
      where: { userId },
      create: { userId, ...data },
      update: data,
    });
  }

  private assertPlatform(platform: string): SocialPlatform {
    if (!SOCIAL_PLATFORMS.includes(platform as SocialPlatform)) {
      throw new BadRequestException('Platform tidak valid');
    }
    return platform as SocialPlatform;
  }
}
