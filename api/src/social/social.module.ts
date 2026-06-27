import { Module } from '@nestjs/common';
import { SocialController } from './social.controller';
import { SocialVerificationService } from './social-verification.service';
import { SocialFetcherService } from './social-fetcher.service';

@Module({
  controllers: [SocialController],
  providers: [SocialVerificationService, SocialFetcherService],
  exports: [SocialVerificationService],
})
export class SocialModule {}
