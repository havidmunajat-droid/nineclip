import { Module } from '@nestjs/common';
import { ProjectsModule } from '@/projects/projects.module';
import { LifecycleModule } from '@/lifecycle/lifecycle.module';
import { CampaignsController } from './campaigns.controller';
import { CampaignsService } from './campaigns.service';
import { CampaignMatchingService } from './campaign-matching.service';

@Module({
  imports: [ProjectsModule, LifecycleModule], // pipeline + lifecycle (kompensasi)
  controllers: [CampaignsController],
  providers: [CampaignsService, CampaignMatchingService],
  exports: [CampaignsService],
})
export class CampaignsModule {}
