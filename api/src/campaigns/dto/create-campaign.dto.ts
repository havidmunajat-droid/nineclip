import {
  ArrayNotEmpty,
  IsArray,
  IsDateString,
  IsIn,
  IsString,
  IsUrl,
  MaxLength,
  MinLength,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export const TARGET_PLATFORMS = ['tiktok', 'shorts', 'reels'] as const;
export const PACKAGE_TYPES = ['starter', 'growth', 'pro'] as const;

export class CreateCampaignDto {
  @ApiProperty({ example: 'Campaign Produk Skincare Juni' })
  @IsString()
  @MinLength(3)
  @MaxLength(255)
  name: string;

  @ApiProperty({ example: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' })
  @IsUrl()
  videoUrl: string;

  @ApiProperty({ enum: TARGET_PLATFORMS, isArray: true, example: ['tiktok', 'reels'] })
  @IsArray()
  @ArrayNotEmpty()
  @IsIn(TARGET_PLATFORMS as unknown as string[], { each: true })
  targetPlatforms: string[];

  @ApiProperty({ example: '2026-07-15T00:00:00.000Z' })
  @IsDateString()
  deadline: string;

  @ApiProperty({ enum: PACKAGE_TYPES, example: 'growth' })
  @IsIn(PACKAGE_TYPES as unknown as string[])
  packageType: 'starter' | 'growth' | 'pro';
}
