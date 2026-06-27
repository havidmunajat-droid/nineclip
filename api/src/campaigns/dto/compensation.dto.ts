import { IsIn } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

// Section 8 — brand pilih kompensasi saat KPI tidak tercapai.
export class CompensationDto {
  @ApiProperty({ enum: ['extension', 'voucher'], example: 'extension' })
  @IsIn(['extension', 'voucher'])
  choice: 'extension' | 'voucher';
}
