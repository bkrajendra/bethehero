CREATE TYPE "gender" AS ENUM ('male', 'female', 'other');
ALTER TABLE "donors" ADD COLUMN "gender" "gender";
