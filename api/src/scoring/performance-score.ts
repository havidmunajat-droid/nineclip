// Section 5 BUSINESS_LOGIC_v2 — Performance Score Engine (MVP).
// Retention Rate DIHAPUS dari MVP (butuh API platform) → menyusul Sprint 3.

/**
 * Skor 0–100. normViews DINAMIS per-campaign: dibandingkan ke views tertinggi
 * di kampanye yang sama (maxViewsInCampaign), bukan angka tetap.
 * Bobot: views 70% + engagement 20% + originality 10%.
 */
export function calculatePerformanceScore(
  clipperViews: number,
  maxViewsInCampaign: number, // views tertinggi di campaign ini (data aktual)
  likes: number,
  comments: number,
  shares: number,
  isOriginal: boolean,
): number {
  // Normalized Views (0–100), rank-based terhadap performer tertinggi campaign.
  const normViews = maxViewsInCampaign > 0 ? (clipperViews / maxViewsInCampaign) * 100 : 0;

  // Normalized Engagement (0–100): engagement_rate × 10, cap 100.
  const rawEngagement =
    clipperViews > 0 ? ((likes + comments + shares) / clipperViews) * 100 : 0;
  const normEngagement = Math.min(rawEngagement * 10, 100);

  // Originality (0/100 di MVP).
  const originality = isOriginal ? 100 : 0;

  const score = normViews * 0.7 + normEngagement * 0.2 + originality * 0.1;
  return Math.round(Math.min(score, 100));
}
