# Resilience MTL

## Developer checklist

- [ ] Get access to [Developer Onboarding](https://app.notion.com/p/h4imcgill/Onboarding-3d80e5578cf581c38a62f35211e60a55) on Notion
- [ ] Clone the repo and run `bun install`
- [ ] Copy `.env` from Notion into the project root (do not commit)
- [ ] Run `bunx prisma generate` and `bun run db:migrate`
- [ ] Run `bun run dev` and open [http://localhost:3000](http://localhost:3000)
- [ ] Read [Data tables](#data-tables) before changing list or table UI
- [ ] Pick up a ticket, branch off `main`, open a PR, and assign a tech lead or senior developer

Playwright test credentials go in `.env`. See [TESTING.md](TESTING.md).

## Environment

Copy `.env` from Notion into the project root. Required vars are validated in [`src/env.js`](src/env.js).

The default template uses the shared dev Supabase DB. For Docker Postgres, swap `DATABASE_URL` and `DIRECT_URL` per [`docker-compose.yml`](docker-compose.yml).

## Run locally

```bash
bun install && bunx prisma generate && bun run dev
```

For Docker: `bun run docker:up` (see [`docker-compose.yml`](docker-compose.yml)).

## Render

Deployed dev: [https://resiliencemontreal.onrender.com](https://resiliencemontreal.onrender.com)

Auto-deploys on push to `main`. Ask a tech lead for a Render team invite if you ever need to check the logs or restart a deployment. Env values are in Notion.

Free tier sleeps after ~15 min idle. First load after idle may take ~30s. 

## Contributing

When you pick up a ticket, branch off `main`, push your work, and open a PR. Assign a tech lead to review. Prettier runs on PRs.

Schema + feature tickets: use stacked PRs (migration PR first, feature PR second). See [Database schema changes](#database-schema-changes).

## Database schema changes

Schema changes use Prisma migrations in `prisma/migrations/`. CI runs `migrate-check` on PRs that touch `prisma/**`. Merging to `main` deploys migrations to the shared dev DB.

### Stacked PRs

| PR          | Base             | Contains                                     | Merge  |
| ----------- | ---------------- | -------------------------------------------- | ------ |
| 1 Migration | `main`           | `prisma/schema/` + `prisma/migrations/` only | First  |
| 2 Feature   | migration branch | app code                                     | Second |

**Workflow**
> Note that Github now supports [stacked PRs](https://docs.github.com/en/pull-requests/how-tos/stacked-pull-requests). This can make it easier to track your work and you are encouraged to use them!

1. Branch from `main` (e.g. `feat/add-grant-status-migration`).
2. Run `bun run db:generate`, commit schema + migration, open PR 1 (migration only). 
3. Branch from that branch (e.g. `feat/add-grant-status-ui`).
4. Implement the feature, open PR 2 with base set to the migration branch.
5. Merge PR 1, rebase PR 2 onto `main` (or change its base to `main`), then merge PR 2.

**Rules**

- PR 1 must not include feature code. Only Prisma schema and migration SQL.
- PR 2 should not add new migrations. If the schema needs another tweak, add a follow-up migration in PR 1 or a new migration PR before merging the feature.
- Title clearly: e.g. `[migration] Add Grant.status` and `[feature] Grant status filter UI`.
- In PR 2, link PR 1: "Depends on #123."

After PR 1 merges, run `bun run db:migrate` locally on the feature branch after rebasing onto `main`.

**GitHub tip:** Set PR 2's base to your migration branch so the diff shows only feature changes. Switch the base to `main` after PR 1 merges.

## Data tables

Clients, Grants, and Expenses tables use shared utilities in `src/components/data-table/`. Read [`src/components/data-table/README.md`](src/components/data-table/README.md) before adding or changing a table. Reuse shared hooks and components. Do not copy pagination, sort, filter, or CSV logic. Fund Pools is client-side and is the exception.

## Testing

Playwright E2E. See [TESTING.md](TESTING.md).

## Stack

- Tailwind CSS and tokens in [`src/app/globals.css`](src/app/globals.css)
- UI primitives from [shadcn/ui](https://ui.shadcn.com/)

## Contact

Reach Hack4Impact McGill at **hack4impact@ssmu.ca**.
