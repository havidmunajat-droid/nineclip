import { PartialType, PickType } from '@nestjs/swagger';
import { CreateCampaignDto } from './create-campaign.dto';

// Hanya field yang boleh diubah saat campaign masih draft.
// videoUrl tidak boleh diubah lewat sini (akan mengubah viral score & project).
export class UpdateCampaignDto extends PartialType(
  PickType(CreateCampaignDto, ['name', 'targetPlatforms', 'deadline', 'packageType'] as const),
) {}
