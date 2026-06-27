import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AdminGuard } from '@/auth/guards/admin.guard';
import { AdminService } from './admin.service';
import { UpdateUserRolesDto, VerifySubmissionDto, WithdrawalActionDto } from './dto/admin.dto';
import { ManualApproveDto, ManualRejectDto } from '@/validation/dto/manual-approve.dto';

@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(AdminGuard) // JWT valid + is_admin === true
@Controller({ path: 'admin', version: '1' })
export class AdminController {
  constructor(private admin: AdminService) {}

  // Campaigns
  @Get('campaigns')
  campaigns() {
    return this.admin.listCampaigns();
  }

  @Get('campaigns/:id/clippers')
  campaignClippers(@Param('id') id: string) {
    return this.admin.listCampaignClippers(id);
  }

  @Post('campaigns/:id/clippers/:cid/verify')
  @HttpCode(HttpStatus.OK)
  verify(@Param('id') id: string, @Param('cid') cid: string, @Body() dto: VerifySubmissionDto) {
    return this.admin.verifySubmission(id, cid, dto);
  }

  // Manual verification queue (v2-6)
  @Get('verifications')
  manualQueue() {
    return this.admin.listManualQueue();
  }

  @Post('verifications/:id/approve')
  @HttpCode(HttpStatus.OK)
  approveManual(@Param('id') id: string, @Body() dto: ManualApproveDto) {
    return this.admin.approveManual(id, dto);
  }

  @Post('verifications/:id/reject')
  @HttpCode(HttpStatus.OK)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  rejectManual(@Param('id') id: string, @Body() _dto: ManualRejectDto) {
    return this.admin.rejectManual(id);
  }

  // Withdrawals
  @Get('withdrawals')
  withdrawals(@Query('status') status?: string) {
    return this.admin.listWithdrawals(status);
  }

  @Patch('withdrawals/:id')
  actWithdrawal(@Param('id') id: string, @Body() dto: WithdrawalActionDto) {
    return this.admin.actOnWithdrawal(id, dto);
  }

  // Users
  @Get('users')
  users() {
    return this.admin.listUsers();
  }

  @Patch('users/:id')
  updateUser(@Param('id') id: string, @Body() dto: UpdateUserRolesDto) {
    return this.admin.updateUserRoles(id, dto);
  }
}
