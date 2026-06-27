-- CreateTable
CREATE TABLE "PackageConfig" (
    "id" TEXT NOT NULL,
    "packageType" VARCHAR(20) NOT NULL,
    "name" VARCHAR(60) NOT NULL,
    "priceIdr" INTEGER NOT NULL,
    "credits" INTEGER NOT NULL,
    "maxClippers" INTEGER NOT NULL,
    "kpiViews" INTEGER NOT NULL,
    "campaignDays" INTEGER NOT NULL,
    "tagline" VARCHAR(120) NOT NULL,
    "highlighted" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PackageConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlatformConfig" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "feePct" INTEGER NOT NULL DEFAULT 20,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlatformConfig_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PackageConfig_packageType_key" ON "PackageConfig"("packageType");
