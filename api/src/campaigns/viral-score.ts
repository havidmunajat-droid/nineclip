// Sprint 2 — Section 3.3 Rule-Based Viral Score
// MVP: murni rule-based (BUKAN memanggil Groq). Cepat & deterministik kecuali
// sedikit jitter acak di akhir (sesuai PRD).

const NICHE_KEYWORDS: Record<string, string[]> = {
  bisnis: ['bisnis', 'business', 'entrepreneur', 'startup', 'revenue', 'profit', 'uang', 'modal', 'investasi'],
  edukasi: ['belajar', 'tutorial', 'tips', 'cara', 'bagaimana', 'how to', 'learn', 'guide', 'penjelasan'],
  gaming: ['game', 'gaming', 'gameplay', 'esports', 'mobile legends', 'valorant', 'minecraft', 'ff', 'genshin'],
  kuliner: ['masak', 'resep', 'makan', 'food', 'kuliner', 'restaurant', 'cafe', 'jajan', 'street food'],
  motivasi: ['motivasi', 'inspirasi', 'sukses', 'motivation', 'mindset', 'growth', 'semangat', 'bangkit'],
  teknologi: ['ai', 'tech', 'teknologi', 'coding', 'programming', 'software', 'digital', 'gadget', 'review'],
  hiburan: ['lucu', 'funny', 'comedy', 'entertainment', 'viral', 'meme', 'receh', 'ngakak'],
  kesehatan: ['sehat', 'health', 'fitness', 'olahraga', 'gym', 'diet', 'nutrisi', 'dokter', 'tips kesehatan'],
  lifestyle: ['lifestyle', 'vlog', 'daily', 'travel', 'wisata', 'fashion', 'style', 'aesthetic'],
};

export interface ViralScoreResult {
  score: number;
  niches: string[];
}

export function calculateViralScore(title: string, description = ''): ViralScoreResult {
  const text = (title + ' ' + description).toLowerCase();
  const detectedNiches = Object.entries(NICHE_KEYWORDS)
    .filter(([, keywords]) => keywords.some((k) => text.includes(k)))
    .map(([niche]) => niche);

  // Hitung skor dari faktor-faktor sederhana
  let score = 45;
  if (detectedNiches.length >= 1) score += 20;
  if (detectedNiches.length >= 2) score += 10;
  if (title.length >= 20 && title.length <= 80) score += 10;
  if (['bisnis', 'edukasi', 'teknologi', 'motivasi'].some((n) => detectedNiches.includes(n))) score += 5;
  score = Math.min(score + Math.floor(Math.random() * 8), 98);

  return {
    score,
    niches: detectedNiches.length > 0 ? detectedNiches : ['umum'],
  };
}
