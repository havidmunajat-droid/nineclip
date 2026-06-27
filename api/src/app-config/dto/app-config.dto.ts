import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class UpdatePackageConfigDto {
  @IsOptional()
  @IsString()
  @MaxLength(60)
  name?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  priceIdr?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  credits?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  maxClippers?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  kpiViews?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  campaignDays?: number;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  tagline?: string;

  @IsOptional()
  @IsBoolean()
  highlighted?: boolean;
}

export class UpdatePlatformConfigDto {
  @IsInt()
  @Min(1)
  @Max(50)
  feePct: number;
}
