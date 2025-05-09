-- CreateTable
CREATE TABLE "MonthlyKeyAuth" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "lastVerifiedAt" TIMESTAMP(3) NOT NULL,
    "isValid" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MonthlyKeyAuth_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MonthlyKeyAuth_userId_key" ON "MonthlyKeyAuth"("userId");

-- CreateIndex
CREATE INDEX "MonthlyKeyAuth_userId_idx" ON "MonthlyKeyAuth"("userId");

-- AddForeignKey
ALTER TABLE "MonthlyKeyAuth" ADD CONSTRAINT "MonthlyKeyAuth_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
