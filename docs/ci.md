# CI

Workflow: [`.github/workflows/ci.yml`](../.github/workflows/ci.yml)

| Step | Command |
|------|---------|
| Install | `npm ci` |
| Lint | `npm run lint` |
| Build | `npm run build` |

CI supplies safe `NEXT_PUBLIC_*` placeholders so the production build does not need private secrets.

Deploy stub: `.github/workflows/deploy-staging.yml` (manual `workflow_dispatch` — builds image only).
