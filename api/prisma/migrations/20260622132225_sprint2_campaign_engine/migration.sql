-- AlterTable
ALTER TABLE "User" ADD COLUMN     "creditBalance" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "isAdmin" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isBrand" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isClipper" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "pointBalance" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "ClipperProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "niches" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "region" VARCHAR(100),
    "language" VARCHAR(50) NOT NULL DEFAULT 'id',
    "avgViews" INTEGER NOT NULL DEFAULT 0,
    "avgCtr" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "score" INTEGER NOT NULL DEFAULT 50,
    "bio" TEXT,
    "socialTiktok" VARCHAR(255),
    "socialYoutube" VARCHAR(255),
    "socialInstagram" VARCHAR(255),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClipperProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Campaign" (
    "id" TEXT NOT NULL,
    "brandId" TEXT NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "videoUrl" TEXT,
    "projectId" TEXT,
    "viralScore" INTEGER,
    "detectedNiches" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "targetPlatforms" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "deadline" TIMESTAMP(3) NOT NULL,
    "packageType" VARCHAR(20) NOT NULL,
    "totalCredits" INTEGER NOT NULL,
    "rewardPool" INTEGER NOT NULL,
    "platformFee" INTEGER NOT NULL,
    "maxClippers" INTEGER NOT NULL,
    "status" VARCHAR(30) NOT NULL DEFAULT 'draft',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Campaign_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CampaignClipper" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "clipperId" TEXT NOT NULL,
    "status" VARCHAR(30) NOT NULL DEFAULT 'invited',
    "submittedUrl" TEXT,
    "submittedAt" TIMESTAMP(3),
    "verifiedAt" TIMESTAMP(3),
    "baseReward" INTEGER NOT NULL DEFAULT 0,
    "performanceBonus" INTEGER NOT NULL DEFAULT 0,
    "totalReward" INTEGER NOT NULL DEFAULT 0,
    "viewCount" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CampaignClipper_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Transaction" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" VARCHAR(40) NOT NULL,
    "amount" INTEGER NOT NULL,
    "balanceType" VARCHAR(10) NOT NULL,
    "description" TEXT,
    "referenceId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Transaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WithdrawalRequest" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "bankName" VARCHAR(100),
    "accountNumber" VARCHAR(50),
    "accountName" VARCHAR(100),
    "ewalletType" VARCHAR(50),
    "ewalletNumber" VARCHAR(50),
    "status" VARCHAR(20) NOT NULL DEFAULT 'pending',
    "adminNote" TEXT,
    "processedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WithdrawalRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ClipperProfile_userId_key" ON "ClipperProfile"("userId");

-- CreateIndex
CREATE INDEX "ClipperProfile_userId_idx" ON "ClipperProfile"("userId");

-- CreateIndex
CREATE INDEX "Campaign_brandId_idx" ON "Campaign"("brandId");

-- CreateIndex
CREATE INDEX "Campaign_status_idx" ON "Campaign"("status");

-- CreateIndex
CREATE INDEX "CampaignClipper_campaignId_idx" ON "CampaignClipper"("campaignId");

-- CreateIndex
CREATE INDEX "CampaignClipper_clipperId_idx" ON "CampaignClipper"("clipperId");

-- CreateIndex
CREATE UNIQUE INDEX "CampaignClipper_campaignId_clipperId_key" ON "CampaignClipper"("campaignId", "clipperId");

-- CreateIndex
CREATE INDEX "Transaction_userId_idx" ON "Transaction"("userId");

-- CreateIndex
CREATE INDEX "WithdrawalRequest_userId_idx" ON "WithdrawalRequest"("userId");

-- CreateIndex
CREATE INDEX "WithdrawalRequest_status_idx" ON "WithdrawalRequest"("status");

-- AddForeignKey
ALTER TABLE "ClipperProfile" ADD CONSTRAINT "ClipperProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Campaign" ADD CONSTRAINT "Campaign_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Campaign" ADD CONSTRAINT "Campaign_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampaignClipper" ADD CONSTRAINT "CampaignClipper_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampaignClipper" ADD CONSTRAINT "CampaignClipper_clipperId_fkey" FOREIGN KEY ("clipperId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WithdrawalRequest" ADD CONSTRAINT "WithdrawalRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
