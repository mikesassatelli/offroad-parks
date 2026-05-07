-- Promote the bootstrap super admin if the user exists.
-- Idempotent: no-op when the user has not yet signed in.
UPDATE "User"
SET "role" = 'SUPER_ADMIN'
WHERE "email" = 'mike.sassatelli@gmail.com';
