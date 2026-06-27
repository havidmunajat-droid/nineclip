export type SupportedPlatform = 'youtube' | 'tiktok' | 'instagram';

export interface ParsedSubmissionUrl {
  platform: SupportedPlatform;
  videoId: string;
  username?: string; // dari path URL (@username TikTok)
}

/**
 * Parse URL submission clipper → platform + videoId + username (jika ada).
 * Return null jika URL tidak dikenal / format tidak valid.
 *
 * Pola yang didukung:
 *  YouTube  : youtube.com/watch?v=ID · youtu.be/ID · youtube.com/shorts/ID
 *  TikTok   : tiktok.com/@user/video/ID · vt.tiktok.com/CODE (shortlink tanpa username)
 *  Instagram: instagram.com/p/ID · /reel/ID · /tv/ID
 */
export function parseSubmissionUrl(raw: string): ParsedSubmissionUrl | null {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return null;
  }
  const host = url.hostname.replace(/^www\./, '');

  // ── YouTube ────────────────────────────────────────────────────────────────
  if (host === 'youtube.com' || host === 'youtu.be') {
    let videoId: string | null = null;
    if (host === 'youtu.be') {
      videoId = url.pathname.slice(1).split('/')[0];
    } else if (url.pathname.startsWith('/shorts/')) {
      videoId = url.pathname.split('/')[2];
    } else if (url.pathname === '/watch') {
      videoId = url.searchParams.get('v');
    }
    if (!videoId || videoId.length < 5) return null;
    return { platform: 'youtube', videoId };
  }

  // ── TikTok ─────────────────────────────────────────────────────────────────
  if (host === 'tiktok.com' || host === 'vt.tiktok.com' || host === 'vm.tiktok.com') {
    const parts = url.pathname.split('/').filter(Boolean);
    // Kanonik: /@username/video/VIDEOID
    if (parts.length >= 3 && parts[0].startsWith('@') && parts[1] === 'video') {
      return { platform: 'tiktok', videoId: parts[2], username: parts[0].slice(1) };
    }
    // Shortlink: vt.tiktok.com/SHORTCODE — videoId best-effort, username tidak tersedia
    if (parts.length === 1 && (host === 'vt.tiktok.com' || host === 'vm.tiktok.com')) {
      return { platform: 'tiktok', videoId: parts[0] };
    }
    return null;
  }

  // ── Instagram ──────────────────────────────────────────────────────────────
  if (host === 'instagram.com') {
    const parts = url.pathname.split('/').filter(Boolean);
    if ((parts[0] === 'p' || parts[0] === 'reel' || parts[0] === 'tv') && parts[1]) {
      return { platform: 'instagram', videoId: parts[1] };
    }
    return null;
  }

  return null;
}
