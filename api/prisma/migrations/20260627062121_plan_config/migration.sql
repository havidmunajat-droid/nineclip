-- CreateTable
CREATE TABLE "PlanConfig" (
    "id" TEXT NOT NULL,
    "planId" VARCHAR(20) NOT NULL,
    "name" VARCHAR(60) NOT NULL,
    "tagline" VARCHAR(120) NOT NULL,
    "priceMonthly" INTEGER NOT NULL,
    "priceYearly" INTEGER NOT NULL,
    "minutesPerMonth" INTEGER NOT NULL,
    "features" TEXT[],
    "highlighted" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlanConfig_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PlanConfig_planId_key" ON "PlanConfig"("planId");
