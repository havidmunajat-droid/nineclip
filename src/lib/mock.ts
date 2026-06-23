import type {
  Clip,
  CurrentUser,
  EngagementPoint,
  Invoice,
  Plan,
  Project,
} from "./types";

/** Indonesian Rupiah formatter. */
export function formatIDR(amount: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(amount);
}

export const plans: Plan[] = [
  {
    id: "free",
    name: "Free",
    tagline: "Coba potong video pertamamu.",
    priceMonthly: 0,
    priceYearly: 0,
    minutesPerMonth: 30,
    features: [
      "30 menit upload / bulan",
      "Klip 9:16 vertikal",
      "Auto-caption dasar",
      "Watermark nineClip",
      "Ekspor 720p",
    ],
  },
  {
    id: "creator",
    name: "Creator",
    tagline: "Untuk kreator yang posting rutin.",
    priceMonthly: 149000,
    priceYearly: 1490000,
    minutesPerMonth: 300,
    highlighted: true,
    features: [
      "300 menit upload / bulan",
      "Tanpa watermark",
      "Skor viralitas + alasan AI",
      "Auto-reframe wajah",
      "Judul & hashtag otomatis",
      "Ekspor 1080p",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    tagline: "Untuk agensi & tim konten.",
    priceMonthly: 399000,
    priceYearly: 3990000,
    minutesPerMonth: 1200,
    features: [
      "1.200 menit upload / bulan",
      "Semua fitur Creator",
      "Brand kit & template caption",
      "Prioritas antrian proses",
      "Ekspor 4K",
      "Akses API (beta)",
    ],
  },
];

export const currentUser: CurrentUser = {
  name: "Havid Munajat",
  email: "havid.munajat@gmail.com",
  initials: "HM",
  planId: "creator",
  planName: "Creator",
  minutesUsed: 184,
  minutesQuota: 300,
  isBrand: false,
  isClipper: false,
  isAdmin: false,
  primaryRole: "tool",
  creditBalance: 0,
  pointBalance: 0,
};

export const projects: Project[] = [
  {
    id: "prj_8fk2",
    title: "Podcast Bisnis #42 — Strategi Scaling Startup",
    sourceType: "youtube",
    sourceUrl: "https://youtube.com/watch?v=dQw4w9WgXcQ",
    duration: 3245,
    hue: 84,
    createdAt: "2026-06-21T08:12:00Z",
    status: "ready",
    progress: 100,
    stage: "done",
    clipsCount: 8,
    settings: {
      clipLength: "30to60",
      aspectRatio: "9:16",
      language: "id",
      autoCaption: true,
      autoReframe: true,
      generateHashtags: true,
    },
  },
  {
    id: "prj_3xa9",
    title: "Webinar Marketing — Funnel yang Convert di 2026",
    sourceType: "youtube",
    sourceUrl: "https://youtube.com/watch?v=abcd1234",
    duration: 2680,
    hue: 150,
    createdAt: "2026-06-21T06:40:00Z",
    status: "processing",
    progress: 62,
    stage: "clip",
    clipsCount: 0,
    settings: {
      clipLength: "auto",
      aspectRatio: "9:16",
      language: "id",
      autoCaption: true,
      autoReframe: true,
      generateHashtags: true,
    },
  },
  {
    id: "prj_1qw7",
    title: "Interview Founder — Dari 0 ke 1 Juta User",
    sourceType: "upload",
    sourceUrl: "founder-interview-final.mp4",
    duration: 1890,
    hue: 48,
    createdAt: "2026-06-20T14:05:00Z",
    status: "ready",
    progress: 100,
    stage: "done",
    clipsCount: 6,
    settings: {
      clipLength: "lt30",
      aspectRatio: "9:16",
      language: "id",
      autoCaption: true,
      autoReframe: false,
      generateHashtags: true,
    },
  },
  {
    id: "prj_5tz2",
    title: "Kelas Online — Dasar Copywriting yang Menjual",
    sourceType: "youtube",
    sourceUrl: "https://youtube.com/watch?v=zzz9999",
    duration: 4120,
    hue: 200,
    createdAt: "2026-06-19T09:30:00Z",
    status: "ready",
    progress: 100,
    stage: "done",
    clipsCount: 11,
    settings: {
      clipLength: "30to60",
      aspectRatio: "9:16",
      language: "id",
      autoCaption: true,
      autoReframe: true,
      generateHashtags: true,
    },
  },
  {
    id: "prj_9hd4",
    title: "Talkshow — Mindset Produktif Anti Burnout",
    sourceType: "upload",
    sourceUrl: "talkshow-mindset.mp4",
    duration: 2240,
    hue: 320,
    createdAt: "2026-06-18T19:15:00Z",
    status: "failed",
    progress: 0,
    stage: "download",
    clipsCount: 0,
    settings: {
      clipLength: "auto",
      aspectRatio: "9:16",
      language: "id",
      autoCaption: true,
      autoReframe: true,
      generateHashtags: true,
    },
  },
];

const clipTitles: { title: string; reason: string; tags: string[]; transcript: string }[] = [
  {
    title: "“Modal bukan masalah utama startup”",
    reason: "Pernyataan kontроversial di 12 detik pertama + hook kuat.",
    tags: ["#startup", "#bisnis", "#founder", "#fyp"],
    transcript:
      "Banyak orang pikir modal itu segalanya. Padahal yang bikin startup mati bukan kehabisan uang, tapi kehabisan pelanggan...",
  },
  {
    title: "Cara closing tanpa terkesan maksa",
    reason: "Tips actionable + ada angka konkret, retensi tinggi.",
    tags: ["#sales", "#closing", "#marketing", "#tips"],
    transcript:
      "Trik closing yang paling underrated itu diam. Setelah kamu kasih penawaran, jangan ngomong dulu...",
  },
  {
    title: "“Saya pernah bangkrut 2 kali”",
    reason: "Momen emosional + storytelling, kurva engagement memuncak.",
    tags: ["#story", "#motivasi", "#bisnis", "#mindset"],
    transcript:
      "Tahun 2019 saya kehilangan semuanya. Rumah dijual, tim bubar. Tapi justru di titik itu saya belajar...",
  },
  {
    title: "3 metrik yang wajib dipantau tiap hari",
    reason: "Format listicle, mudah disimpan & dibagikan.",
    tags: ["#metrics", "#growth", "#startup", "#data"],
    transcript:
      "Kalau kamu cuma boleh lihat tiga angka tiap pagi, lihat ini: retention, CAC, dan burn rate...",
  },
  {
    title: "Kesalahan hiring yang bikin rugi miliaran",
    reason: "Angka besar + rasa penasaran tinggi di hook.",
    tags: ["#hiring", "#tim", "#bisnis", "#leadership"],
    transcript:
      "Salah hire satu orang senior bisa bikin kamu rugi sampai miliaran, bukan cuma gajinya tapi...",
  },
  {
    title: "“Jangan kejar viral, kejar ini”",
    reason: "Contrarian take, memancing komentar & debat.",
    tags: ["#konten", "#kreator", "#strategi", "#fyp"],
    transcript:
      "Viral itu efek samping, bukan tujuan. Yang harus kamu kejar adalah konsistensi nilai ke audiens...",
  },
  {
    title: "Rutinitas pagi para founder sukses",
    reason: "Relatable + format yang mudah ditiru audiens.",
    tags: ["#produktif", "#rutinitas", "#founder", "#pagi"],
    transcript:
      "Bukan jam 4 pagi yang penting. Yang penting kamu punya satu jam tanpa notifikasi untuk...",
  },
  {
    title: "Negosiasi gaji: kalimat pembuka terbaik",
    reason: "Praktis, langsung bisa dipakai, save-rate tinggi.",
    tags: ["#karir", "#negosiasi", "#tips", "#gaji"],
    transcript:
      "Jangan pernah sebut angka duluan. Mulai dengan pertanyaan ini supaya posisimu lebih kuat...",
  },
];

/** Deterministic clips for a given project. */
export function clipsForProject(project: Project): Clip[] {
  const count = Math.max(project.clipsCount, 0);
  const out: Clip[] = [];
  for (let i = 0; i < count; i++) {
    const src = clipTitles[i % clipTitles.length]!;
    const start = Math.floor((project.duration / (count + 1)) * (i + 1));
    const len = [22, 38, 47, 58, 31][i % 5]!;
    // Stable, varied-looking scores in 58..96
    const score = 96 - ((i * 7 + 3) % 39);
    out.push({
      id: `${project.id}_clip_${i + 1}`,
      projectId: project.id,
      title: src.title,
      start,
      end: start + len,
      hue: (project.hue + i * 24) % 360,
      viralityScore: score,
      viralityReason: src.reason,
      aspectRatio: project.settings.aspectRatio,
      hasCaptions: project.settings.autoCaption,
      transcript: src.transcript,
      hashtags: src.tags,
    });
  }
  // Highest score first
  return out.sort((a, b) => b.viralityScore - a.viralityScore);
}

/** Deterministic engagement curve for a project (the "virality timeline"). */
export function engagementCurve(project: Project, points = 60): EngagementPoint[] {
  const out: EngagementPoint[] = [];
  for (let i = 0; i < points; i++) {
    const t = Math.round((project.duration / (points - 1)) * i);
    // Sum of a few sine waves + seeded noise -> believable peaks
    const a = Math.sin((i / points) * Math.PI * 3 + project.hue) * 22;
    const b = Math.sin((i / points) * Math.PI * 7 + 1.3) * 14;
    const c = Math.sin((i / points) * Math.PI * 13 + 2.1) * 8;
    const noise = (((i * 928371 + project.hue * 17) % 100) / 100 - 0.5) * 10;
    const score = Math.max(8, Math.min(98, 50 + a + b + c + noise));
    out.push({ t, score: Math.round(score) });
  }
  return out;
}

export const invoices: Invoice[] = [
  { id: "INV-2026-0612", date: "2026-06-01", amount: 149000, plan: "Creator (bulanan)", status: "paid", method: "GoPay" },
  { id: "INV-2026-0511", date: "2026-05-01", amount: 149000, plan: "Creator (bulanan)", status: "paid", method: "BCA Virtual Account" },
  { id: "INV-2026-0410", date: "2026-04-01", amount: 149000, plan: "Creator (bulanan)", status: "paid", method: "QRIS" },
];

export function getProject(id: string): Project | undefined {
  return projects.find((p) => p.id === id);
}
