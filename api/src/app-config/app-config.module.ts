import { Module } from '@nestjs/common';
import { AppConfigService } from './app-config.service';
import { AdminConfigController, PublicConfigController } from './app-config.controller';

@Module({
  controllers: [PublicConfigController, AdminConfigController],
  providers: [AppConfigService],
  exports: [AppConfigService],
})
export class AppConfigModule {}
