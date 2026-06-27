import { Module } from '@nestjs/common';
import { LifecycleModule } from '@/lifecycle/lifecycle.module';
import { ValidationModule } from '@/validation/validation.module';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';

@Module({
  imports: [LifecycleModule, ValidationModule],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
