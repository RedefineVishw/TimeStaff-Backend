-- AlterTable
ALTER TABLE "TaskComment" ADD COLUMN     "mentionedUserIds" TEXT[] DEFAULT ARRAY[]::TEXT[];
