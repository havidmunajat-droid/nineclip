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

export class UpdatePlanConfigDto {
  @IsOptional()
  @IsString()
  @MaxLength(60)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  tagline?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  priceMonthly?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  priceYearly?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  minutesPerMonth?: number;

  @IsOptional()
  @IsString({ each: true })
  features?: string[];

  @IsOptional()
  @IsBoolean()
  highlighted?: boolean;
}
