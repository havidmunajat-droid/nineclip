// Section 8 BUSINESS — Bio Token format: NC-[6char userId]-[4char timestamp].

export const SOCIAL_PLATFORMS = ['tiktok', 'youtube', 'instagram'] as const;
export type SocialPlatform = (typeof SOCIAL_PLATFORMS)[number];

/** Kode unik untuk ditempel di bio. Contoh: NC-A3X9KQ-7F2B. */
export function generateBioToken(userId: string): string {
  const u = userId.replace(/[^a-zA-Z0-9]/g, '').slice(0, 6).toUpperCase().padEnd(6, 'X');
  const t = Date.now().toString(36).slice(-4).toUpperCase().padStart(4, '0');
  return `NC-${u}-${t}`;
}

/** True jika kode (case-insensitive) muncul di teks bio. */
export function bioContainsCode(bio: string, code: string): boolean {
  if (!bio || !code) return false;
  return bio.toUpperCase().includes(code.toUpperCase());
}
