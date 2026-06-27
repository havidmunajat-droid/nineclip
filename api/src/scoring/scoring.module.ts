import { Module, OnModuleInit } from '@nestjs/common';
import { BullModule, InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { ScoringService } from './scoring.service';
import { ScoringProcessor } from './scoring.processor';

const SCORING_INTERVAL_MS = 6 * 60 * 60 * 1000; // 6 jam

@Module({
  // Queue baru 'scoring' — koneksi global Bull diwarisi (tidak menyentuh
  // 'video-processing' / 'booking-expiry' / config Upstash).
  imports: [BullModule.registerQueue({ name: 'scoring' })],
  providers: [ScoringService, ScoringProcessor],
  exports: [ScoringService],
})
export class ScoringModule implements OnModuleInit {
  constructor(@InjectQueue('scoring') private queue: Queue) {}

  async onModuleInit() {
    // Bersihkan repeatable lama lalu daftarkan ulang → tepat satu cron, idempotent
    // saat restart (tidak menumpuk job).
    const existing = await this.queue.getRepeatableJobs();
    for (const r of existing) {
      if (r.name === 'recompute') await this.queue.removeRepeatableByKey(r.key);
    }
    await this.queue.add(
      'recompute',
      {},
      { repeat: { every: SCORING_INTERVAL_MS }, removeOnComplete: true, removeOnFail: true },
    );
  }
}
