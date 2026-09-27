# CI

Workflow: [`.github/workflows/ci.yml`](../.github/workflows/ci.yml)

| Step | Command |
|------|---------|
| Install | `pnpm install --frozen-lockfile` |
| Lint | `pnpm run lint` |
| Build | `pnpm run build` |

CI supplies safe `NEXT_PUBLIC_*` placeholders so the production build does not need private secrets.

Deploy stub: `.github/workflows/deploy-staging.yml` (manual `workflow_dispatch` — builds image only).
