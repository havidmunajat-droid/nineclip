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
import { UpdatePackageConfigDto, UpdatePlatformConfigDto } from './dto/app-config.dto';

/** GET /config/packages — publik, dipakai campaign wizard frontend */
@Controller('config')
export class PublicConfigController {
  constructor(private appConfig: AppConfigService) {}

  @Get('packages')
  getPackages() {
    return this.appConfig.getPackages();
  }
}

/** /admin/config — hanya admin */
@UseGuards(JwtGuard, AdminGuard)
@Controller('admin/config')
export class AdminConfigController {
  constructor(private appConfig: AppConfigService) {}

  @Get()
  async getConfig() {
    const [packages, platform] = await Promise.all([
      this.appConfig.getPackages(),
      this.appConfig.getPlatformConfig(),
    ]);
    return { packages, platform };
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
}
