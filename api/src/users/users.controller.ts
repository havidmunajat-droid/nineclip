import { Body, Controller, Get, HttpCode, HttpStatus, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';
import { JwtGuard } from '@/auth/guards/jwt.guard';
import { CurrentUser, JwtPayload } from '@/common/decorators/user.decorator';
import { UsersService } from './users.service';

class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @MaxLength(80)
  name?: string;
}

@ApiTags('users')
@ApiBearerAuth()
@UseGuards(JwtGuard)
@Controller({ path: 'users', version: '1' })
export class UsersController {
  constructor(private users: UsersService) {}

  @Get('me')
  getProfile(@CurrentUser() user: JwtPayload) {
    return this.users.getProfile(user.sub);
  }

  @Patch('me')
  updateProfile(@CurrentUser() user: JwtPayload, @Body() dto: UpdateProfileDto) {
    return this.users.updateProfile(user.sub, dto);
  }

  // Settings — tambah peran kedua (bukan ditawarkan di onboarding)
  @Post('me/enable-brand')
  @HttpCode(HttpStatus.OK)
  enableBrand(@CurrentUser() user: JwtPayload) {
    return this.users.enableBrand(user.sub);
  }

  @Post('me/enable-clipper')
  @HttpCode(HttpStatus.OK)
  enableClipper(@CurrentUser() user: JwtPayload) {
    return this.users.enableClipper(user.sub);
  }
}
