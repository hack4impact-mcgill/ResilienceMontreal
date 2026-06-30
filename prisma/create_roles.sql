-- prisma/create_roles.sql
CREATE TABLE IF NOT EXISTS "public"."Role" (
  id serial PRIMARY KEY,
  name text NOT NULL UNIQUE
);

INSERT INTO "public"."Role"(id, name)
VALUES
  (1, 'Unassigned'),
  (2, 'Bookkeeper'),
  (3, 'Admin'),
  (4, 'InterventionTeam')
ON CONFLICT (id) DO NOTHING;00