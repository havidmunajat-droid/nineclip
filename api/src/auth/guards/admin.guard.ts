import { ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { JwtGuard } from './jwt.guard';
import { JwtPayload } from '@/common/decorators/user.decorator';

/**
 * Guard untuk route admin (Sprint 2 - Section 4.3 / Section 5).
 *
 * Extends JwtGuard sehingga satu dekorator `@UseGuards(AdminGuard)` sudah:
 *   1. Memvalidasi JWT (mengisi request.user lewat JwtStrategy.validate)
 *   2. Menolak request yang user-nya bukan admin (is_admin = false)
 *
 * Nilai isAdmin selalu diambil ulang dari DB di JwtStrategy.validate,
 * jadi pencabutan/penambahan akses admin via DB langsung berlaku.
 */
@Injectable()
export class AdminGuard extends JwtGuard {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Jalankan autentikasi JWT bawaan dulu agar request.user terisi.
    const authenticated = (await super.canActivate(context)) as boolean;
    if (!authenticated) return false;

    const request = context.switchToHttp().getRequest<{ user?: JwtPayload }>();
    if (!request.user?.isAdmin) {
      throw new ForbiddenException('Akses admin diperlukan');
    }
    return true;
  }
}
