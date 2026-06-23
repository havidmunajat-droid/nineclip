import { IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MIN_WITHDRAWAL_POINTS } from '@/campaigns/campaign-packages';

export class WithdrawDto {
  @ApiProperty({ minimum: MIN_WITHDRAWAL_POINTS, example: 50_000 })
  @IsInt()
  @Min(MIN_WITHDRAWAL_POINTS)
  @Max(1_000_000_000)
  amount: number;

  @ApiProperty({ enum: ['bank', 'ewallet'] })
  @IsIn(['bank', 'ewallet'])
  method: 'bank' | 'ewallet';

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  bankName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(50)
  accountNumber?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  accountName?: string;

  @ApiPropertyOptional({ example: 'gopay' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  ewalletType?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(50)
  ewalletNumber?: string;
}
