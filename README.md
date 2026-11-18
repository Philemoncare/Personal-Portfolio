# Phill — Portfolio & Work Lab

A portfolio platform built as a real full-stack system: a React/Vite front end, a
FastAPI REST API, and a normalized SQLAlchemy/PostgreSQL data layer. The site is
designed to present only verified work. Anything still awaiting real editorial
content is stored as a row marked `is_placeholder` and labelled as a placeholder
in the UI — no invented projects, testimonials, metrics, or experience.

This repository currently contains **Stage 1 (foundation)**, **Stage 2 (visual
identity + premium homepage)**, and **Stage 3 (work, projects, and case studies)**.
Public content, contact submission, authentication, and the full project/case-study
admin workflow are working. Every project and case study is stored in the database
and served through the same public API the React site reads.

## Stack

| Layer | Technology |
| --- | --- |
| Front end | React 19, Vite 8, TypeScript 7, Tailwind CSS 4, Framer Motion, React Router, Lucide |
| API | Python, FastAPI, Pydantic v2, Uvicorn |
| Data | SQLAlchemy 2, Alembic, PostgreSQL (SQLite fallback for local development) |
| Auth | Argon2id password hashing, opaque server-side sessions (SHA-256 token digests) |
| Fonts | Self-hosted Instrument Sans, Instrument Serif, JetBrains Mono (Fontsource) |

No Node application server is used. Vite serves the front end in development and
builds static assets for production; all application logic lives in FastAPI.

## Repository layout

```text
Personal_portfolio/
├── backend/
│   ├── alembic/                 # Alembic environment + versioned migrations
│   ├── app/
│   │   ├── api/                 # health, deps, /api/v1 public + admin routes
│   │   ├── core/                # settings, security, rate limiting, constants
│   │   ├── db/                  # engine, session, declarative base
│   │   ├── models/              # normalized SQLAlchemy models
│   │   ├── repositories/        # read queries
│   │   ├── schemas/             # Pydantic request/response contracts
│   │   ├── scripts/seed.py      # idempotent honest placeholder seed
│   │   ├── services/            # auth, contact, content assembly
│   │   └── main.py              # app factory, middleware, routers
│   ├── tests/test_api.py
│   ├── tests/test_work_system.py
│   ├── .env.example
│   └── requirements.txt
├── docs/system-architecture.md  # original architecture decisions
├── tools/assets/build_images.py # image pipeline: masters → responsive variants
└── frontend/
    ├── assets/masters/          # unserved originals (never shipped to the browser)
    ├── public/
    │   ├── assets/              # generated responsive variants, grouped by purpose
    │   │   ├── brand/           # favicon, apple-touch-icon
    │   │   ├── profile/         # portrait crops
    │   │   ├── projects/        # per-slug project imagery
    │   │   ├── leadership/      # real event photography
    │   │   └── social/          # composed 1200×630 share card
    │   ├── robots.txt
    │   └── sitemap.xml
    └── src/
        ├── app/                 # site settings provider
        ├── assets/              # central image registry + generated manifest
        ├── components/          # brand, layout, UI primitives, work cards, data visuals
        ├── features/            # Work Mode tabs, timeline
        ├── hooks/               # API resource + SEO hooks
        ├── layouts/             # public, admin and auth shells
        ├── pages/               # route-level pages (public, auth, admin)
        ├── sections/home/       # hero, selected work, now board, data + about previews
        ├── services/            # API client + per-resource and auth/media services
        ├── styles/globals.css   # design tokens + global styles
        ├── types/api.ts         # shared API types
        └── utils/               # cn, date formatting, content helpers
```

## Local quick start

Prerequisites: Python 3.12+ and Node.js 20+. PostgreSQL is only required if you
want to run against it locally; the default development configuration uses
SQLite so the project runs without extra services.

### 1. Backend

```powershell
cd backend
python -m venv .venv
.venv\Scripts\python.exe -m pip install -r requirements-dev.txt
Copy-Item .env.example .env
# Edit .env: set SECRET_KEY and the INITIAL_ADMIN_* values (see Environment variables)
.venv\Scripts\python.exe -m alembic upgrade head
.venv\Scripts\python.exe -m app.scripts.seed
.venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```

On macOS/Linux use `python3 -m venv .venv`, `source .venv/bin/activate`, then
`python -m pip install ...` and the same `alembic`, `seed`, and `uvicorn` commands.

API health check: <http://127.0.0.1:8000/health/live>

Optional, only when the source images change:

```powershell
backend\.venv\Scripts\python.exe tools\assets\build_images.py
```

The script reads originals from `frontend/assets/masters/`, writes responsive
variants into `frontend/public/assets/`, and refreshes
`frontend/src/assets/generated/manifest.json`.

### 2. Frontend

In a second terminal:

```powershell
cd frontend
npm install
Copy-Item .env.example .env   # optional; defaults work for local development
npm run dev -- --host 127.0.0.1 --port 5173
```

Open <http://localhost:5173>. The Vite dev server proxies `/api` and `/health` to
`http://127.0.0.1:8000`, so the session cookie stays same-origin.

### Administrator accounts

Authentication is for the private CMS only; public visitors never need an account.

- The seed script creates the development administrator from `ADMIN_EMAIL` /
  `ADMIN_PASSWORD`.
