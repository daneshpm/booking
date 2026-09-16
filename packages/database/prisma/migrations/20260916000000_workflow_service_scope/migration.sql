-- AlterTable
ALTER TABLE "workflows" ADD COLUMN "service_id" TEXT;

-- CreateIndex
CREATE INDEX "workflows_service_id_idx" ON "workflows"("service_id");

-- AddForeignKey
ALTER TABLE "workflows" ADD CONSTRAINT "workflows_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "services"("id") ON DELETE SET NULL ON UPDATE CASCADE;
