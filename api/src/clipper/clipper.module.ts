import { Module } from '@nestjs/common';
import { ClipperController } from './clipper.controller';
import { ClipperService } from './clipper.service';

@Module({
  controllers: [ClipperController],
  providers: [ClipperService],
  exports: [ClipperService],
})
export class ClipperModule {}
