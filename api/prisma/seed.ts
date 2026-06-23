import { Prisma, PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

// Kredensial demo untuk login lokal
const DEMO_EMAIL = 'havid.munajat@gmail.com';
const DEMO_PASSWORD = 'nineclip123';

interface SeedProject {
  id: string;
  title: string;
  sourceType: 'youtube' | 'upload';
  sourceUrl: string;
  duration: number;
  hue: number;
  createdAt: string;
  status: 'queued' | 'processing' | 'ready' | 'failed';
  progress: number;
  stage: string;
  clipsCount: number;
  settings: Record<string, unknown>;
}

const baseSettings = {
  clipLength: 'auto',
  language: 'id',
  autoCaptions: true,
  autoReframe: true,
  viralityAnalysis: true,
};

const projects: SeedProject[] = [
  {
    id: 'prj_8fk2',
    title: 'Podcast Bisnis #42 — Strategi Scaling Startup',
    sourceType: 'youtube',
    sourceUrl: 'https://youtube.com/watch?v=dQw4w9WgXcQ',
    duration: 3245,
    hue: 84,
    createdAt: '2026-06-21T08:12:00Z',
    status: 'ready',
    progress: 100,
    stage: 'done',
    clipsCount: 8,
    settings: { ...baseSettings, clipLength: '30to60' },
  },
  {
    id: 'prj_3xa9',
    title: 'Webinar Marketing — Funnel yang Convert di 2026',
    sourceType: 'youtube',
    sourceUrl: 'https://youtube.com/watch?v=abcd1234',
    duration: 2680,
    hue: 150,
    createdAt: '2026-06-21T06:40:00Z',
    status: 'processing',
    progress: 62,
    stage: 'clip',
    clipsCount: 0,
    settings: { ...baseSettings, clipLength: 'auto' },
  },
  {
    id: 'prj_1qw7',
    title: 'Interview Founder — Dari 0 ke 1 Juta User',
    sourceType: 'upload',
    sourceUrl: 'founder-interview-final.mp4',
    duration: 1890,
    hue: 48,
    createdAt: '2026-06-20T14:05:00Z',
    status: 'ready',
    progress: 100,
    stage: 'done',
    clipsCount: 6,
    settings: { ...baseSettings, clipLength: 'lt30', autoReframe: false },
  },
  {
    id: 'prj_5tz2',
    title: 'Kelas Online — Dasar Copywriting yang Menjual',
    sourceType: 'youtube',
    sourceUrl: 'https://youtube.com/watch?v=zzz9999',
    duration: 4120,
    hue: 200,
    createdAt: '2026-06-19T09:30:00Z',
    status: 'ready',
    progress: 100,
    stage: 'done',
    clipsCount: 11,
    settings: { ...baseSettings, clipLength: '30to60' },
  },
  {
    id: 'prj_9hd4',
    title: 'Talkshow — Mindset Produktif Anti Burnout',
    sourceType: 'upload',
    sourceUrl: 'talkshow-mindset.mp4',
    duration: 2240,
    hue: 320,
    createdAt: '2026-06-18T19:15:00Z',
    status: 'failed',
    progress: 0,
    stage: 'download',
    clipsCount: 0,
    settings: { ...baseSettings, clipLength: 'auto' },
  },
];

const clipTemplates = [
  {
    title: '"Modal bukan masalah utama startup"',
    reason: 'Pernyataan kontroversial di 12 detik pertama + hook kuat.',
    tags: ['#startup', '#bisnis', '#founder', '#fyp'],
    transcript:
      'Banyak orang pikir modal itu segalanya. Padahal yang bikin startup mati bukan kehabisan uang, tapi kehabisan pelanggan...',
  },
  {
    title: 'Cara closing tanpa terkesan maksa',
    reason: 'Tips actionable + ada angka konkret, retensi tinggi.',
    tags: ['#sales', '#closing', '#marketing', '#tips'],
    transcript:
      'Trik closing yang paling underrated itu diam. Setelah kamu kasih penawaran, jangan ngomong dulu...',
  },
  {
    title: '"Saya pernah bangkrut 2 kali"',
    reason: 'Momen emosional + storytelling, kurva engagement memuncak.',
    tags: ['#story', '#motivasi', '#bisnis', '#mindset'],
    transcript:
      'Tahun 2019 saya kehilangan semuanya. Rumah dijual, tim bubar. Tapi justru di titik itu saya belajar...',
  },
  {
    title: '3 metrik yang wajib dipantau tiap hari',
    reason: 'Format listicle, mudah disimpan & dibagikan.',
    tags: ['#metrics', '#growth', '#startup', '#data'],
    transcript:
      'Kalau kamu cuma boleh lihat tiga angka tiap pagi, lihat ini: retention, CAC, dan burn rate...',
  },
  {
    title: 'Kesalahan hiring yang bikin rugi miliaran',
    reason: 'Angka besar + rasa penasaran tinggi di hook.',
    tags: ['#hiring', '#tim', '#bisnis', '#leadership'],
    transcript:
      'Salah hire satu orang senior bisa bikin kamu rugi sampai miliaran, bukan cuma gajinya tapi...',
  },
  {
    title: '"Jangan kejar viral, kejar ini"',
    reason: 'Contrarian take, memancing komentar & debat.',
    tags: ['#konten', '#kreator', '#strategi', '#fyp'],
    transcript:
      'Viral itu efek samping, bukan tujuan. Yang harus kamu kejar adalah konsistensi nilai ke audiens...',
  },
  {
    title: 'Rutinitas pagi para founder sukses',
    reason: 'Relatable + format yang mudah ditiru audiens.',
    tags: ['#produktif', '#rutinitas', '#founder', '#pagi'],
    transcript:
      'Bukan jam 4 pagi yang penting. Yang penting kamu punya satu jam tanpa notifikasi untuk...',
  },
  {
    title: 'Negosiasi gaji: kalimat pembuka terbaik',
    reason: 'Praktis, langsung bisa dipakai, save-rate tinggi.',
    tags: ['#karir', '#negosiasi', '#tips', '#gaji'],
    transcript:
      'Jangan pernah sebut angka duluan. Mulai dengan pertanyaan ini supaya posisimu lebih kuat...',
  },
];

function clipsForProject(p: SeedProject) {
  const count = Math.max(p.clipsCount, 0);
  const lens = [22, 38, 47, 58, 31];
  const out = [];
  for (let i = 0; i < count; i++) {
    const src = clipTemplates[i % clipTemplates.length]!;
    const start = Math.floor((p.duration / (count + 1)) * (i + 1));
    const len = lens[i % 5]!;
    const score = 96 - ((i * 7 + 3) % 39);
    out.push({
      projectId: p.id,
      title: src.title,
      start,
      end: start + len,
      duration: len,
      hue: (p.hue + i * 24) % 360,
      viralityScore: score,
      viralityReason: src.reason,
      aspectRatio: '9:16',
      hasCaptions: true,
      transcript: src.transcript,
      hashtags: src.tags,
    });
  }
  return out;
}

async function main() {
  console.log('🌱 Seeding nineClip database...');

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 12);

  const user = await prisma.user.upsert({
    where: { email: DEMO_EMAIL },
    update: { name: 'Havid Munajat', planId: 'creator', minutesUsed: 184 },
    create: {
      email: DEMO_EMAIL,
      name: 'Havid Munajat',
      passwordHash,
      planId: 'creator',
      minutesUsed: 184,
    },
  });
  console.log(`✓ User: ${user.email}`);

  // Reset existing demo projects (cascade deletes clips)
  await prisma.project.deleteMany({ where: { userId: user.id } });

  for (const p of projects) {
    await prisma.project.create({
      data: {
        id: p.id,
        userId: user.id,
        title: p.title,
        sourceType: p.sourceType,
        sourceUrl: p.sourceUrl,
        duration: p.duration,
        hue: p.hue,
        status: p.status,
        progress: p.progress,
        stage: p.stage,
        errorMsg: p.status === 'failed' ? 'Gagal mengunduh video dari sumber.' : null,
        settings: p.settings as Prisma.InputJsonValue,
        createdAt: new Date(p.createdAt),
      },
    });

    const clips = clipsForProject(p);
    if (clips.length > 0) {
      await prisma.clip.createMany({ data: clips });
    }
    console.log(`✓ Project: ${p.title} (${clips.length} klip)`);
  }

  // Subscription history (invoices)
  await prisma.subscription.deleteMany({ where: { userId: user.id } });
  const invoiceDates = ['2026-06-01', '2026-05-01', '2026-04-01'];
  const methods = ['gopay', 'bca_va', 'qris'];
  for (let i = 0; i < invoiceDates.length; i++) {
    await prisma.subscription.create({
      data: {
        userId: user.id,
        planId: 'creator',
        status: i === 0 ? 'active' : 'expired',
        method: methods[i],
        amount: 149000,
        orderId: `nineclip-seed-${invoiceDates[i]}`,
        createdAt: new Date(invoiceDates[i]!),
        startedAt: new Date(invoiceDates[i]!),
      },
    });
  }
  console.log(`✓ ${invoiceDates.length} invoice riwayat langganan`);

  console.log('\n✅ Seed selesai!');
  console.log(`   Login demo → email: ${DEMO_EMAIL} | password: ${DEMO_PASSWORD}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
