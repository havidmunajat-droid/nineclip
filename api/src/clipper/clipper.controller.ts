import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { createReadStream, existsSync } from 'fs';
import { JwtGuard } from '@/auth/guards/jwt.guard';
import { CurrentUser, JwtPayload } from '@/common/decorators/user.decorator';
import { ClipperService } from './clipper.service';
import { UpdateClipperProfileDto } from './dto/update-profile.dto';
import { SubmitDto } from './dto/submit.dto';
import { WithdrawDto } from './dto/withdraw.dto';

@ApiTags('clipper')
@ApiBearerAuth()
@UseGuards(JwtGuard)
@Controller({ path: 'clipper', version: '1' })
export class ClipperController {
  constructor(private clipper: ClipperService) {}

  @Get('profile')
  getProfile(@CurrentUser() user: JwtPayload) {
    return this.clipper.getProfile(user.sub);
  }

  @Put('profile')
  upsertProfile(@CurrentUser() user: JwtPayload, @Body() dto: UpdateClipperProfileDto) {
    return this.clipper.upsertProfile(user.sub, dto);
  }

  @Get('campaigns')
  listCampaigns(@CurrentUser() user: JwtPayload) {
    return this.clipper.listCampaigns(user.sub);
  }

  @Get('campaigns/:id')
  campaignDetail(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.clipper.getCampaignDetail(user.sub, id);
  }

  @Post('campaigns/:id/accept')
  @HttpCode(HttpStatus.OK)
  accept(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.clipper.accept(user.sub, id);
  }

  @Post('campaigns/:id/decline')
  @HttpCode(HttpStatus.OK)
  decline(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.clipper.decline(user.sub, id);
  }

  @Post('campaigns/:id/submit')
  @HttpCode(HttpStatus.OK)
  submit(@CurrentUser() user: JwtPayload, @Param('id') id: string, @Body() dto: SubmitDto) {
    return this.clipper.submit(user.sub, id, dto);
  }

  @Get('earnings')
  earnings(@CurrentUser() user: JwtPayload) {
    return this.clipper.getEarnings(user.sub);
  }

  @Post('withdraw')
  @HttpCode(HttpStatus.OK)
  withdraw(@CurrentUser() user: JwtPayload, @Body() dto: WithdrawDto) {
    return this.clipper.withdraw(user.sub, dto);
  }

  // Download aset klip — akses diverifikasi lewat keanggotaan campaign.
  @Post('clips/:clipId/download')
  async download(
    @CurrentUser() user: JwtPayload,
    @Param('clipId') clipId: string,
    @Res() res: Response,
  ) {
    const clip = await this.clipper.getDownloadableClip(user.sub, clipId);
    if (!clip.filePath || !existsSync(clip.filePath)) {
      return res.status(404).json({ message: 'File klip belum tersedia' });
    }
    res.setHeader('Content-Disposition', `attachment; filename="clip-${clip.id}.mp4"`);
    res.setHeader('Content-Type', 'video/mp4');
    createReadStream(clip.filePath).pipe(res);
  }
}