- On startup the API provisions the bootstrap administrator from
  `INITIAL_ADMIN_EMAIL`, `INITIAL_ADMIN_PHONE`, `INITIAL_ADMIN_PASSWORD`, but only
  when that email does not already exist. The account is created with
  `must_change_password = true`, so the first sign-in must replace the temporary
  password before the CMS unlocks.
- Credentials live in the gitignored `backend/.env`. Use a password manager rather
  than copying them into documentation, chat, or issue trackers.

Sign-in is password first. Accounts with a verification phone must then confirm a
six-digit SMS code; accounts without one sign in with the password alone. In
development, when Arkesel is not configured, the API returns a `dev_otp` field so
the flow can be completed locally. That field never appears when
`ENVIRONMENT=production`, regardless of provider state.

## Environment variables

`backend/.env` (see `backend/.env.example`):

| Variable | Purpose | Default |
| --- | --- | --- |
| `ENVIRONMENT` | `development`, `test`, or `production` | `development` |
| `DATABASE_URL` | SQLAlchemy URL; PostgreSQL in production | `sqlite:///./portfolio.db` |
| `SECRET_KEY` | Random server-only value used to HMAC OTP codes and webhook signatures | — |
| `FRONTEND_ORIGINS` | JSON array of exact allowed origins | `["http://localhost:5173","http://127.0.0.1:5173"]` |
| `PUBLIC_SITE_URL` | Public origin used in absolute URLs | `http://localhost:5173` |
| `SESSION_COOKIE_NAME` | Admin session cookie name | `phill_session` |
| `SESSION_TTL_HOURS` | Session lifetime | `72` |
| `COOKIE_SECURE` | Require HTTPS for the cookie | `false` |
| `COOKIE_SAMESITE` | Cookie SameSite mode | `lax` |
| `CONTACT_RATE_LIMIT_PER_HOUR` | Contact submissions per client IP | `5` |
| `LOGIN_RATE_LIMIT_PER_15_MINUTES` | Login attempts per client IP | `10` |
| `LOGIN_MAX_FAILURES` | Failed passwords before a temporary lockout | `5` |
| `LOGIN_LOCKOUT_MINUTES` | Lockout duration | `15` |
| `OTP_TTL_MINUTES` | Verification code lifetime | `5` |
| `OTP_MAX_ATTEMPTS` | Wrong-code attempts before invalidation | `5` |
| `OTP_RESEND_COOLDOWN_SECONDS` | Minimum time between sends | `60` |
| `OTP_REQUESTS_PER_HOUR` | Codes requested per phone per hour | `8` |
| `ARKESEL_API_KEY` | Arkesel API key (backend only, never `VITE_`) | — |
| `ARKESEL_SENDER_ID` | Approved Arkesel sender ID | — |
| `ARKESEL_WEBHOOK_SECRET` | Shared secret for delivery-callback HMAC | — |
| `ARKESEL_API_BASE_URL` | Arkesel API origin | `https://sms.arkesel.com` |
| `ARKESEL_TIMEOUT_SECONDS` | Outbound SMS request timeout | `10` |
| `ARKESEL_WEBHOOK_MAX_SKEW_SECONDS` | Maximum accepted callback clock skew | `300` |
| `INITIAL_ADMIN_EMAIL` | Bootstrap administrator email (created only when absent) | — |
| `INITIAL_ADMIN_PHONE` | Bootstrap verification phone; normalized to `233…` | — |
| `INITIAL_ADMIN_PASSWORD` | Bootstrap temporary password; change forced at first sign-in | — |
| `INITIAL_ADMIN_FULL_NAME` | Bootstrap display name | — |
| `MEDIA_STORAGE_DIR` | Upload directory for the media library | `storage/media` |
| `MEDIA_MAX_BYTES` | Maximum upload size | `8388608` |
| `MEDIA_MAX_DIMENSION` | Maximum width or height | `8000` |
| `ADMIN_EMAIL` | Seed-script administrator email | — |
| `ADMIN_PASSWORD` | Seed-script administrator password (min 12 chars) | — |

`frontend/.env` (see `frontend/.env.example`):

| Variable | Purpose |
| --- | --- |
| `VITE_API_BASE_URL` | API origin in production; leave empty locally so Vite proxies `/api` |
| `VITE_SITE_URL` | Public site origin used for canonical and Open Graph URLs |

## API

All application routes are versioned under `/api/v1`.

