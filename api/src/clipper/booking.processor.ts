import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { ClipperService } from './clipper.service';

interface ExpireJob {
  campaignClipperId: string;
}

/**
 * Queue terpisah 'booking-expiry' (Section 6 BUSINESS_LOGIC_v2).
 * Memakai koneksi Redis global yang sama (config Upstash di app.module tidak
 * disentuh). Job dijadwalkan dengan delay 24 jam saat clipper booking slot.
 */
@Processor('booking-expiry')
export class BookingProcessor {
  private readonly log = new Logger(BookingProcessor.name);

  constructor(private readonly clipper: ClipperService) {}

  @Process('expire')
  async handleExpire(job: Job<ExpireJob>) {
    const { campaignClipperId } = job.data;
    const result = await this.clipper.autoReleaseBooking(campaignClipperId);
    if (result.released) {
      this.log.log(`Booking ${campaignClipperId} hangus → kredit dikembalikan + penalti 48 jam`);
    }
  }
}
