import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Patch,
  UseGuards,
} from '@nestjs/common';
import { JwtGuard } from '@/auth/guards/jwt.guard';
import { AdminGuard } from '@/auth/guards/admin.guard';
import { AppConfigService } from './app-config.service';
import { UpdatePackageConfigDto, UpdatePlanConfigDto, UpdatePlatformConfigDto } from './dto/app-config.dto';

/** GET /config/* — publik, dipakai campaign wizard + billing frontend */
@Controller('config')
export class PublicConfigController {
  constructor(private appConfig: AppConfigService) {}

  @Get('packages')
  getPackages() {
    return this.appConfig.getPackages();
  }

  @Get('plans')
  getPlans() {
    return this.appConfig.getPlans();
  }
}

/** /admin/config — hanya admin */
@UseGuards(JwtGuard, AdminGuard)
@Controller('admin/config')
export class AdminConfigController {
  constructor(private appConfig: AppConfigService) {}

  @Get()
  async getConfig() {
    const [packages, platform, plans] = await Promise.all([
      this.appConfig.getPackages(),
      this.appConfig.getPlatformConfig(),
      this.appConfig.getPlans(),
    ]);
    return { packages, platform, plans };
  }

  @Patch('packages/:type')
  @HttpCode(200)
  updatePackage(@Param('type') type: string, @Body() dto: UpdatePackageConfigDto) {
    return this.appConfig.updatePackage(type, dto);
  }

  @Patch('platform')
  @HttpCode(200)
  updatePlatform(@Body() dto: UpdatePlatformConfigDto) {
    return this.appConfig.updatePlatformConfig(dto);
  }

  @Patch('plans/:planId')
  @HttpCode(200)
  updatePlan(@Param('planId') planId: string, @Body() dto: UpdatePlanConfigDto) {
    return this.appConfig.updatePlan(planId, dto);
  }
}
