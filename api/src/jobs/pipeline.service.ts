import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { exec } from 'child_process';
import { promisify } from 'util';
import { join } from 'path';
import { existsSync, mkdirSync, createReadStream, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import Groq from 'groq-sdk';

const execAsync = promisify(exec);

// process.cwd() = direktori api/ saat npm start:dev dijalankan dari sana
const YT_DLP = join(process.cwd(), 'bin', 'yt-dlp.exe');

interface ProjectLike {
  id: string;
  sourceType: string;
  sourceUrl: string | null;
  filePath?: string | null;
  settings: unknown;
}

interface Segment {
  start: number;
  end: number;
  text: string;
  score: number;
  reason: string;
  hashtags: string[];
  title: string;
}

interface TranscriptSegment {
  start: number;
  end: number;
  text: string;
}

export interface TranscriptResult {
  text: string;
  segments: TranscriptSegment[];
}

type ClipInput = Omit<Segment, 'score' | 'reason' | 'hashtags' | 'title'> & {
  filePath: string;
};

type ClipCreateInput = {
  title: string;
  start: number;
  end: number;
  duration: number;
  hue: number;
  viralityScore: number;
  viralityReason: string;
  aspectRatio: string;
  hasCaptions: boolean;
  transcript: string;
  hashtags: string[];
  filePath: string;
};

function storagePath(sub: string): string {
  const p = join(process.cwd(), 'storage', sub);
  if (!existsSync(p)) mkdirSync(p, { recursive: true });
  return p;
}

// ---------------------------------------------------------------------------
// SRT helpers
// ---------------------------------------------------------------------------

function toTimecode(secs: number): string {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = Math.floor(secs % 60);
  const ms = Math.round((secs % 1) * 1000);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')},${String(ms).padStart(3, '0')}`;
}

// Split segment panjang ke chunk max N kata dengan timing proporsional
function splitSegment(seg: TranscriptSegment, maxWords = 5): TranscriptSegment[] {
  const words = seg.text.trim().split(/\s+/);
  if (words.length <= maxWords) return [seg];

  const dur = seg.end - seg.start;
  const chunks: TranscriptSegment[] = [];
  let wordIdx = 0;

  while (wordIdx < words.length) {
    const chunk = words.slice(wordIdx, wordIdx + maxWords);
    const startFrac = wordIdx / words.length;
    const endFrac = Math.min(1, (wordIdx + maxWords) / words.length);
    chunks.push({
      start: seg.start + startFrac * dur,
      end: seg.start + endFrac * dur,
      text: chunk.join(' '),
    });
    wordIdx += maxWords;
  }
  return chunks;
}

function writeSrt(filePath: string, segments: TranscriptSegment[]): void {
  const entries = segments.flatMap((s) => splitSegment(s, 5));
  const srt = entries
    .map(
      (seg, i) =>
        `${i + 1}\n${toTimecode(seg.start)} --> ${toTimecode(seg.end)}\n${seg.text}`,
    )
    .join('\n\n');
  writeFileSync(filePath, srt + '\n', 'utf-8');
}

// Windows FFmpeg subtitles filter: forward slash + escape colon setelah drive letter
function ffmpegSubtitlesPath(p: string): string {
  return p.replace(/\\/g, '/').replace(/^([A-Za-z]):/, '$1\\:');
}

@Injectable()
export class PipelineService {
  private readonly log = new Logger(PipelineService.name);
  private readonly groq: Groq;

  constructor(private config: ConfigService) {
    this.groq = new Groq({
      apiKey: this.config.getOrThrow<string>('GROQ_API_KEY'),
    });
  }

  // ---------------------------------------------------------------------------
  // 1. Download
  // ---------------------------------------------------------------------------

  async download(project: ProjectLike): Promise<{ filePath: string; duration: number }> {
    if (project.sourceType === 'upload') {
      const fp = (project.filePath ?? project.sourceUrl) as string;
      const duration = await this.probeDuration(fp);
      return { filePath: fp, duration };
    }

    const outDir = storagePath(`raw/${project.id}`);
    const outTemplate = join(outDir, 'source.%(ext)s');
    const filePath = join(outDir, 'source.mp4');

    this.log.log(`yt-dlp: ${project.sourceUrl}`);
    await execAsync(
      `"${YT_DLP}" -f "bestvideo[height<=720][ext=mp4]+bestaudio[ext=m4a]/best[height<=720][ext=mp4]/best[height<=720]" ` +
        `--merge-output-format mp4 -o "${outTemplate}" "${project.sourceUrl}"`,
      { timeout: 10 * 60 * 1000 },
    );

    const duration = await this.probeDuration(filePath);
    return { filePath, duration };
  }

  // ---------------------------------------------------------------------------
  // 2. Transcribe — Groq Whisper-large-v3
  //    Returns full text + timed segments untuk caption burn-in
  // ---------------------------------------------------------------------------

  async transcribe(filePath: string, project: ProjectLike): Promise<TranscriptResult> {
    const settings = project.settings as Record<string, unknown>;
    const lang = (settings?.['language'] as string | undefined) ?? 'id';
    const groqLang = lang === 'auto' ? undefined : lang;

    // Extract audio ke MP3 mono 64k — jauh lebih kecil dari video MP4
    const audioPath = filePath.replace(/\.[^.]+$/, '_audio.mp3');
    this.log.log(`FFmpeg extract audio → ${audioPath}`);
    await execAsync(
      `ffmpeg -y -i "${filePath}" -vn -ar 16000 -ac 1 -b:a 64k "${audioPath}"`,
    );

    // Groq Whisper 25 MB limit. ~64kbps 1 jam ≈ 28 MB; video >~90 menit perlu chunking (TODO).
    this.log.log(`Groq Whisper transcribing (lang=${lang})`);
    const transcription = await this.groq.audio.transcriptions.create({
      file: createReadStream(audioPath),
      model: 'whisper-large-v3',
      ...(groqLang ? { language: groqLang } : {}),
      response_format: 'verbose_json',
    });

    // verbose_json includes .segments with start/end timestamps per sentence
    const raw = transcription as unknown as {
      text: string;
      segments?: Array<{ start: number; end: number; text: string }>;
    };
    const segments: TranscriptSegment[] = (raw.segments ?? []).map((s) => ({
      start: s.start,
      end: s.end,
      text: s.text.trim(),
    }));

    this.log.log(
      `Transcription done: ${transcription.text.length} chars, ${segments.length} segments`,
    );
    return { text: transcription.text, segments };
  }

  // ---------------------------------------------------------------------------
  // 3. Analyze — Groq Llama-3.3-70B
  // ---------------------------------------------------------------------------

  async analyze(transcript: string, project: ProjectLike): Promise<Segment[]> {
    const settings = project.settings as Record<string, unknown>;
    const clipLength = (settings?.['clipLength'] as string | undefined) ?? 'auto';

    const bounds: Record<string, [number, number]> = {
      auto: [20, 90],
      lt30: [10, 30],
      '30to60': [30, 60],
      '60to90': [60, 90],
    };
    const [minDur, maxDur] = bounds[clipLength] ?? bounds['auto'];

    this.log.log(`Groq Llama analyzing virality (clipLength=${clipLength})`);

    // Potong transcript ke maks ~12.000 kata supaya tidak melampaui context window
    const words = transcript.split(/\s+/);
    const truncated = words.slice(0, 12000).join(' ');

    const prompt = `Kamu adalah pakar konten viral media sosial (TikTok, Instagram Reels, YouTube Shorts).

Diberikan transkrip video panjang, identifikasi 5–8 momen terbaik untuk dijadikan klip pendek yang viral.

Setiap klip harus:
- Berdurasi antara ${minDur}–${maxDur} detik
- Memiliki hook yang kuat di 3 detik pertama
- Bisa dipahami tanpa konteks video asli
- Mengandung insight, emosi, atau momen mengejutkan

Balas HANYA dengan JSON valid (tanpa markdown code block), format:
{
  "segments": [
    {
      "start": <detik mulai, angka>,
      "end": <detik selesai, angka>,
      "title": "<judul klip menarik, maks 60 karakter>",
      "score": <skor viralitas 0-100>,
      "reason": "<alasan singkat kenapa viral, maks 120 karakter>",
      "hashtags": ["#tag1", "#tag2", "#tag3", "#tag4"],
      "text": "<kutipan pendek dari transkrip di segmen ini>"
    }
  ]
}

Transkrip:
${truncated}`;

    const completion = await this.groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.4,
      max_tokens: 2048,
      response_format: { type: 'json_object' },
    });

    const raw = completion.choices[0]?.message?.content ?? '{"segments":[]}';
    this.log.log(`LLM response: ${raw.slice(0, 200)}...`);

    try {
      const parsed = JSON.parse(raw) as { segments?: Segment[] };
      const segs = parsed.segments ?? [];
      if (segs.length === 0) {
        this.log.warn('LLM returned no segments — falling back to stub');
        return this.stubAnalyze(transcript, minDur, maxDur);
      }
      return segs;
    } catch (e) {
      this.log.error(`Failed to parse LLM response: ${e}`);
      return this.stubAnalyze(transcript, minDur, maxDur);
    }
  }

  // ---------------------------------------------------------------------------
  // 4. Cut clips — FFmpeg
  // ---------------------------------------------------------------------------

  async clipSegments(
    filePath: string,
    segments: Segment[],
    project: ProjectLike,
  ): Promise<ClipInput[]> {
    const outDir = storagePath(`clips/raw/${project.id}`);
    const results: ClipInput[] = [];

    for (const seg of segments) {
      const outFile = join(outDir, `${seg.start.toFixed(0)}-${seg.end.toFixed(0)}.mp4`);
      this.log.log(`FFmpeg cut ${seg.start}s–${seg.end}s`);

      await execAsync(
        `ffmpeg -y -ss ${seg.start} -to ${seg.end} -i "${filePath}" ` +
          `-c:v libx264 -preset fast -crf 23 -c:a aac "${outFile}"`,
      );

      results.push({ ...seg, filePath: outFile });
    }

    return results;
  }

  // ---------------------------------------------------------------------------
  // 5. Reframe — FFmpeg center-crop 9:16
  // ---------------------------------------------------------------------------

  async reframe(clips: ClipInput[], project: ProjectLike): Promise<ClipInput[]> {
    const settings = project.settings as Record<string, unknown>;
    if (!settings?.['autoReframe']) return clips;

    const outDir = storagePath(`clips/reframed/${project.id}`);
    const results: ClipInput[] = [];

    for (const clip of clips) {
      const outFile = join(outDir, `rf-${clip.start.toFixed(0)}.mp4`);
      this.log.log(`FFmpeg reframe → 9:16: ${clip.filePath}`);

      await execAsync(
        `ffmpeg -y -i "${clip.filePath}" ` +
          `-vf "crop=ih*9/16:ih:(iw-ih*9/16)/2:0,scale=1080:1920" ` +
          `-c:v libx264 -preset fast -crf 23 -c:a aac "${outFile}"`,
      );

      results.push({ ...clip, filePath: outFile });
    }

    return results;
  }

  // ---------------------------------------------------------------------------
  // 6. Captions — burn-in via FFmpeg subtitles filter (SRT dari Groq segments)
  // ---------------------------------------------------------------------------

  async addCaptions(
    clips: ClipInput[],
    transcriptSegments: TranscriptSegment[],
    project: ProjectLike,
  ): Promise<ClipCreateInput[]> {
    const settings = project.settings as Record<string, unknown>;
    const autoCaptions = !!(settings?.['autoCaptions']);
    const hue = Math.floor(Math.random() * 360);
    const results: ClipCreateInput[] = [];

    for (const [i, clip] of clips.entries()) {
      const seg = clip as unknown as Segment;
      let outFilePath = clip.filePath;

      if (autoCaptions && transcriptSegments.length > 0) {
        // Filter + adjust timestamp ke t=0 relatif dari awal klip
        const clipSegs = transcriptSegments
          .filter((s) => s.end > clip.start && s.start < clip.end)
          .map((s) => ({
            start: parseFloat(Math.max(0, s.start - clip.start).toFixed(3)),
            end: parseFloat(Math.min(clip.end - clip.start, s.end - clip.start).toFixed(3)),
            text: s.text,
          }))
          .filter((s) => s.end > s.start);

        if (clipSegs.length > 0) {
          const srtPath = join(tmpdir(), `nineclip_${project.id}_${i}.srt`);
          writeSrt(srtPath, clipSegs);

          const captionedPath = clip.filePath.replace(/\.mp4$/, '_cap.mp4');
          const escapedSrt = ffmpegSubtitlesPath(srtPath);

          this.log.log(`Burning captions for clip ${i} → ${captionedPath}`);
          try {
            await execAsync(
              `ffmpeg -y -i "${clip.filePath}" ` +
                `-vf "subtitles='${escapedSrt}':force_style='FontName=Arial,FontSize=16,Bold=1,` +
                `PrimaryColour=&H00FFFFFF,OutlineColour=&H00000000,Outline=2,Shadow=1,Alignment=2'" ` +
                `-c:v libx264 -preset fast -crf 23 -c:a aac "${captionedPath}"`,
            );
            outFilePath = captionedPath;
          } catch (err) {
            this.log.warn(`Caption burn failed for clip ${i}, pakai versi tanpa caption: ${err}`);
          }
        }
      }

      results.push({
        title: seg.title ?? `Klip ${i + 1}`,
        start: clip.start,
        end: clip.end,
        duration: clip.end - clip.start,
        hue: (hue + i * 37) % 360,
        viralityScore: seg.score ?? 70,
        viralityReason: seg.reason ?? '',
        aspectRatio: '9:16',
        hasCaptions: autoCaptions,
        transcript: clip.text,
        hashtags: seg.hashtags ?? [],
        filePath: outFilePath,
      });
    }

    return results;
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  private async probeDuration(filePath: string): Promise<number> {
    try {
      const { stdout } = await execAsync(
        `ffprobe -v quiet -print_format json -show_format "${filePath}"`,
      );
      const parsed = JSON.parse(stdout) as { format?: { duration?: string } };
      return parseFloat(parsed.format?.duration ?? '0');
    } catch {
      return 0;
    }
  }

  private stubAnalyze(transcript: string, minDur: number, maxDur: number): Segment[] {
    const words = transcript.split(/\s+/);
    const chunkSize = Math.ceil(words.length / 3);
    const avgDur = (minDur + maxDur) / 2;

    return [0, 1, 2].map((i) => {
      const text = words.slice(i * chunkSize, (i + 1) * chunkSize).join(' ');
      return {
        start: i * avgDur,
        end: i * avgDur + avgDur,
        text,
        score: 85 - i * 12,
        reason: ['Hook yang sangat kuat', 'Momen emosional tinggi', 'Insight unik'][i]!,
        title: [`Bagian terbaik ${i + 1}`, 'Highlight utama', 'Momen viral'][i]!,
        hashtags: ['#shorts', '#viral', '#tips'],
      };
    });
  }
}
