import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { PrismaService } from '@/prisma/prisma.service';
import { UsersService } from '@/users/users.service';
import { CreateProjectDto } from './dto/create-project.dto';

const ESTIMATED_MINUTES_PER_URL = 20; // conservative quota check before we know actual duration

@Injectable()
export class ProjectsService {
  constructor(
    private prisma: PrismaService,
    private users: UsersService,
    @InjectQueue('video-processing') private queue: Queue,
  ) {}

  async create(userId: string, dto: CreateProjectDto, filePath?: string) {
    if (dto.sourceType === 'youtube' && !dto.sourceUrl) {
      throw new BadRequestException('URL YouTube diperlukan');
    }
    if (dto.sourceType === 'upload' && !filePath) {
      throw new BadRequestException('File video diperlukan');
    }

    const hasQuota = await this.users.hasQuota(userId, ESTIMATED_MINUTES_PER_URL);
    if (!hasQuota) throw new ForbiddenException('Kuota menit habis. Silakan upgrade paket.');

    const title =
      dto.title ??
      (dto.sourceUrl ? this.titleFromUrl(dto.sourceUrl) : 'Video Upload');

    const project = await this.prisma.project.create({
      data: {
        userId,
        title,
        sourceType: dto.sourceType,
        sourceUrl: dto.sourceUrl,
        filePath,
        hue: Math.floor(Math.random() * 360),
        status: 'queued',
        settings: {
          clipLength: dto.clipLength,
          language: dto.language,
          autoCaptions: dto.autoCaptions,
          autoReframe: dto.autoReframe,
          viralityAnalysis: dto.viralityAnalysis,
        },
      },
    });

    await this.queue.add('process', { projectId: project.id }, { jobId: project.id });

    return project;
  }

  /**
   * Sprint 2 — entry point pipeline untuk Campaign Engine.
   * Sama dengan create() tapi TANPA quota-check (brand bayar pakai credit, bukan menit)
   * dan memakai setting default. Reuse queue & pipeline yang sama persis dengan /new.
   */
  async createForCampaign(userId: string, sourceUrl: string, title?: string) {
    if (!sourceUrl) throw new BadRequestException('URL video campaign diperlukan');

    const project = await this.prisma.project.create({
      data: {
        userId,
        title: title ?? this.titleFromUrl(sourceUrl),
        sourceType: 'youtube',
        sourceUrl,
        hue: Math.floor(Math.random() * 360),
        status: 'queued',
        settings: {
          clipLength: 'auto',
          language: 'id',
          autoCaptions: true,
          autoReframe: true,
          viralityAnalysis: true,
        },
      },
    });

    await this.queue.add('process', { projectId: project.id }, { jobId: project.id });

    return project;
  }

  async findAll(userId: string) {
    return this.prisma.project.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { clips: true } } },
    });
  }

  async findOne(userId: string, id: string) {
    const project = await this.prisma.project.findUnique({
      where: { id },
      include: { _count: { select: { clips: true } } },
    });
    if (!project) throw new NotFoundException('Project tidak ditemukan');
    if (project.userId !== userId) throw new ForbiddenException();
    return project;
  }

  async delete(userId: string, id: string) {
    const project = await this.prisma.project.findUnique({ where: { id } });
    if (!project) throw new NotFoundException();
    if (project.userId !== userId) throw new ForbiddenException();
    await this.prisma.project.delete({ where: { id } });
    return { deleted: true };
  }

  private titleFromUrl(url: string): string {
    try {
      const u = new URL(url);
      const v = u.searchParams.get('v');
      return v ? `YouTube – ${v}` : 'YouTube Video';
    } catch {
      return 'YouTube Video';
    }
  }
}