| Method | Route | Notes |
| --- | --- | --- |
| GET | `/health/live` | Liveness |
| GET | `/health/ready` | Database readiness |
| GET | `/api/v1/projects` | Published projects; `category`, `technology`, `status`, `featured`, `search`, `include_archived`, `limit`, `offset` |
| GET | `/api/v1/projects/featured` | Featured published projects |
| GET | `/api/v1/projects/categories` | Categories used by published projects |
| GET | `/api/v1/projects/technologies` | Technologies used by published projects |
| GET | `/api/v1/projects/{slug}` | Project detail with media, related work, and previous/next links |
| GET | `/api/v1/case-studies` | Published case studies |
| GET | `/api/v1/case-studies/{slug}` | Case study detail with hidden-section list |
| GET | `/api/v1/experience` | Published experience |
| GET | `/api/v1/leadership` | Published leadership entries |
| GET | `/api/v1/skills` | Groups containing published skills |
| GET | `/api/v1/certificates` | Published certificates |
| GET | `/api/v1/articles` | Published articles |
| GET | `/api/v1/articles/{slug}` | Article detail |
| GET | `/api/v1/timeline` | Published timeline entries |
| GET | `/api/v1/now` | Published Now items |
| GET | `/api/v1/site-settings/public` | Public profile/settings record |
| POST | `/api/v1/contact` | Validated, rate-limited contact submission |
| POST | `/api/v1/auth/login` | Password sign-in; returns `otp_required` for phone accounts, otherwise sets the HttpOnly session cookie |
| POST | `/api/v1/auth/verify-otp` | Verifies the six-digit code and sets the session cookie |
| POST | `/api/v1/auth/resend-otp` | Reissues a code, subject to the resend cooldown and hourly cap |
| POST | `/api/v1/auth/logout` | Revokes the current session and clears the cookie |
| POST | `/api/v1/auth/forgot-password` | Requests a recovery code; response is identical for unknown accounts |
| POST | `/api/v1/auth/reset-password` | Consumes the recovery code, sets a new password, revokes all sessions |
| GET | `/api/v1/auth/me` | Current administrator, or 401/403 |
| POST | `/api/v1/auth/change-password` | Replaces the password; signs out other sessions |
| GET | `/api/v1/auth/sessions` | Active sessions for the current administrator |
| DELETE | `/api/v1/auth/sessions/{id}` | Revokes one session |
| GET | `/api/v1/auth/security` | Session summary and recent activity events |
| POST | `/api/v1/webhooks/arkesel` | Signed delivery callback; rejects bad signatures, stale timestamps, duplicates |
| GET | `/api/v1/admin/security/activity` | Paginated activity log; `search`, `event`, `status`, `date_from`, `date_to`, `sort`, `order`, `limit`, `offset` |
| GET | `/api/v1/admin/security/sessions` | The caller's sessions with IP, user agent, status and timestamps |
| POST | `/api/v1/admin/security/sessions/revoke` | Revokes one of the caller's other sessions |
| POST | `/api/v1/admin/security/sessions/revoke-all` | Revokes every other session for the caller |
| GET | `/api/v1/admin/sms` | SMS delivery log; `search`, `status`, `purpose`, `date_from`, `date_to`, `sort`, `order`, `limit`, `offset` |
| GET | `/api/v1/admin/sms/{id}` | One SMS record, including provider reference and failure reason |
| GET/POST | `/api/v1/admin/media` | List or upload validated media (SUPER_ADMIN) |
| PATCH/DELETE | `/api/v1/admin/media/{id}` | Rename, re-associate, or delete an asset |
| GET | `/api/v1/admin/overview` | Protected dashboard counts and recent records |
| GET | `/api/v1/admin/reference` | Categories, technologies, statuses, stages, section labels |
| GET | `/api/v1/admin/projects` | All projects (draft, published, archived) |
| POST | `/api/v1/admin/projects` | Create a project |
| GET/PUT/DELETE | `/api/v1/admin/projects/{id}` | Read, update, or delete a project |
| GET | `/api/v1/admin/projects/{id}/preview` | Authenticated, render-ready preview of any project, including drafts |
| PATCH | `/api/v1/admin/projects/{id}/status` | Publish, unpublish, or archive |
| POST | `/api/v1/admin/projects/{id}/duplicate` | Copy a project as a draft |
| POST | `/api/v1/admin/projects/reorder` | Persist display order |
| GET/POST | `/api/v1/admin/case-studies` | List or create case studies |
| GET/PUT/DELETE | `/api/v1/admin/case-studies/{id}` | Read, update, or delete a case study |

Interactive API docs are available at `/docs` outside production.

## Architecture

The request path is deliberately layered:

```text
React page → typed API client → FastAPI route → service → repository → SQLAlchemy → database
```

- **Routes** validate input, enforce authentication, and map errors to HTTP.
- **Services** hold workflow logic (auth sessions, contact handling, content assembly).
- **Repositories** contain read queries and only return published public content.
- **Models** are normalized (17+ tables), with named constraints and portable types.
- **Schemas** define the public contract; internal fields are not leaked.

Migrations are Alembic-managed (`backend/alembic/versions/`). The initial migration
is database-portable and can be applied to either SQLite or PostgreSQL.

## Brand and homepage

The identity is a personal technology practice, not a generic SaaS template: an
editorial near-black canvas, one accent, technical metadata labels, and large type
used only where it carries the statement.

- **Identity mark** — a bordered `P` with a signal square. It is the navbar mark, the
  favicon (`/assets/brand/favicon.svg`), the Apple touch icon
  (`/assets/brand/apple-touch-icon.png`), and the basis of the social card
  (`/assets/social/og-image.jpg`, 1200×630).
- **Wordmark** — `PHILL` with `PHILEMON MELABAH` beneath, used in the header, footer,
  and metadata.
- **Tokens** — semantic colour tokens (background, surface, border, text, accent,
  success, warning, error), a type scale, and technical grid utilities in
  `frontend/src/styles/globals.css`. One accent: `#ff4e1f`.
- **Homepage order** — hero + profile index, info strip, selected work, Work Mode
  (Build / Data / Lead / Explore), currently building status board, Data Lab
  preview, About preview, timeline preview, grounded contact CTA, footer.
