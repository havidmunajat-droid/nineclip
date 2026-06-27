import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { BullModule } from '@nestjs/bull';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { ProjectsModule } from './projects/projects.module';
import { CampaignsModule } from './campaigns/campaigns.module';
import { ClipperModule } from './clipper/clipper.module';
import { AdminModule } from './admin/admin.module';
import { WalletModule } from './wallet/wallet.module';
import { ScoringModule } from './scoring/scoring.module';
import { LifecycleModule } from './lifecycle/lifecycle.module';
import { SocialModule } from './social/social.module';
import { ClipsModule } from './clips/clips.module';
import { JobsModule } from './jobs/jobs.module';
import { SubscriptionsModule } from './subscriptions/subscriptions.module';
import { AppConfigModule } from './app-config/app-config.module';
import { HealthController } from './health/health.controller';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),

    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 60 }]),

    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const rawUrl = config.get<string>('REDIS_URL', 'redis://localhost:6379');
        // Upstash Redis: parse manual agar bisa set enableReadyCheck + maxRetriesPerRequest
        // yang wajib untuk Bull agar tidak timeout pada blocking operations
        const parsed = new URL(rawUrl.replace(/^rediss?:\/\//, 'https://'));
        const isTls = rawUrl.startsWith('rediss://');
        return {
          redis: {
            host: parsed.hostname,
            port: parsed.port ? Number(parsed.port) : isTls ? 6380 : 6379,
            password: parsed.password || undefined,
            username: parsed.username || undefined,
            ...(isTls ? { tls: {} } : {}),
            enableReadyCheck: false,
            maxRetriesPerRequest: null as unknown as number,
          },
          defaultJobOptions: {
            attempts: 3,
            backoff: { type: 'exponential', delay: 5000 },
            removeOnComplete: 100,
            removeOnFail: 200,
          },
        };
      },
    }),

    PrismaModule,
    AuthModule,
    UsersModule,
    ProjectsModule,
    CampaignsModule,
    ClipperModule,
    AdminModule,
    WalletModule,
    ScoringModule,
    LifecycleModule,
    SocialModule,
    ClipsModule,
    JobsModule,
    SubscriptionsModule,
    AppConfigModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
