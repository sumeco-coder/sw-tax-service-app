DO $$ BEGIN
  CREATE TYPE "identification_person" AS ENUM ('TAXPAYER', 'SPOUSE');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "identifications"
  ADD COLUMN IF NOT EXISTS "person" "identification_person";

UPDATE "identifications"
SET "person" = 'TAXPAYER'
WHERE "person" IS NULL;

ALTER TABLE "identifications"
  ALTER COLUMN "person" SET NOT NULL;

DROP INDEX IF EXISTS "identifications_user_unique";
CREATE UNIQUE INDEX IF NOT EXISTS "identifications_user_person_unique"
  ON "identifications" ("user_id", "person");