- **Data flow** — components call small service modules
  (`projectsService`, `nowService`, `timelineService`, `settingsService`,
  `leadershipService`) through the shared API client and `useApiQuery` /
  `useContent` hooks. No component fetches its own endpoint directly.
- **Honesty rules in the design** — project plates read “media pending” until real
  screenshots exist, the Data Lab chart is labelled `DEMO DATA` with a
  demonstration-only caption, unpublished Now entries are withheld with a visible
  count, and every unfinished record keeps a placeholder label.

### Image system

Every displayed image goes through one registry and one component. There are no
hard-coded `<img src="/assets/…">` tags outside `PortfolioImage`.

- **Masters** — original, full-resolution files live in `frontend/assets/masters/`
  and are never served. `tools/assets/build_images.py` produces small, medium and
  large variants (WebP sources plus JPEG/PNG fallbacks) in
  `frontend/public/assets/<purpose>/`.
- **Registry** — `frontend/src/assets/registry.ts` is generated from
  `frontend/src/assets/generated/manifest.json` and exposes typed ids, intrinsic
  dimensions, default alt text, focal position, aspect ratio and srcsets.
- **Component** — `frontend/src/components/media/PortfolioImage.tsx` renders a
  `<picture>` with WebP sources, a JPEG fallback srcset, explicit dimensions to
  reserve layout space, lazy loading by default, a dominant-colour placeholder, and
  loading/error/fallback states. Above-the-fold images opt into eager loading.
- **Honest gaps** — only supplied photography is used. Projects without a real
  screenshot keep a typographic plate; there are no stock photos, generic coding
  shots, or generated people.
- **Media library** — `/admin/media` uploads validated JPEG/PNG/WebP files (max
  8 MB, max 8000 px), stores them under a random filename in `MEDIA_STORAGE_DIR`,
  serves them from `/media/<uuid>.<ext>`, and records dimensions, type, size and an
  optional content association.

## Publishing platform (CMS)

Every editable public surface reads from the database through `/api/v1`. A page load
with an empty database falls back to the designed copy, never to a broken page; once
an administrator saves an override, the public page uses it on the next load.

- **Page content** — `GET /api/v1/pages` returns the published records for `home`,
  `work`, `data-lab`, `build-lab`, `leadership`, `experience`, `about`, `now`,
  `timeline`, `resume`, and `contact`. Each record can set the eyebrow, title,
  description, intro, hero image, per-page SEO title/description, Open Graph image,
  canonical path, and an optional JSON `content` payload. Unpublished records are
  hidden from the public API. `/admin/pages` edits them; pages keep their designed
  headings when a field is blank.
- **Social links** — `GET /api/v1/social-links` is the single source for the footer
  and the contact page channels. `/admin/social-links` manages platform, label, URL,
  handle, order, and visibility. If no records exist, both surfaces fall back to the
  site settings email/GitHub/LinkedIn fields rather than inventing links.
- **Deployment and live preview** — the project editor has Basic, Media, Deployment,
  Case Study, SEO, and Publishing sections. Deployment stores provider, environment,
  live URL, repository, video, and external-project URLs plus GitHub metadata.
  `embed_enabled` grants permission to *attempt* a preview; the browser still decides,
  and `LiveProjectPreview` shows loading, timeout, and blocked states with an external
  open link. No screenshot is fabricated when a host refuses framing.
- **Media library** — folders, search, kind/association filters, usage checks,
  same-filename replacement (same extension, same URL), attach/detach, copyable
  references, and metadata editing. Deleting a referenced asset is refused unless the
  administrator confirms a forced delete.
- **Messages** — the public contact form always stores the submission first. The admin
  inbox is a two-pane mail view with `new`, `read`, `replied`, `archived`, and `spam`
  statuses, plain-text bodies (submitted HTML is never rendered), and an explicit note
  that “reply” opens the local mail client and the replied status is a record, not a
  delivery receipt.
- **Theme** — `dark` is the primary design. `light` and `system` are available at
  `/admin/appearance`. The choice is stored in `localStorage` under `phill:theme` and
  applied as `data-theme` on `<html>`; it is a per-browser display preference, not
  published content. The site-wide accent still comes from Settings.

## Work system (projects and case studies)

`/work` is a personal project index, not a marketplace catalogue. It is driven by
`GET /api/v1/projects`, so every card, filter count, and detail page comes from the
database.

- **Categories** — Web Development, Data & Analytics, Cloud & AWS, Software,
  Academic, Experiments, Other. Each project has one primary category and any number
  of optional secondary categories.
- **Filtering** — category chips, technology and stage selects, and a debounced
  search (320 ms) across names, descriptions, categories, and technologies. Filter
  state is kept in the URL (`?category=…&technology=…&status=…&q=…`), so views are
  shareable and survive refresh. Archived work is hidden unless explicitly selected.
- **Layout variety** — a featured entry, a two-card split, and horizontal rows are
  chosen by position rather than repeating one uniform grid. The same cards are used
  on the Data Lab, Build Lab, related-work, and admin preview surfaces.
- **Project detail** — dynamic `/work/{slug}` pages with cover media, a metadata band
  (category, year, role, stage), technologies, overview, architecture diagrams,
  gallery media, grouped stack, case-study link, related projects, and safe
  previous/next navigation. Only link types that exist are rendered: Live demo,
  GitHub, Documentation, Download, and External.
