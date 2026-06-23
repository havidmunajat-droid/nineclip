import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { UsersModule } from '@/users/users.module';
import { VideoProcessor } from './jobs.processor';
import { JobsService } from './jobs.service';
import { PipelineService } from './pipeline.service';

@Module({
  imports: [
    BullModule.registerQueue({ name: 'video-processing' }),
    UsersModule,
  ],
  providers: [VideoProcessor, JobsService, PipelineService],
  exports: [JobsService],
})
export class JobsModule {}
