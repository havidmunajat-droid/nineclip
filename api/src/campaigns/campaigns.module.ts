import { Module } from '@nestjs/common';
import { ProjectsModule } from '@/projects/projects.module';
import { CampaignsController } from './campaigns.controller';
import { CampaignsService } from './campaigns.service';
import { CampaignMatchingService } from './campaign-matching.service';

@Module({
  imports: [ProjectsModule], // reuse ProjectsService untuk koneksi ke pipeline
  controllers: [CampaignsController],
  providers: [CampaignsService, CampaignMatchingService],
  exports: [CampaignsService],
})
export class CampaignsModule {}