- **Technologies** are relational (`projects`, `technologies`,
  `project_technologies`), never comma-separated strings. New tools can be typed
  into the editor and are created once, then reused.
- **Case studies** — `/case-studies/{slug}` renders only the sections with content:
  overview, problem, context, goals, research, planning, architecture, design,
  implementation, challenges, technical decisions, testing, results, lessons learned,
  and future improvements (plus optional idea, solution, role, technology, and key
  features). `hidden_sections` lets the owner keep a written section out of the
  public page without deleting it.
- **Challenges** support explicit `CHALLENGE:` / `APPROACH:` / `OUTCOME:` blocks.
  Results can be text, metric, achievement, technical, or qualitative — a quantitative
  metric is never required or invented.
- **Ordering** — public work is ordered by `sort_order`, then newest publication, not
  by creation date. `featured` controls the homepage. Related projects share a
  category or technology; previous/next follow the published ordering.
- **Draft lifecycle** — `draft` records are never returned by the public API;
  `published` records appear normally; `archived` records are hidden unless
  `include_archived=true` is requested. The separate `project_status` field carries
  Active / In Progress / Completed / Archived / Experiment without affecting
  publication.

Admin routes:

- `/admin/projects` — status tabs, search, publish/unpublish, archive/restore,
  duplicate, delete with confirmation, and reorder controls.
- `/admin/projects/new` and `/admin/projects/{id}` — identity, classification,
  technologies, project details, all five link types, cover/media rows, and publishing.
  Every saved project has an authenticated preview at
  `/admin/projects/{id}/preview` that renders the real project layout before it is
  public; the preview is `noindex` and shows a “Not public” banner.
- `/admin/case-studies` — case-study list and delete.
- `/admin/case-studies/new` and `/admin/case-studies/{id}` — project link, identity,
  every narrative section with per-section visibility, result type, and publishing.

The seeded categories, stages, technology associations, and the single SchooMA
case-study placeholder are **provisional local-development metadata**. All four
project rows remain `is_placeholder=true`; the owner supplies the real metadata,
screenshots, and narrative from the admin editor.

### Social preview

`og:image` and `twitter:image` point at `/assets/social/og-image.jpg`. Most crawlers
require an absolute URL, so set the production origin (for example
`https://example.com/assets/social/og-image.jpg`) when the domain is known. The
`useSeo` hook falls back to the registry's social image for pages without a cover.

## Security notes

- Passwords are hashed with Argon2id (`argon2-cffi`). Password policy: minimum 12
  characters, and the seeded bootstrap password must be replaced at first sign-in.
- Admin sessions are opaque random tokens; only a SHA-256 digest is stored in
  `auth_sessions`. The raw token exists only in an `HttpOnly` cookie — never in
  `localStorage`, `sessionStorage`, or a response body.
- Cookies are `HttpOnly`, `SameSite=Lax` by default, and `Secure` when configured.
- SMS codes are six digits from a cryptographically secure generator, stored only as
  an HMAC-SHA-256 digest, expire after five minutes, are single-use, allow five
  attempts, and are rate-limited per phone. Resends respect a cooldown. An expired or
  attempt-exhausted challenge can be replaced by a new code; only the newest code is
  usable. The failure that exhausts the attempt cap reports “Too many attempts”.
- Every outbound SMS has a row in `sms_logs` created before the provider call
  (`QUEUED`), moved to `SENT` when the provider accepts it, and reconciled only by a
  signed webhook to `DELIVERED`, `FAILED`, `EXPIRED` or `CANCELLED`. Terminal states
  are never overwritten by a later callback. The log stores a masked phone number,
  provider reference and failure category — never the OTP or the message body.
- Verification checks (`/auth/verify-otp`) are limited to 30 per client per 15
  minutes; recovery requests (`/auth/forgot-password`) to 10 per client per hour, in
  addition to the per-phone code cap. Exceeding a limit returns `429` with a
  `Retry-After` header.
- `/admin/security` polls activity and SMS records every 12 seconds, shows a
  “Last updated” timestamp and a subtle refresh indicator, and never fakes realtime
  data. Sessions are scoped to the signed-in administrator, so listing and revocation
  capabilities agree.
- Repeated password failures lock the account temporarily; the lockout is recorded.
- Arkesel is called only from `backend/app/services/arkesel_service.py`, reached
  through the auth → OTP → SMS service chain. Route handlers never make outbound
  HTTP calls. Credentials stay in backend environment variables.
- Provider failures map to safe messages (authentication, insufficient balance,
  invalid recipient, invalid sender, rate limit, timeout, unavailable, malformed
  response) while detailed diagnostics stay server-side.
- The Arkesel webhook verifies an HMAC over `${timestamp}.${raw_body}`, rejects
  timestamps outside the allowed skew, and records webhook ids so replays return
  `duplicate`.
- Uploads are validated by MIME type, extension, size, dimensions and magic bytes
  with Pillow; filenames are replaced with UUIDs. HTML, SVG and script content are
  rejected.
- Activity logs record sign-in, failures, OTP lifecycle, password changes, session
  revocation and media changes — never passwords, codes, API keys or tokens.
