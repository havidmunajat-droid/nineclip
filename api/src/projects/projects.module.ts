import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { UsersModule } from '@/users/users.module';
import { ProjectsController } from './projects.controller';
import { ProjectsService } from './projects.service';

@Module({
  imports: [
    BullModule.registerQueue({ name: 'video-processing' }),
    UsersModule,
  ],
  controllers: [ProjectsController],
  providers: [ProjectsService],
  exports: [ProjectsService],
})
export class ProjectsModule {}
