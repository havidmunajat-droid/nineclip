import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';

@Injectable()
export class ClipsService {
  constructor(private prisma: PrismaService) {}

  async findByProject(userId: string, projectId: string) {
    const project = await this.prisma.project.findUnique({ where: { id: projectId } });
    if (!project) throw new NotFoundException('Project tidak ditemukan');
    if (project.userId !== userId) throw new ForbiddenException();

    return this.prisma.clip.findMany({
      where: { projectId },
      orderBy: { viralityScore: 'desc' },
    });
  }

  async findOne(userId: string, clipId: string) {
    const clip = await this.prisma.clip.findUnique({
      where: { id: clipId },
      include: { project: { select: { userId: true, title: true } } },
    });
    if (!clip) throw new NotFoundException('Klip tidak ditemukan');
    if (clip.project.userId !== userId) throw new ForbiddenException();
    return clip;
  }

  async incrementDownload(clipId: string) {
    await this.prisma.clip.update({
      where: { id: clipId },
      data: { downloadCount: { increment: 1 } },
    });
  }
}
