import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { PrismaService } from '@/prisma/prisma.service';
import { UsersService } from '@/users/users.service';
import { PipelineService } from './pipeline.service';

interface ProcessJob {
  projectId: string;
}

@Processor('video-processing')
export class VideoProcessor {
  private readonly log = new Logger(VideoProcessor.name);

  constructor(
    private prisma: PrismaService,
    private users: UsersService,
    private pipeline: PipelineService,
  ) {}

  @Process('process')
  async handleProcess(job: Job<ProcessJob>) {
    const { projectId } = job.data;
    this.log.log(`Starting pipeline for project ${projectId}`);

    const project = await this.prisma.project.findUnique({ where: { id: projectId } });
    if (!project) return;

    try {
      await this.setStage(projectId, 'download', 5);
      const { filePath, duration } = await this.pipeline.download(project);
      await job.progress(15);

      await this.setStage(projectId, 'transcribe', 15);
      const { text: transcript, segments: transcriptSegs } = await this.pipeline.transcribe(filePath, project);
      await job.progress(40);

      await this.setStage(projectId, 'analyze', 40);
      const segments = await this.pipeline.analyze(transcript, project);
      await job.progress(60);

      await this.setStage(projectId, 'clip', 60);
      const clips = await this.pipeline.clipSegments(filePath, segments, project);
      await job.progress(75);

      await this.setStage(projectId, 'reframe', 75);
      const reframed = await this.pipeline.reframe(clips, project);
      await job.progress(88);

      await this.setStage(projectId, 'caption', 88);
      const final = await this.pipeline.addCaptions(reframed, transcriptSegs, project);
      await job.progress(95);

      await this.prisma.clip.createMany({ data: final.map((c) => ({ ...c, projectId })) });

      const durationMinutes = Math.ceil(duration / 60);
      await this.users.deductMinutes(project.userId, durationMinutes);

      await this.prisma.project.update({
        where: { id: projectId },
        data: { status: 'ready', progress: 100, stage: 'done', duration },
      });

      await job.progress(100);
      this.log.log(`Pipeline done for ${projectId} — ${final.length} clips`);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.log.error(`Pipeline failed for ${projectId}: ${message}`);
      await this.prisma.project.update({
        where: { id: projectId },
        data: { status: 'failed', errorMsg: message },
      });
      throw err;
    }
  }

  private async setStage(projectId: string, stage: string, progress: number) {
    await this.prisma.project.update({
      where: { id: projectId },
      data: { status: 'processing', stage, progress },
    });
  }
}
