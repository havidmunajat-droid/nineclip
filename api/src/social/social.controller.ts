import { Body, Controller, Get, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtGuard } from '@/auth/guards/jwt.guard';
import { CurrentUser, JwtPayload } from '@/common/decorators/user.decorator';
import { SocialVerificationService } from './social-verification.service';
import { SocialDto } from './dto/social.dto';

@ApiTags('clipper-social')
@ApiBearerAuth()
@UseGuards(JwtGuard)
@Controller({ path: 'clipper/social', version: '1' })
export class SocialController {
  constructor(private social: SocialVerificationService) {}

  @Post('generate-code')
  @HttpCode(HttpStatus.OK)
  generate(@CurrentUser() user: JwtPayload, @Body() dto: SocialDto) {
    return this.social.generateCode(user.sub, dto.platform, dto.username);
  }

  @Post('verify')
  @HttpCode(HttpStatus.OK)
  verify(@CurrentUser() user: JwtPayload, @Body() dto: SocialDto) {
    return this.social.verify(user.sub, dto.platform, dto.username);
  }

  @Get('status')
  status(@CurrentUser() user: JwtPayload) {
    return this.social.getStatus(user.sub);
  }
}
