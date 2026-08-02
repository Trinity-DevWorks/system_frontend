This is a [Next.js](https://nextjs.org) ERP frontend for Trinity-DevWorks.

## Getting Started

```bash
npm ci
cp .env.example .env.local
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Docs

- Env template: [`.env.example`](.env.example)
- CI: [`docs/ci.md`](docs/ci.md)
- Full stack Docker: sibling [`system_backend/docs/deployment.md`](../system_backend/docs/deployment.md)

## Docker

```bash
docker build -t system-frontend .
```

Or from `system_backend` with both repos as siblings:

```bash
docker compose --profile with-frontend up -d --build
```
