import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { PrismaService } from '@/prisma/prisma.service';

@Injectable()
export class JobsService {
  constructor(
    @InjectQueue('video-processing') private queue: Queue,
    private prisma: PrismaService,
  ) {}

  async getQueueStatus() {
    const [waiting, active, completed, failed] = await Promise.all([
      this.queue.getWaitingCount(),
      this.queue.getActiveCount(),
      this.queue.getCompletedCount(),
      this.queue.getFailedCount(),
    ]);
    return { waiting, active, completed, failed };
  }

  async retryFailed(projectId: string) {
    await this.prisma.project.update({
      where: { id: projectId },
      data: { status: 'queued', progress: 0, stage: null, errorMsg: null },
    });
    await this.queue.add('process', { projectId }, { jobId: `retry-${projectId}-${Date.now()}` });
    return { queued: true };
  }
}
