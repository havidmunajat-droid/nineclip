import { IsEmail, IsIn, IsOptional, IsString, MinLength, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export const ONBOARDING_INTENTS = ['tool', 'brand', 'clipper'] as const;
export type OnboardingIntent = (typeof ONBOARDING_INTENTS)[number];

export class RegisterDto {
  @ApiProperty({ example: 'Havid Munajat' })
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  name: string;

  @ApiProperty({ example: 'havid@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ minLength: 8 })
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  password: string;

  // Jalur masuk onboarding. Menentukan is_brand/is_clipper & dashboard default.
  @ApiPropertyOptional({ enum: ONBOARDING_INTENTS, default: 'tool' })
  @IsOptional()
  @IsIn(ONBOARDING_INTENTS as unknown as string[])
  intent?: OnboardingIntent;
}
