import { Body, Controller, Get, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { IsIn, IsString } from 'class-validator';
import { JwtGuard } from '@/auth/guards/jwt.guard';
import { CurrentUser, JwtPayload } from '@/common/decorators/user.decorator';
import { SubscriptionsService } from './subscriptions.service';

class CreateSubscriptionDto {
  @IsString()
  planId: string;

  @IsIn(['monthly', 'yearly'])
  billingCycle: 'monthly' | 'yearly';
}

@ApiTags('subscriptions')
@Controller({ path: 'subscriptions', version: '1' })
export class SubscriptionsController {
  constructor(private subs: SubscriptionsService) {}

  @Post('checkout')
  @UseGuards(JwtGuard)
  @ApiBearerAuth()
  createCheckout(@CurrentUser() user: JwtPayload, @Body() dto: CreateSubscriptionDto) {
    return this.subs.createSnapToken(user.sub, dto.planId, dto.billingCycle);
  }

  @Get('active')
  @UseGuards(JwtGuard)
  @ApiBearerAuth()
  getActive(@CurrentUser() user: JwtPayload) {
    return this.subs.getActiveSubscription(user.sub);
  }

  @Get('invoices')
  @UseGuards(JwtGuard)
  @ApiBearerAuth()
  getInvoices(@CurrentUser() user: JwtPayload) {
    return this.subs.getInvoices(user.sub);
  }

  // Midtrans calls this without auth — verified by signature in production
  @Post('webhook/midtrans')
  @HttpCode(HttpStatus.OK)
  midtransWebhook(@Body() body: Record<string, string>) {
    return this.subs.handleWebhook(body as never);
  }
}
