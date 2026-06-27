import { IsBoolean, IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class WithdrawalActionDto {
  @ApiProperty({ enum: ['approve', 'reject'] })
  @IsIn(['approve', 'reject'])
  action: 'approve' | 'reject';

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  adminNote?: string;
}

export class VerifySubmissionDto {
  @ApiProperty({ example: 25_000, description: 'Total views (≥200 → validated reward)' })
  @IsInt()
  @Min(0)
  @Max(1_000_000_000)
  viewCount: number;

  @ApiPropertyOptional({ example: 1200 })
  @IsOptional()
  @IsInt()
  @Min(0)
  likeCount?: number;

  @ApiPropertyOptional({ example: 80 })
  @IsOptional()
  @IsInt()
  @Min(0)
  commentCount?: number;

  @ApiPropertyOptional({ example: 40 })
  @IsOptional()
  @IsInt()
  @Min(0)
  shareCount?: number;

  @ApiPropertyOptional({ example: true, description: 'Konten orisinal (lolos cek admin)' })
  @IsOptional()
  @IsBoolean()
  isOriginal?: boolean;
}

export class UpdateUserRolesDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isAdmin?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isClipper?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isBrand?: boolean;
}
