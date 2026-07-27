-- Add BETA_TESTER to the UserRole enum. Beta testers get a read-only view of
-- the admin console (all viewing allowed, no mutations). Enforcement lives in
-- src/lib/roles.ts — BETA_TESTER is never included in the admin/write role sets.
ALTER TYPE "UserRole" ADD VALUE 'BETA_TESTER';
