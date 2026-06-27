import { Module, OnModuleInit } from '@nestjs/common';
import { BullModule, InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { ScoringModule } from '@/scoring/scoring.module';
import { LifecycleService } from './lifecycle.service';
import { LifecycleProcessor } from './lifecycle.processor';

const LIFECYCLE_INTERVAL_MS = 60 * 60 * 1000; // 1 jam

@Module({
  // Queue baru 'lifecycle' — koneksi global Bull diwarisi (tidak menyentuh
  // queue lain / config Upstash). ScoringModule untuk recompute skor saat close.
  imports: [BullModule.registerQueue({ name: 'lifecycle' }), ScoringModule],
  providers: [LifecycleService, LifecycleProcessor],
  exports: [LifecycleService],
})
export class LifecycleModule implements OnModuleInit {
  constructor(@InjectQueue('lifecycle') private queue: Queue) {}

  async onModuleInit() {
    // Tepat satu repeatable job (idempotent saat restart).
    const existing = await this.queue.getRepeatableJobs();
    for (const r of existing) {
      if (r.name === 'tick') await this.queue.removeRepeatableByKey(r.key);
    }
    await this.queue.add(
      'tick',
      {},
      { repeat: { every: LIFECYCLE_INTERVAL_MS }, removeOnComplete: true, removeOnFail: true },
    );
  }
}
