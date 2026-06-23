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
  @ApiProperty({ example: 25_000, description: 'Jumlah views untuk hitung performance bonus' })
  @IsInt()
  @Min(0)
  @Max(1_000_000_000)
  viewCount: number;
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
