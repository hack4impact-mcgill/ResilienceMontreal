-- prisma/create_roles.sql
CREATE TABLE IF NOT EXISTS "public"."Role" (
  id serial PRIMARY KEY,
  name text NOT NULL UNIQUE
);

-- Insert default roles with explicit ids (no-op if already present)
INSERT INTO "public"."Role"(id, name)
VALUES
  (1, 'Unassigned'),
  (2, 'Bookkeeper'),
  (3, 'Admin'),
  (4, 'InterventionTeam')
ON CONFLICT (id) DO NOTHING;