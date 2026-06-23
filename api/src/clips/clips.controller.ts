import { Controller, Get, Param, Post, Res, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { createReadStream, existsSync } from 'fs';
import { JwtGuard } from '@/auth/guards/jwt.guard';
import { CurrentUser, JwtPayload } from '@/common/decorators/user.decorator';
import { ClipsService } from './clips.service';

@ApiTags('clips')
@ApiBearerAuth()
@UseGuards(JwtGuard)
@Controller({ path: 'clips', version: '1' })
export class ClipsController {
  constructor(private clips: ClipsService) {}

  @Get('project/:projectId')
  findByProject(
    @CurrentUser() user: JwtPayload,
    @Param('projectId') projectId: string,
  ) {
    return this.clips.findByProject(user.sub, projectId);
  }

  @Get(':id')
  findOne(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.clips.findOne(user.sub, id);
  }

  @Post(':id/download')
  async download(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Res() res: Response,
  ) {
    const clip = await this.clips.findOne(user.sub, id);

    if (!clip.filePath || !existsSync(clip.filePath)) {
      return res.status(404).json({ message: 'File klip belum tersedia' });
    }

    await this.clips.incrementDownload(id);
    res.setHeader('Content-Disposition', `attachment; filename="clip-${id}.mp4"`);
    res.setHeader('Content-Type', 'video/mp4');
    createReadStream(clip.filePath).pipe(res);
  }
}
