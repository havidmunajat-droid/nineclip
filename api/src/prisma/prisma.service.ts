import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

/**
 * Error koneksi transient yang umum muncul saat Neon (free tier) me-resume
 * compute dari auto-suspend — pool sempat stale beberapa ratus ms.
 */
function isTransientConnectionError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return (
    msg.includes("Can't reach database server") ||
    msg.includes('Connection terminated') ||
    msg.includes('connection closed') ||
    msg.includes('ECONNRESET') ||
    msg.includes('P1001') ||
    msg.includes('P1017')
  );
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly log = new Logger(PrismaService.name);

  async onModuleInit() {
    await this.connectWithRetry();
  }

  private async connectWithRetry(retries = 6) {
    for (let i = 0; i <= retries; i++) {
      try {
        await this.$connect();
        if (i > 0) this.log.log(`Terhubung ke DB setelah ${i} retry`);
        return;
      } catch (err) {
        if (i < retries && isTransientConnectionError(err)) {
          const delay = 500 * (i + 1);
          this.log.warn(`DB belum siap, retry connect dalam ${delay}ms`);
          await sleep(delay);
          continue;
        }
        throw err;
      }
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
