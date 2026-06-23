import { IsUrl } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SubmitDto {
  @ApiProperty({ example: 'https://www.tiktok.com/@user/video/123' })
  @IsUrl()
  url: string;
}