- Unsafe HTTP methods are rejected unless the `Origin` header matches the allowlist.
- CORS is restricted to exact configured origins with credentials enabled.
- Contact and login endpoints are rate-limited per client IP.
- ORM queries are parameterized; SQLAlchemy expressions are used instead of raw SQL.
- Unhandled exceptions return a generic 500 response; stack traces are only logged server-side.
- Security headers: `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`,
  `Permissions-Policy`, plus a request ID on every response.

Known limitations:

- Rate limiters are in-process; move counters to Redis before running multiple API instances.
- Password-recovery responses are generic and the phone hint is derived only from the
  submitted identifier, so the body cannot confirm an account. A provider network call
  for real accounts can still create a weak timing difference; queueing recovery SMS
  asynchronously would remove it.
- CSRF tokens are not yet issued. Cookie-authenticated admin mutations currently rely
  on strict `Origin` checking plus `SameSite=Lax`; add per-request CSRF tokens before
  exposing the admin to untrusted networks.
- Live Arkesel delivery has not been exercised end-to-end in this environment because
  no valid API key is available; the previously exposed key must be rotated before
  use. Local verification used the development transport plus a locally signed
  webhook, so delivery and delivery receipts are covered by tests but not confirmed
  against Arkesel itself.
- Production PostgreSQL has not been runtime-verified in this environment (no local
  PostgreSQL/Docker). The SQLite fallback and portable migrations are verified.

## Authentication

Authentication exists only for the private CMS; public pages never ask for an
account. All enforcement happens on the server.

**Sign-in flow**

1. `POST /auth/login` with email or Ghana phone plus password. Phone numbers are
   normalized (`05XXXXXXXX`, `+233…`, `233…`, `00233…`) to a single canonical
   `233…` form before lookup.
2. Accounts with a verification phone receive `{status: "otp_required",
   challenge_id, phone_masked, expires_in}` and no cookie. Accounts without one
   receive `{status: "authenticated", admin}` and the session cookie.
3. `POST /auth/verify-otp` consumes the code and creates the session.
4. A provisioned account with `must_change_password` can reach `/auth/me` but every
   other admin endpoint answers `403 Password change required` until
   `/auth/change-password` succeeds.

**Frontend routes**

| Route | Purpose |
| --- | --- |
| `/login` (alias `/admin/login`) | Password step |
| `/verify-otp` | Six-digit code step |
| `/forgot-password` | Request a recovery code |
| `/reset-password` | Consume the code and set a new password |
| `/change-password` | Forced or voluntary password change |
| `/admin/account` | Identity, role and session summary |
| `/admin/security` | Security overview, activity log, SMS delivery log |
| `/admin/security/sessions` | The caller's sessions with individual and bulk revoke |
| `/admin/media` | Upload and manage images |

**Guarding** — `ProtectedRoute` uses the centralized `AuthProvider`, which resolves
`GET /auth/me` before any admin page renders. `401` redirects to `/login` with the
intended path preserved and a session-expired message; `403 Password change required`
redirects to `/change-password`, and a `must_change_password` account is blocked from
the CMS. If a session is revoked elsewhere, the next authenticated API call raises
`401`, clears the provider state, and redirects. Role checks use `SUPER_ADMIN` today
and the backend `require_roles` dependency is ready for `EDITOR`, `ANALYST` and
`VIEWER` later.

**Recovery** — `/auth/forgot-password` returns the same challenge-shaped response
whether or not the account exists, so it cannot be used to enumerate administrators.
A successful reset invalidates the code and revokes every active session.

### Enabling real SMS (Arkesel)

The backend uses the development transport whenever `ARKESEL_API_KEY` **or**
`ARKESEL_SENDER_ID` is missing. That transport sends nothing and exposes a
development-only `dev_otp`; it is a local stand-in, not a working SMS service.

To send real OTP messages:

1. Rotate/revoke any previously exposed Arkesel key in the Arkesel dashboard, then
   create a new API key. Confirm the sender ID is approved for your account.
   Arkesel rejects unapproved senders with HTTP 422 and
   `You are not allowed to use this Sender ID`; that is an account setting, not a
   bug in this application.
2. Set these values in `backend/.env` (never commit them):

   ```dotenv
   ARKESEL_API_KEY=your-new-key
   ARKESEL_SENDER_ID=your-approved-sender-id
   ARKESEL_WEBHOOK_SECRET=a-random-shared-secret
   SMS_BRAND_NAME=Phill Portfolio
   ```

   `ARKESEL_SENDER_ID` must be the exact, case-sensitive Sender ID shown as
   approved in the Arkesel dashboard (for example `Portfolio`).

3. Restart the API. The startup log must show `SMS transport: arkesel`; if it shows
   `development`, at least one of the two values is still missing.
4. Once both values are present, `dev_otp` is no longer returned, even in development.
   A phone account signs in only after the real message arrives.
5. Verify the provider independently without creating an OTP (this spends one SMS):

   ```powershell
   cd backend
   .venv\Scripts\python.exe -m app.scripts.sms_check 0599811870
   ```

   `ACCEPTED status=SENT` means Arkesel accepted the request. `DELIVERED` is only
   recorded after Arkesel calls the signed webhook. If the request fails with
   `invalid_sender`, the command prints the reason Arkesel returned.

   Acceptance is not delivery. Arkesel can hold a message at `PENDING APPROVAL`
   when the sender ID has not been approved for the account; the SMS then never
   reaches the handset even though the API answered `success`. Check the
   provider-side state of recent messages with:

   ```powershell
   .venv\Scripts\python.exe -m app.scripts.sms_status
   ```

   `PENDING APPROVAL` is an Arkesel account setting: approve the sender ID in
   their dashboard or ask their support to approve it for transactional SMS.
