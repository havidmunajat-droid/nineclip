-- DropIndex
DROP INDEX "CampaignClipper_campaignId_clipperId_key";

-- AlterTable
ALTER TABLE "Campaign" ADD COLUMN     "activatedAt" TIMESTAMP(3),
ADD COLUMN     "baseFund" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "bonusPool" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "bonusPoolRemaining" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "compensationDeadline" TIMESTAMP(3),
ADD COLUMN     "creditsRemaining" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "extendedAt" TIMESTAMP(3),
ADD COLUMN     "extensionDays" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "firstValidatedAt" TIMESTAMP(3),
ADD COLUMN     "kpiViews" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "rewardPerVideo" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "totalViews" BIGINT NOT NULL DEFAULT 0,
ADD COLUMN     "videosVerified" INTEGER NOT NULL DEFAULT 0;

-- Backfill: viewCount lama (Int? nullable) → 0 sebelum SET NOT NULL (anti gagal migrasi)
UPDATE "CampaignClipper" SET "viewCount" = 0 WHERE "viewCount" IS NULL;

-- AlterTable
ALTER TABLE "CampaignClipper" ADD COLUMN     "bookingExpiresAt" TIMESTAMP(3),
ADD COLUMN     "commentCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "finalRank" INTEGER,
ADD COLUMN     "isOriginal" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "likeCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "performanceScore" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "platform" VARCHAR(20),
ADD COLUMN     "shareCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "slotNumber" INTEGER NOT NULL DEFAULT 1,
ALTER COLUMN "viewCount" SET NOT NULL,
ALTER COLUMN "viewCount" SET DEFAULT 0,
ALTER COLUMN "viewCount" SET DATA TYPE BIGINT;

-- AlterTable
ALTER TABLE "ClipperProfile" ADD COLUMN     "instagramUsername" VARCHAR(100),
ADD COLUMN     "instagramVerified" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "instagramVerifiedAt" TIMESTAMP(3),
ADD COLUMN     "penaltyUntil" TIMESTAMP(3),
ADD COLUMN     "tiktokUsername" VARCHAR(100),
ADD COLUMN     "tiktokVerified" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "tiktokVerifiedAt" TIMESTAMP(3),
ADD COLUMN     "youtubeChannelId" VARCHAR(100),
ADD COLUMN     "youtubeUsername" VARCHAR(100),
ADD COLUMN     "youtubeVerified" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "youtubeVerifiedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "tncAcceptedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "SocialVerification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "platform" VARCHAR(20) NOT NULL,
    "username" VARCHAR(100) NOT NULL,
    "code" VARCHAR(60) NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'pending',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "verifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SocialVerification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Voucher" (
    "id" TEXT NOT NULL,
    "brandId" TEXT NOT NULL,
    "campaignId" TEXT,
    "code" VARCHAR(40) NOT NULL,
    "discountPercent" INTEGER NOT NULL,
    "used" BOOLEAN NOT NULL DEFAULT false,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Voucher_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SocialVerification_userId_idx" ON "SocialVerification"("userId");

-- CreateIndex
CREATE INDEX "SocialVerification_code_idx" ON "SocialVerification"("code");

-- CreateIndex
CREATE INDEX "SocialVerification_status_idx" ON "SocialVerification"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Voucher_code_key" ON "Voucher"("code");

-- CreateIndex
CREATE INDEX "Voucher_brandId_idx" ON "Voucher"("brandId");

-- CreateIndex
CREATE INDEX "Voucher_code_idx" ON "Voucher"("code");

-- CreateIndex
CREATE INDEX "CampaignClipper_status_idx" ON "CampaignClipper"("status");

-- CreateIndex
CREATE UNIQUE INDEX "CampaignClipper_campaignId_clipperId_slotNumber_key" ON "CampaignClipper"("campaignId", "clipperId", "slotNumber");

-- AddForeignKey
ALTER TABLE "SocialVerification" ADD CONSTRAINT "SocialVerification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Voucher" ADD CONSTRAINT "Voucher_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Voucher" ADD CONSTRAINT "Voucher_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE SET NULL ON UPDATE CASCADE;

