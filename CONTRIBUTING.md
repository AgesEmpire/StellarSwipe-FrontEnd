# Contributing

Thanks for your interest in improving this project! This guide covers local setup, the database migration workflow, and how to get a change merged.

## Getting started

1. Fork the repository and create a feature branch off `main`.
2. Install dependencies for the backend and frontend as described in their respective `README` files.
3. Copy any example environment file to a local `.env` and fill in your own values. Never commit secrets.

## Database migrations

Schema changes are managed with **versioned, ordered migrations**. The application never alters the schema on startup — migrations are applied only through an explicit command, so production databases are never silently changed when the server boots.

### Layout

- Migrations live in `backend/migrations/` (or the backend's configured migrations directory).
- Each migration is a numbered SQL file, applied in ascending order:
  - `0001_create_users.sql`
  - `0002_add_orders_table.sql`
  - `0003_add_order_status_index.sql`
- Numbers are zero-padded and strictly increasing. Never renumber or edit a migration that has already been applied in any shared environment — add a new one instead.

### Tracking

Applied migrations are recorded in a `schema_migrations` table (version + applied timestamp). The migration runner reads this table to determine which migrations are pending, so re-running the command is safe and idempotent.

### Creating a migration

1. Pick the next number after the highest existing file.
2. Create `backend/migrations/<number>_<short_description>.sql` containing the forward-only SQL for the change.
3. Keep each migration focused on a single logical change.
4. Add a short comment at the top of the file describing the intent and any rollout notes.

### Running migrations

Migrations are run explicitly, never on application boot:

```
# apply all pending migrations
<backend> migrate up

# check which migrations are pending
<backend> migrate status
```

Run migrations as a dedicated deployment step (e.g. a release job) before starting the new application version. Do not wire migrations into the server startup path.

### Testing migrations

Every migration change should be covered by a test that provisions a clean database, runs all migrations from scratch, and asserts the resulting schema. This guarantees a fresh environment can be brought up to date and that migrations remain ordered and repeatable.

## Submitting changes

- Keep pull requests focused; one logical change per PR.
- Match existing code style and structure; avoid unrelated refactors.
- Describe what changed and why, and note any migration or deployment steps reviewers must run.
- Make sure new migrations are documented and tested as described above.
