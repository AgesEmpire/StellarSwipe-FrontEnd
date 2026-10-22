# Project

## API Versioning

This server exposes a versioned REST API using **URI-based versioning**.

- The current stable version is **v1**.
- Requests without an explicit version resolve to the **default version (v1)**.
- Requests for an unsupported version (e.g. `/v2/...`) return a predictable `404 Not Found` instead of silently falling through to another version.

### Examples

| Request | Resolves to |
| --- | --- |
| `GET /health` | default version (`v1`) |
| `GET /v1/health` | explicit `v1` |
| `GET /v2/health` | `404 Not Found` (unsupported version) |

### Adding a new version

1. Bump the default version in the NestJS bootstrap (`app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' })`).
2. Annotate controllers/handlers with `@Version('2')` where the new version applies.
3. Add e2e coverage for the new version alongside the existing default/explicit/unsupported cases.
