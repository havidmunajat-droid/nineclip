import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@/prisma/prisma.service';
import { AppConfigService } from '@/app-config/app-config.service';
import axios from 'axios';

interface MidtransChargeResponse {
  token: string;
  redirect_url: string;
  order_id: string;
}

interface MidtransNotification {
  order_id: string;
  transaction_status: string;
  payment_type: string;
  gross_amount: string;
  fraud_status?: string;
}

@Injectable()
export class SubscriptionsService {
  private readonly log = new Logger(SubscriptionsService.name);

  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
    private appConfig: AppConfigService,
  ) {}

  async createSnapToken(userId: string, planId: string, billingCycle: 'monthly' | 'yearly') {
    const plan = await this.appConfig.getPlan(planId);
    if (!plan || planId === 'free') throw new BadRequestException('Paket tidak valid');

    const amount =
      billingCycle === 'yearly'
        ? plan.priceYearly || Math.round(plan.priceMonthly * 12 * 0.8)
        : plan.priceMonthly;

    const orderId = `nineclip-${userId}-${planId}-${Date.now()}`;

    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });

    const serverKey = this.config.getOrThrow<string>('MIDTRANS_SERVER_KEY');
    const isProduction = this.config.get('MIDTRANS_IS_PRODUCTION') === 'true';
    const baseUrl = isProduction
      ? 'https://app.midtrans.com/snap/v1/transactions'
      : 'https://app.sandbox.midtrans.com/snap/v1/transactions';

    const { data } = await axios.post<MidtransChargeResponse>(
      baseUrl,
      {
        transaction_details: { order_id: orderId, gross_amount: amount },
        customer_details: { first_name: user.name, email: user.email },
        item_details: [{ id: planId, price: amount, quantity: 1, name: `nineClip ${plan.name}` }],
      },
      {
        auth: { username: serverKey, password: '' },
        headers: { 'Content-Type': 'application/json' },
      },
    );

    await this.prisma.subscription.create({
      data: {
        userId,
        planId,
        status: 'active',
        orderId,
        amount,
      },
    });

    return { snapToken: data.token, redirectUrl: data.redirect_url, orderId };
  }

  async handleWebhook(notification: MidtransNotification) {
    const { order_id, transaction_status, payment_type, fraud_status } = notification;

    const subscription = await this.prisma.subscription.findUnique({ where: { orderId: order_id } });
    if (!subscription) {
      this.log.warn(`Unknown order_id in webhook: ${order_id}`);
      return;
    }

    const paid =
      (transaction_status === 'capture' && fraud_status === 'accept') ||
      transaction_status === 'settlement';

    if (paid) {
      const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // +30 days
      await this.prisma.subscription.update({
        where: { orderId: order_id },
        data: { status: 'active', method: payment_type, expiresAt },
      });
      await this.prisma.user.update({
        where: { id: subscription.userId },
        data: { planId: subscription.planId, minutesUsed: 0, quotaResetAt: new Date() },
      });
      this.log.log(`Subscription activated for user ${subscription.userId} → plan ${subscription.planId}`);
    } else if (['expire', 'cancel', 'deny'].includes(transaction_status)) {
      await this.prisma.subscription.update({
        where: { orderId: order_id },
        data: { status: 'expired' },
      });
    }
  }

  async getActiveSubscription(userId: string) {
    return this.prisma.subscription.findFirst({
      where: { userId, status: 'active' },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getInvoices(userId: string) {
    return this.prisma.subscription.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: { id: true, planId: true, status: true, method: true, amount: true, createdAt: true, orderId: true },
    });
  }
}
