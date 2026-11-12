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
└── frontend/
    ├── public/                  # favicon, apple-touch-icon, og-image, robots, sitemap
    └── src/
        ├── app/                 # site settings provider
        ├── components/          # brand, layout, UI primitives, work cards, data visuals
        ├── features/            # Work Mode tabs, timeline
        ├── hooks/               # API resource + SEO hooks
        ├── layouts/             # public + admin shells
        ├── pages/               # route-level pages (including admin)
        ├── sections/home/       # hero, selected work, now board, data + about previews
        ├── services/            # per-resource service modules over the API client
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
# Edit .env: set ADMIN_EMAIL and a long unique ADMIN_PASSWORD
.venv\Scripts\python.exe -m alembic upgrade head
.venv\Scripts\python.exe -m app.scripts.seed
.venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```

On macOS/Linux use `python3 -m venv .venv`, `source .venv/bin/activate`, then
`python -m pip install ...` and the same `alembic`, `seed`, and `uvicorn` commands.

API health check: <http://127.0.0.1:8000/health/live>

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

### Local administrator

The seed script creates the administrator from `ADMIN_EMAIL` / `ADMIN_PASSWORD`.
The current local development account is:

```text
Email:    admin@phill.dev
Password: oURyPwszt5hIjdgY1NuV2J9e
```

These credentials are local-only. Replace them before any deployment. The login
endpoint validates email with Pydantic `EmailStr`, so use a normal domain — reserved
domains such as `.local` are rejected.

## Environment variables

`backend/.env` (see `backend/.env.example`):

| Variable | Purpose | Default |
| --- | --- | --- |
| `ENVIRONMENT` | `development`, `test`, or `production` | `development` |
| `DATABASE_URL` | SQLAlchemy URL; PostgreSQL in production | `sqlite:///./portfolio.db` |
| `FRONTEND_ORIGINS` | JSON array of exact allowed origins | `["http://localhost:5173","http://127.0.0.1:5173"]` |
| `SESSION_COOKIE_NAME` | Admin session cookie name | `phill_session` |
| `SESSION_TTL_HOURS` | Session lifetime | `72` |
| `COOKIE_SECURE` | Require HTTPS for the cookie | `false` |
| `CONTACT_RATE_LIMIT_PER_HOUR` | Contact submissions per client IP | `5` |
| `LOGIN_RATE_LIMIT_PER_15_MINUTES` | Login attempts per client IP | `10` |
| `ADMIN_EMAIL` | Initial administrator email (seed only) | — |
| `ADMIN_PASSWORD` | Initial administrator password (seed only, min 12 chars) | — |

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
| POST | `/api/v1/auth/login` | Admin sign in; sets HttpOnly session cookie |
| POST | `/api/v1/auth/logout` | Revokes the session |
| GET | `/api/v1/auth/me` | Current administrator |
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
  favicon (`public/favicon.svg`), the Apple touch icon
  (`public/apple-touch-icon.png`), and the basis of the social card
  (`public/og-image.png`, 1200×630).
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

`og:image` and `twitter:image` currently point at `/og-image.png`. Most crawlers
require an absolute URL, so set the production origin (for example
`https://example.com/og-image.png`) in `frontend/index.html` when the domain is known.

## Security notes

- Passwords are hashed with Argon2id (`argon2-cffi`).
- Admin sessions are opaque random tokens; only a SHA-256 digest is stored.
- Cookies are `HttpOnly`, `SameSite=Lax`, and configurable `Secure`.
- Unsafe HTTP methods are rejected unless the `Origin` header matches the allowlist.
- CORS is restricted to exact configured origins with credentials enabled.
- Contact and login endpoints are rate-limited per client IP.
- ORM queries are parameterized; SQLAlchemy expressions are used instead of raw SQL.
- Unhandled exceptions return a generic 500 response; stack traces are only logged server-side.
- Security headers: `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`,
  `Permissions-Policy`, plus a request ID on every response.

Known limitations:

- Rate limiters are in-process; move counters to Redis before running multiple API instances.
- CSRF tokens are not yet issued. Cookie-authenticated admin mutations currently rely
  on strict `Origin` checking plus `SameSite=Lax`; add per-request CSRF tokens before
  exposing the admin to untrusted networks.
- Media is referenced by URL. There is no upload/storage pipeline yet; point the editor
  at optimized assets served by the site or a CDN.
- Production PostgreSQL has not been runtime-verified in this environment (no local
  PostgreSQL/Docker). The SQLite fallback and portable migrations are verified.

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
`ADMIN_PASSWORD`, and the deployed front-end origin in `FRONTEND_ORIGINS`.

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
delete lifecycle, case-study publishing, and hidden sections. The production
frontend build runs TypeScript checking before bundling.

Current result: `12 passed` (backend) and a clean `vite build` (frontend).

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

Next:

- Admin CRUD for the remaining modules: experience, leadership, skills, certificates,
  articles, timeline, Now, and site settings.
- Media upload/storage integration and thumbnail generation.
- CSRF tokens for admin mutations.
- Production PostgreSQL deployment verification and optional build-time prerendering.
- Real editorial content, contact links, project media, and CV upload.

## Design notes

Dark editorial + technology-lab identity: near-black `#0a0b0d`, warm off-white
`#e9e5dc`, and a single signal accent `#ff4e1f`. Typography pairs Instrument Sans
with Instrument Serif italics and JetBrains Mono labels. No percentage skill bars,
no generic blue/white dashboard styling, and no decorative gradient noise.
