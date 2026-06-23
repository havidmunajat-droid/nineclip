import { IsOptional, IsString, IsUrl, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ViralScoreDto {
  @ApiProperty({ example: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' })
  @IsUrl()
  videoUrl: string;

  // Opsional: kalau frontend sudah punya metadata, kirim langsung supaya
  // tidak perlu fetch oEmbed. Kalau kosong, backend ambil judul via oEmbed.
  @ApiPropertyOptional({ example: 'Cara Membangun Bisnis Online dari Nol' })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  title?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;
}