6. In the Arkesel dashboard, point the delivery callback at
   `https://<your-api-host>/api/v1/webhooks/arkesel`. This application expects a
   callback that signs `${timestamp}.${raw_body}` with HMAC-SHA-256 using
   `ARKESEL_WEBHOOK_SECRET` and sends `X-Arkesel-Webhook-Timestamp`,
   `X-Arkesel-Webhook-Signature` and `X-Arkesel-Webhook-Id`. Arkesel's own
   delivery report format is not signed this way, so either place a small proxy in
   front of the endpoint that adds those headers, or extend
   `verify_callback()` in `app/services/arkesel_service.py` to accept Arkesel's
   documented payload. Until then, outbound messages stay at `SENT` and are never
   marked `DELIVERED`.

In production an unconfigured provider fails closed: the login request returns a
safe delivery error instead of pretending a code was sent.

## Using PostgreSQL

Set `DATABASE_URL` to a psycopg 3 URL and re-run migrations:

```dotenv
DATABASE_URL=postgresql+psycopg://portfolio_user:CHANGE_ME@localhost:5432/portfolio
```

```powershell
cd backend
.venv\Scripts\python.exe -m alembic upgrade head
.venv\Scripts\python.exe -m app.scripts.seed
```

In production also set `ENVIRONMENT=production`, `COOKIE_SECURE=true`, a strong
random `SECRET_KEY`, a unique `INITIAL_ADMIN_PASSWORD` (or no `INITIAL_ADMIN_*`
values at all once the account exists), the Arkesel credentials, and the deployed
front-end origin in `FRONTEND_ORIGINS`. Set `PUBLIC_SITE_URL` so canonical and
Open Graph URLs are absolute.

## Content and honesty policy

Only four project names were supplied by the owner: **SchooMA**, **OmniMarket**,
**Signly**, and **Career Path 360**. Their rows are seeded as published but
explicitly marked `is_placeholder` until full write-ups exist, and the UI labels
them accordingly. Short owner-supplied summaries are shown where they were provided;
the rest keep a placeholder note.

No leadership roles, experience entries, skills, certificates, articles,
testimonials, statistics, or GitHub activity were invented. Those sections show
honest empty states until real content is added through the admin panel. One
placeholder case study (`/case-studies/schooma`) is seeded with only an overview
paragraph and is labelled as in progress; every other section is empty. No
architecture diagrams, screenshots, metrics, or outcomes are fabricated — diagrams
and media appear only when a real URL is attached to a project.
Profile copy is still marked as a placeholder: only the owner-supplied basics
(location, availability, and the short introduction) are seeded, and the longer
biography, contact links, and CV stay visibly unset.

## Tests and checks

```powershell
cd backend
.venv\Scripts\python.exe -m pytest -q

cd ..\frontend
npm run build
```

The backend test suite covers health, empty public lists, missing settings, contact
validation/persistence, admin authentication, and the work system: draft/archived
visibility, category/technology/status/featured/search filters, related and
previous/next navigation, the admin create → draft → publish → duplicate → reorder →
delete lifecycle, case-study publishing, and hidden sections. The authentication suite
adds phone normalization, OTP hashing/expiry/attempt caps/resend recovery, lockout,
password change and reset, role restrictions, SMS log lifecycle, Arkesel error
mapping, webhook signature/replay rejection, session scoping/revocation, activity
filters, and media upload validation. The production frontend build runs TypeScript
checking before bundling.

The publishing-platform suite (`backend/tests/test_publishing_platform.py`) covers
project deployment/visibility fields, linked case studies on the public project
detail, DB-driven social links and page content, experience/leadership admin CRUD,
media folders/usage/replacement plus the guarded delete, the message spam status, and
strict GitHub repository URL parsing.

Current result: 87 backend tests passing, a clean `tsc -b`, and a clean `vite build`.
A live API script exercised 43 end-to-end checks against a running instance (email and
phone sign-in, wrong codes, single-use OTP, `/me`, signed webhook and duplicate
replay, session revocation, logout, resend cooldown, generic recovery, and password
reset), and the UI flow was driven through the real browser for the OTP states,
filter/sort/pagination behaviour, polling updates, and session revocation. A later
live pass created a social link and a page-content record through the authenticated
admin API, confirmed both appeared immediately on the public endpoints, and confirmed
that deleting them removed them again; a contact submission was stored, moved to
spam, restored to read, and deleted.

Not exercised locally: real Arkesel SMS delivery, SMTP notification email, GitHub
metadata refresh against `api.github.com`, and third-party live embeds. Those paths
are implemented with explicit failure handling and are reported as unverified rather
than as passing.

## Status

Stage 1 (foundation) working:

- Public pages: Home, Work index, Project detail, Case study shell, Data Lab,
  Build Lab, Leadership, About, Now, Contact, 404.
