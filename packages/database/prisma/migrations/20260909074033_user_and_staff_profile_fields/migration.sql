-- AlterTable
ALTER TABLE "staff" ADD COLUMN     "bio" TEXT,
ADD COLUMN     "display_name" TEXT,
ADD COLUMN     "headline" TEXT,
ADD COLUMN     "instagram" TEXT,
ADD COLUMN     "linkedin" TEXT;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "bio" TEXT,
ADD COLUMN     "country" TEXT DEFAULT 'India',
ADD COLUMN     "display_name" TEXT,
ADD COLUMN     "gender" TEXT DEFAULT 'I''d prefer not to say',
ADD COLUMN     "headline" TEXT,
ADD COLUMN     "instagram" TEXT,
ADD COLUMN     "language" TEXT DEFAULT 'English',
ADD COLUMN     "linkedin" TEXT,
ADD COLUMN     "phone" TEXT,
ADD COLUMN     "state" TEXT DEFAULT 'Karnataka',
ADD COLUMN     "timezone" TEXT DEFAULT 'Asia/Kolkata',
ADD COLUMN     "twitter" TEXT,
ADD COLUMN     "website" TEXT;
