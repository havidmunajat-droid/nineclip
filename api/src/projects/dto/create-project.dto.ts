import { IsBoolean, IsIn, IsOptional, IsString, IsUrl, MaxLength, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateProjectDto {
  @ApiPropertyOptional({ example: 'Podcast Episode 42' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  title?: string;

  @ApiProperty({ enum: ['youtube', 'upload'] })
  @IsIn(['youtube', 'upload'])
  sourceType: 'youtube' | 'upload';

  @ApiPropertyOptional({ example: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' })
  @IsOptional()
  @IsUrl()
  sourceUrl?: string;

  @ApiProperty({ enum: ['auto', 'lt30', '30to60', '60to90'], default: 'auto' })
  @IsOptional()
  @IsIn(['auto', 'lt30', '30to60', '60to90'])
  clipLength: 'auto' | 'lt30' | '30to60' | '60to90' = 'auto';

  @ApiPropertyOptional({ default: 'id' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(5)
  language: string = 'id';

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  autoCaptions: boolean = true;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  autoReframe: boolean = true;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  viralityAnalysis: boolean = true;
}
