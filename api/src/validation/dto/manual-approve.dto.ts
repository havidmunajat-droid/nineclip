import { IsBoolean, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ManualApproveDto {
  @ApiProperty({ example: 15000 })
  @IsInt()
  @Min(0)
  viewCount: number;

  @ApiProperty({ example: 300 })
  @IsInt()
  @Min(0)
  likeCount: number;

  @ApiProperty({ example: 45 })
  @IsInt()
  @Min(0)
  commentCount: number;

  @ApiProperty({ example: 20 })
  @IsInt()
  @Min(0)
  shareCount: number;

  @ApiProperty({ example: true })
  @IsBoolean()
  isOriginal: boolean;
}

export class ManualRejectDto {
  @ApiProperty({ required: false, example: 'Akun TikTok tidak sesuai' })
  @IsOptional()
  @IsString()
  adminNote?: string;
}
