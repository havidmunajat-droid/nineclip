import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { LifecycleService } from './lifecycle.service';

/**
 * Queue 'lifecycle' — repeatable tiap 1 jam (Section 7 BUSINESS_LOGIC_v2).
 * Koneksi Redis global diwarisi (config Upstash + queue lain tidak disentuh).
 */
@Processor('lifecycle')
export class LifecycleProcessor {
  private readonly log = new Logger(LifecycleProcessor.name);

  constructor(private readonly lifecycle: LifecycleService) {}

  @Process('tick')
  async handleTick() {
    const expiry = await this.lifecycle.checkExpiry();
    const comp = await this.lifecycle.checkCompensationDeadline();
    if (expiry.closed || expiry.kpiMissed || comp) {
      this.log.log(`Lifecycle tick: ${expiry.closed} closed, ${expiry.kpiMissed} kpi_missed, ${comp} kompensasi default`);
    }
  }
}
