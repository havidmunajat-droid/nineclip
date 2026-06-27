import { Module } from '@nestjs/common';
import { AppConfigModule } from '@/app-config/app-config.module';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

@Module({
  imports: [AppConfigModule],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
