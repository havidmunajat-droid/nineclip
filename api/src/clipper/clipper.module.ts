import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { ValidationModule } from '@/validation/validation.module';
import { ClipperController } from './clipper.controller';
import { ClipperService } from './clipper.service';
import { BookingProcessor } from './booking.processor';

@Module({
  imports: [
    // Queue baru 'booking-expiry' — koneksi/global config Bull diwarisi dari
    // app.module (tidak menyentuh queue 'video-processing' / config Upstash).
    BullModule.registerQueue({ name: 'booking-expiry' }),
    ValidationModule,
  ],
  controllers: [ClipperController],
  providers: [ClipperService, BookingProcessor],
  exports: [ClipperService],
})
export class ClipperModule {}
