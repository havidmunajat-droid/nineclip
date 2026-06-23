import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { v4 as uuid } from 'uuid';
import { JwtGuard } from '@/auth/guards/jwt.guard';
import { CurrentUser, JwtPayload } from '@/common/decorators/user.decorator';
import { ProjectsService } from './projects.service';
import { CreateProjectDto } from './dto/create-project.dto';

const videoStorage = diskStorage({
  destination: './storage/uploads',
  filename: (_req, file, cb) => cb(null, `${uuid()}${extname(file.originalname)}`),
});

@ApiTags('projects')
@ApiBearerAuth()
@UseGuards(JwtGuard)
@Controller({ path: 'projects', version: '1' })
export class ProjectsController {
  constructor(private projects: ProjectsService) {}

  @Post()
  @ApiConsumes('multipart/form-data', 'application/json')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: videoStorage,
      limits: { fileSize: 2 * 1024 * 1024 * 1024 }, // 2 GB
      fileFilter: (_req, file, cb) => {
        const allowed = /\.(mp4|mov|mkv|webm|avi)$/i;
        cb(null, allowed.test(file.originalname));
      },
    }),
  )
  create(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateProjectDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.projects.create(user.sub, dto, file?.path);
  }

  @Get()
  findAll(@CurrentUser() user: JwtPayload) {
    return this.projects.findAll(user.sub);
  }

  @Get(':id')
  findOne(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.projects.findOne(user.sub, id);
  }

  @Delete(':id')
  delete(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.projects.delete(user.sub, id);
  }
}
