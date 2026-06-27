import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { ScoringService } from './scoring.service';

/**
 * Queue 'scoring' — repeatable job tiap 6 jam (Section 5 BUSINESS_LOGIC_v2).
 * Koneksi Redis global diwarisi dari app.module (config Upstash tidak disentuh).
 */
@Processor('scoring')
export class ScoringProcessor {
  private readonly log = new Logger(ScoringProcessor.name);

  constructor(private readonly scoring: ScoringService) {}

  @Process('recompute')
  async handleRecompute() {
    await this.scoring.recomputeAllActive();
  }
}
