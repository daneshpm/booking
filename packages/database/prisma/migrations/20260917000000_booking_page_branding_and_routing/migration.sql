-- AlterTable
ALTER TABLE "workspaces" ADD COLUMN     "brand_color" TEXT,
ADD COLUMN     "booking_welcome_title" TEXT,
ADD COLUMN     "booking_welcome_message" TEXT;

-- CreateTable
CREATE TABLE "routing_forms" (
    "id" TEXT NOT NULL,
    "workspace_id" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "is_enabled" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "routing_forms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "routing_form_options" (
    "id" TEXT NOT NULL,
    "routing_form_id" TEXT NOT NULL,
    "service_id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "routing_form_options_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "routing_forms_workspace_id_key" ON "routing_forms"("workspace_id");

-- CreateIndex
CREATE INDEX "routing_form_options_routing_form_id_idx" ON "routing_form_options"("routing_form_id");

-- AddForeignKey
ALTER TABLE "routing_forms" ADD CONSTRAINT "routing_forms_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "routing_form_options" ADD CONSTRAINT "routing_form_options_routing_form_id_fkey" FOREIGN KEY ("routing_form_id") REFERENCES "routing_forms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "routing_form_options" ADD CONSTRAINT "routing_form_options_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "services"("id") ON DELETE CASCADE ON UPDATE CASCADE;