- Responsive sticky header, full-screen mobile navigation, footer, skip link.
- Loading, empty, error, and success states for every dynamic section.
- Contact form validation, honeypot, API persistence, rate-limit feedback.
- Admin login/logout, protected dashboard, live database counts and recent records.
- SEO title/description/canonical/Open Graph updates per route; admin `noindex`.
- Reduced-motion handling throughout.
- Alembic migration, idempotent seed, and passing tests.

Stage 2 (visual identity + homepage) working:

- Brand mark, wordmark, favicon, Apple touch icon, and 1200×630 social card.
- Design-token layer with one accent, editorial type scale, and technical grid.
- Rebuilt hero with profile index, info strip, and grounded CTA.
- Selected Work with varied layouts (split features plus editorial rows) and
  “media pending” plates instead of stock imagery.
- Work Mode tabs (Build / Data / Lead / Explore) with counts, capabilities, related
  records, keyboard support, and animated panel changes without reload.
- Currently Building status board from `/api/v1/now`, relative update times, no
  fabricated progress percentages.
- Data Lab preview with a clearly labelled demonstration chart and screen-reader table.
- About and timeline previews driven by settings and timeline records.
- API service layer for projects, Now, timeline, settings, and leadership.
- Verified at 390, 430, 768, 1024, 1280, and 1440 px with no horizontal overflow.

Stage 3 (work, projects, and case studies) working:

- Dynamic `/work` index with category/technology/stage filters, debounced URL-backed
  search, facet counts, varied layouts, and empty/error/loading states.
- Dynamic `/work/{slug}` project detail with media, grouped stack, all five link
  types, case-study CTA, related projects, and safe previous/next navigation.
- Dynamic `/case-studies/{slug}` with up to 20 content sections, per-section
  visibility, CHALLENGE/APPROACH/OUTCOME blocks, result types, and project-linked
  architecture diagrams.
- Relational project technologies and secondary categories; public categories and
  technologies only include values used by published work.
- Admin project management: create, edit, authenticated preview (drafts included),
  publish, unpublish, archive, restore, duplicate, reorder, and delete with
  confirmation.
- Admin case-study editor with section visibility, result type, and publish workflow.
- Draft/published/archived lifecycle enforced by the public API; dynamic SEO and Open
  Graph images per project/case study.
- Verified at 390, 430, 768, 1024, 1280, and 1440 px with no horizontal overflow on
  the work index, project detail, case study, admin list, and admin editors.
- End-to-end browser check: admin create → private draft → publish → public project
  page → duplicate → delete; case-study create → publish → hidden section → delete.

Stage 4 (assets, image system, authentication) working:

- Every image is registered once and rendered through `PortfolioImage` with WebP
  sources, responsive srcsets, reserved layout space, lazy loading, fallback and
  loading states. Masters are unserved; variants are generated by
  `tools/assets/build_images.py`.
- Asset folders grouped by purpose under `public/assets/`; brand files moved from the
  public root; the social card is composed at 1200×630.
- Editorial hero built from live CMS profile data and a real portrait crop; project
  cards vary by importance and reveal metadata on hover within a 1.02–1.04 scale.
- Password + SMS OTP sign-in against `Arkesel`, server-side sessions in `auth_sessions`,
  forced first-login password change, lockout, rate limits, recovery, and an admin
  security dashboard.
- Security dashboard with real overview metrics, searchable/filterable/sortable
  activity and SMS delivery tables, pagination, 12-second polling and manual refresh.
- Session review at `/admin/security/sessions` with individual and bulk revocation,
  scoped to the signed-in administrator; other browsers are signed out on their next
  request.
- SMS delivery log records provider acceptance (`SENT`) and reconciles to
  `DELIVERED`/`FAILED`/`EXPIRED`/`CANCELLED` only through the signed Arkesel webhook;
  phone numbers are masked and OTP bodies are never stored.
- Media library with validated uploads, metadata editing, search, filtering and
  deletion; activity logging for security-relevant events.
- Auth screens at `/login`, `/verify-otp`, `/forgot-password`, `/reset-password` and
  `/change-password`; admin account, security and media pages.

Stage 5 (publishing platform) working:

- DB-driven page introductions and per-page SEO with designed fallbacks; no rebuild
  and no manual JSON edits are needed to change public copy.
- Social links managed in the admin and rendered consistently in the footer and the
  contact page channels, with settings fallbacks when none are configured.
- Project detail rebuilt around deployment links, an honest live preview, narrative
  sections that hide when empty, grouped stack, gallery, and related/previous/next.
- Media library with folders, usage warnings, same-URL replacement, attachments,
  copyable references, and guarded deletion.
- Mail-style message inbox with spam handling, plain-text rendering, and no fake email
  delivery.
- Dark/light/system theme with tokens shared by the public site and the admin.
- Grouped admin navigation covering content, site copy, inbox, and workspace.

Next:

- CSRF tokens for admin mutations.
- Live Arkesel SMS delivery verification once a rotated API key is available.
- Production PostgreSQL deployment verification and optional build-time prerendering.
- Real editorial content, contact links, project screenshots, and CV upload.
- Optional structured homepage section copy on top of the generic page `content` JSON.

## Design notes

Dark editorial + technology-lab identity: near-black `#0a0b0d`, warm off-white
`#e9e5dc`, and a single signal accent `#ff4e1f`. Typography pairs Instrument Sans
with Instrument Serif italics and JetBrains Mono labels. No percentage skill bars,
no generic blue/white dashboard styling, and no decorative gradient noise.
