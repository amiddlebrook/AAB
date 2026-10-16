# AAB · Agentic Architecture Benchmarks

[![Continuous Integration](https://github.com/amiddlebrook/AAB/actions/workflows/ci.yml/badge.svg)](https://github.com/amiddlebrook/AAB/actions/workflows/ci.yml)
[![Cloudflare Deployment](https://github.com/amiddlebrook/AAB/actions/workflows/deploy.yml/badge.svg)](https://github.com/amiddlebrook/AAB/actions/workflows/deploy.yml)

**Build directed AI workflows, execute them on native Cloudflare inference, and compare measured results.**

## What was restored

The project retains its React Flow editor, framework library, AI-assisted graph builder, test runner, analytics, imports/exports, and A/B comparison. The backend is a single Cloudflare Worker using D1 for persistence and Workers AI for inference. No Express server, paid OpenRouter key, or separate frontend hosting is needed. Both the API and React SPA deploy as one Worker.

| Layer | Platform |
| --- | --- |
| UI | React + React Flow, Worker static assets |
| API | Hono + Cloudflare Workers |
| Data | Cloudflare D1 |
| Model | `@cf/meta/llama-3.1-8b-instruct-fp8` via Workers AI |
| Automation | GitHub Actions + Wrangler |
| Private access | `AAB_ADMIN_TOKEN` Worker secret |

Real test runs are recorded to D1 with node output, latency, success, logs, and token metrics. A/B comparisons execute saved workflows on the same input; synthetic randomized results are removed.

### Safe execution scope

Supported nodes are input/output, agent, processor transforms (`passthrough`, `uppercase`, `lowercase`, `trim`, `word-count`), merge, parallel fan-out, and echo/word-count tools. Independent branches run concurrently. Router, decision, memory, loop and retry nodes imported from legacy graphs are pass-through compatibility nodes—not conditional routing or durable memory. RAG requires a real retrieval source, so it explicitly fails rather than inventing documents. Arbitrary user-provided JavaScript is not executed; the old Code surface is hidden.

Only a Cloudflare-hosted AI model is offered. Old graph model names are ignored by the backend rather than making paid external calls.

## Deploy free on Cloudflare (one-time configuration)

1. Use a **Cloudflare Free** account. Create a D1 database called `aab-db`, if necessary, using `npx wrangler d1 create aab-db`. Verify its ID in `wrangler.toml`: the existing ID `98cf5a19-acda-4048-8b3e-77109b16cec5` belongs to the original project and may not be in your current account.
2. In GitHub **Settings → Secrets and variables → Actions**, set secrets `CLOUDFLARE_ACCOUNT_ID` and `CLOUDFLARE_API_TOKEN`. Give the Cloudflare token Workers Scripts and D1 write permissions, scoped to your account.
3. Run `npx wrangler secret put AAB_ADMIN_TOKEN` (or add that secret in the Cloudflare dashboard). Use a strong random token: all application data and AI endpoints require it in production.
4. Set GitHub Actions repository **Variable** `CLOUDFLARE_DEPLOY_ENABLED` to `true`.
5. Merge to `main` or run the production workflow. GitHub Actions validates, builds, applies the idempotent D1 schema, and publishes to your `*.workers.dev` subdomain. Visit it and unlock with the token.

A custom domain or paid vendor is not needed. Secret setup requires account access and is intentionally not automated through source code.

## Local startup

Node 22 or newer:

```bash
npm ci
npm ci --prefix client
cp .dev.vars.example .dev.vars
npm run db:migrate:local
npm run build --prefix client
npm run dev
```

Visit http://localhost:8787. Wrangler uses local D1. The example sets `ENVIRONMENT=development`, which allows no-token **local-only** access. For live React editing, use `npm start --prefix client` and http://localhost:3000 as well.

## API

| Route | Behavior |
| --- | --- |
| `GET /api/health` | Public health response |
| `GET /api/frameworks` | Private framework list |
| `POST /api/frameworks` | Save a graph |
| `PUT /api/frameworks/:id` | Save edits |
| `DELETE /api/frameworks/:id` | Delete graph and logs |
| `POST /api/tests/:frameworkId/run` | Execute and persist |
| `GET /api/tests/:frameworkId/results` | Results history |
| `POST /api/chat` | Workers AI assistant |
| `POST /api/chat/generate` | Workers AI graph design |

Production API calls except health require `Authorization: Bearer <AAB_ADMIN_TOKEN>`. The browser keeps this token in sessionStorage, not source code.

## True $0 operation and limits

Cloudflare Workers AI currently provides **10,000 free Neurons per account per day**; on the Free plan requests exceeding allocation fail rather than automatically becoming billed. Workers and D1 also have free limits. This is free-tier operation, not unlimited free inference. The UI's $0 result means no per-request cash charge within the Free allocation; it is not an energy/compute accounting metric.

- [Cloudflare Workers AI free allocation](https://developers.cloudflare.com/workers-ai/platform/pricing/)
- [Workers static assets](https://developers.cloudflare.com/workers/static-assets/)
- [GitHub CI](.github/workflows/ci.yml) · [Deployment](.github/workflows/deploy.yml)

### Troubleshooting

**401**: invalid owner token. **503**: production secret not configured. **D1 500**: check database ID and execute `npx wrangler d1 execute aab-db --remote --file=worker/schema.sql`. **AI error**: check model binding and free quota. Use [GitHub Actions](https://github.com/amiddlebrook/AAB/actions) for build logs.
