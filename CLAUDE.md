# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

This is the **platform-operator admin** (package name `foundry-v2`), used by the agency owner to manage tenants, plans/add-ons, storefront deployments and platform analytics. It talks only to `/api/v1/platform/*` on the Flask backend in `../vysion-tech-commerce-server/`. The workspace-level `../CLAUDE.md` covers the backend and the sibling apps; this file covers what is specific to this app.

## Commands

```bash
npm install
npm run dev          # Vite dev server
npm run build        # tsc && vite build
npm run lint         # eslint, --max-warnings 0
npx tsc --noEmit     # type check only
```

There is no test suite. `npm run build:lib` / the `lib` branch of `vite.config.ts` and the `exports` in `package.json` are leftovers from the design-system template this was cloned from (`src/index.ts` does not exist); ignore them.

Env (`.env.local`):
- `VITE_API_URL`: backend base URL (default `http://localhost:5000`).
- `VITE_USE_MOCK_API=true`: installs `axios-mock-adapter` on the shared client (`src/api/mock.ts`). Only auth, analytics, tenant CRUD/API-key rotation, settings and health are mocked; everything else (storefronts, generate, add-ons, tenant products) passes through to the real backend.
- `VITE_STOREFRONT_BASE_URL`: unified storefront origin (default `http://localhost:5175`), used to build preview/live URLs for generated storefronts.

## Architecture

- **Routing** (`src/App.tsx`): `/login` under `AuthLayout`; everything else under `ProtectedRoute` + `PlatformLayout` (sidebar/topbar in `components/navigation/`). Unknown paths redirect to `/dashboard`. Most pages are lazy-loaded.
- **Auth**: `store/platformAuthStore.ts` (Zustand, persisted to localStorage key `platform_auth`) holds the platform-admin access/refresh tokens. `ProtectedRoute` only checks that a token is present. `api/client.ts` attaches the bearer token and does a single-flight refresh against `/api/v1/platform/auth/refresh` on 401, queueing concurrent requests; a failing refresh logs out.
- **API layer**: every backend call is a typed function in `src/api/platform.ts` (plus `auth.ts`). Pages call these through React Query (`useQuery`/`useMutation`; the global client disables retries and refetch-on-focus). Add new endpoints there rather than calling `apiClient` from components. If you add an endpoint you want to work offline, add a handler to `mock.ts` before the `passThrough()` lines at the bottom.
- **Plans and add-ons** are defined client-side in `src/config/plans.ts` (`PLANS_CONFIG`: labels, badge colors, prices) and `src/config/addons.ts` (`GLOBAL_ADDONS_CATALOG`). Current plan keys are `starter`, `standard`, `business` and `ecom_only`. The legacy keys `pos_only`, `ecommerce_only` and `full_suite` are kept as aliases because existing tenants and the mock data still use them, so handle both sets when you touch plan logic. Keep these in sync with the backend's plan and module gating.
- **Tenant management** (`pages/tenants/`, `components/tenants/`): list/create/detail, plus modals for plan changes, status, add-on attach/detach, entitlements, API-key rotation/reveal, and browsing a tenant's catalog.
- **Storefront generation** (`pages/storefronts/GenerateStorefront.tsx`, a large single-file 4-step wizard: Brand & Scope → AI Copy & Story → Live Preview → Launch). It calls the backend's `platform/generate` endpoints in this order: `tenant-catalog-summary/:tenantId`, `extract-copy`, `preview`, then `POST /generate` to persist and deploy. The `template_id` it chooses (`linea-luxury` or `vetshore-retail`, with a default per industry) must match a theme folder in `../templates/kore-unified-storefront/themes/`. `StorefrontList` manages existing deployments: status (`active`/`maintenance`/`unpublished`), delete, and bulk actions.
- **UI**: Tailwind + shadcn-style primitives in `components/ui/`, with NextUI and Iconify/lucide icons also in use. Toasts come from both `components/ui/toaster` and `react-hot-toast`. `@` resolves to `src/`.

## Origin

This app was cloned from the tenant app (`../kore-commerce-plaftorm`), and the tenant-only code has been removed. State lives in Zustand + React Query, and forms use Formik + Yup. When you need a pattern that doesn't exist here yet, check the tenant app for the original.
