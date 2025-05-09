-- AlterTable
ALTER TABLE "MonthlyKeyAuth" ADD COLUMN     "attempts" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "lockedUntil" TIMESTAMP(3);
