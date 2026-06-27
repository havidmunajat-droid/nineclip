import { IsIn, IsString, MaxLength, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { SOCIAL_PLATFORMS } from '../bio-token';

export class SocialDto {
  @ApiProperty({ enum: SOCIAL_PLATFORMS, example: 'tiktok' })
  @IsIn(SOCIAL_PLATFORMS as unknown as string[])
  platform: string;

  @ApiProperty({ example: 'creator.id' })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  username: string;
}
