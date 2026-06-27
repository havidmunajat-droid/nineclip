import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtGuard } from '@/auth/guards/jwt.guard';
import { CurrentUser, JwtPayload } from '@/common/decorators/user.decorator';
import { CampaignsService } from './campaigns.service';
import { CreateCampaignDto } from './dto/create-campaign.dto';
import { UpdateCampaignDto } from './dto/update-campaign.dto';
import { ViralScoreDto } from './dto/viral-score.dto';
import { CompensationDto } from './dto/compensation.dto';

@ApiTags('campaigns')
@Controller({ path: 'campaigns', version: '1' })
export class CampaignsController {
  constructor(private campaigns: CampaignsService) {}

  // Rule-based, no auth (Section 4.2)
  @Post('viral-score')
  @HttpCode(HttpStatus.OK)
  viralScore(@Body() dto: ViralScoreDto) {
    return this.campaigns.computeViralScore(dto);
  }

  // Midtrans webhook — no auth (signature di production, TODO)
  @Post('payment/webhook')
  @HttpCode(HttpStatus.OK)
  webhook(@Body() body: Record<string, string>) {
    return this.campaigns.handleWebhook(body);
  }

  @Post()
  @UseGuards(JwtGuard)
  @ApiBearerAuth()
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreateCampaignDto) {
    return this.campaigns.create(user.sub, dto);
  }

  @Get()
  @UseGuards(JwtGuard)
  @ApiBearerAuth()
  findAll(@CurrentUser() user: JwtPayload) {
    return this.campaigns.findAllForBrand(user.sub);
  }

  @Get(':id')
  @UseGuards(JwtGuard)
  @ApiBearerAuth()
  findOne(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.campaigns.findOne(user.sub, id);
  }

  @Patch(':id')
  @UseGuards(JwtGuard)
  @ApiBearerAuth()
  update(@CurrentUser() user: JwtPayload, @Param('id') id: string, @Body() dto: UpdateCampaignDto) {
    return this.campaigns.update(user.sub, id, dto);
  }

  @Post(':id/pay')
  @UseGuards(JwtGuard)
  @ApiBearerAuth()
  pay(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.campaigns.pay(user.sub, id);
  }

  // Dev-only — simulasikan pembayaran sukses (diblokir di production)
  @Post(':id/pay/confirm')
  @UseGuards(JwtGuard)
  @ApiBearerAuth()
  confirmPay(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.campaigns.devConfirmPayment(user.sub, id);
  }

  @Get(':id/clippers')
  @UseGuards(JwtGuard)
  @ApiBearerAuth()
  getClippers(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.campaigns.getClippers(user.sub, id);
  }

  // Section 8 — brand pilih kompensasi saat KPI tidak tercapai (extension|voucher)
  @Post(':id/compensation')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtGuard)
  @ApiBearerAuth()
  compensation(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: CompensationDto,
  ) {
    return this.campaigns.applyCompensation(user.sub, id, dto.choice);
  }
}
