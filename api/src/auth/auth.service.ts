import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Response } from 'express';
import { randomUUID } from 'crypto';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '@/prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { JwtPayload } from '@/common/decorators/user.decorator';

const BCRYPT_ROUNDS = 12;

function parseDurationToMs(s: string): number {
  const n = parseInt(s, 10);
  if (s.endsWith('d')) return n * 24 * 60 * 60 * 1000;
  if (s.endsWith('h')) return n * 60 * 60 * 1000;
  if (s.endsWith('m')) return n * 60 * 1000;
  return n * 1000;
}

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private config: ConfigService,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) throw new ConflictException('Email sudah terdaftar');

    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);

    // Intent onboarding → set peran + dashboard default (Section: User Onboarding).
    const intent = dto.intent ?? 'tool';
    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        name: dto.name,
        passwordHash,
        primaryRole: intent,
        isBrand: intent === 'brand',
        isClipper: intent === 'clipper',
      },
    });

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      planId: user.planId,
      primaryRole: user.primaryRole,
      isBrand: user.isBrand,
      isClipper: user.isClipper,
    };
  }

  async login(dto: LoginDto, res: Response) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (!user?.passwordHash) throw new UnauthorizedException('Kredensial tidak valid');

    const ok = await bcrypt.compare(dto.password, user.passwordHash);
    if (!ok) throw new UnauthorizedException('Kredensial tidak valid');

    return this.issueTokens(user.id, user.email, user.planId, user.isAdmin, res);
  }

  async refresh(payload: JwtPayload, res: Response) {
    return this.issueTokens(payload.sub, payload.email, payload.planId, payload.isAdmin, res);
  }

  async logout(refreshToken: string | undefined, res: Response) {
    if (refreshToken) {
      await this.prisma.refreshToken.deleteMany({ where: { token: refreshToken } }).catch(() => null);
    }
    res.clearCookie('refresh_token', { path: '/api/v1/auth' });
    return { message: 'Berhasil keluar' };
  }

  private async issueTokens(
    userId: string,
    email: string,
    planId: string,
    isAdmin: boolean,
    res: Response,
  ) {
    const payload: JwtPayload = { sub: userId, email, planId, isAdmin };

    const accessSecret = this.config.getOrThrow<string>('JWT_ACCESS_SECRET');
    const refreshSecret = this.config.getOrThrow<string>('JWT_REFRESH_SECRET');
    const accessExpires = this.config.get<string>('JWT_ACCESS_EXPIRES', '15m');
    const refreshExpires = this.config.get<string>('JWT_REFRESH_EXPIRES', '7d');

    const [accessToken, refreshToken] = await Promise.all([
      this.jwt.signAsync(payload, { secret: accessSecret, expiresIn: accessExpires }),
      // jti unik agar token string tidak pernah bentrok meski 2 login di detik yang sama
      this.jwt.signAsync(
        { ...payload, jti: randomUUID() },
        { secret: refreshSecret, expiresIn: refreshExpires },
      ),
    ]);

    const expiresAt = new Date(Date.now() + parseDurationToMs(refreshExpires));

    await this.prisma.refreshToken.create({ data: { token: refreshToken, userId, expiresAt } });

    const isProd = this.config.get('NODE_ENV') === 'production';
    res.cookie('refresh_token', refreshToken, {
      httpOnly: true,
      secure: isProd,
      // cross-domain (Vercel frontend + Railway backend) butuh 'none' + secure
      sameSite: isProd ? 'none' : 'lax',
      expires: expiresAt,
      path: '/api/v1/auth',
    });

    return { accessToken };
  }
}
