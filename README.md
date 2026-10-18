# CampusCare - Smart Campus Complaint Management System

Students report campus problems (Wi-Fi, labs, classrooms, water, electricity, hostel...), follow every step until they are fixed, and rate the result. Administrators review, prioritise and assign complaints, watch resolution targets and read reports. Staff work the complaints assigned to them.

**Stack:** React 19 + Vite, Tailwind CSS 4, React Router, Recharts, Lucide, React Hook Form + Zod, Sonner · Node.js + Express 5, MongoDB Atlas + Mongoose 9, JWT in HTTP-only cookies, bcryptjs · Vercel (two projects).

---

## 1. Features

| Area | What is implemented |
| --- | --- |
| Roles | **Student** (self-registration), **Staff** and **Admin** (created by an admin only; there is no public admin sign-up). Roles are enforced on the server for every request. |
| Complaints | Unique reference `CC-2026-0001`, title, description, category, location, optional photo, priority, status, department, assignee, target date, resolution notes, full history. |
| Workflow | Submitted → Under Review → Assigned → In Progress → Resolved → Closed, plus Rejected (reason required), Reopened (reason required) and Cancelled. Invalid transitions are rejected; every change is saved with actor, previous/new status, comment and time, and a notification is created. |
| Smart priority | Transparent rule-based suggestion (category weight + keyword rules). The student sees *why*. Admins can override; the final priority and its source (`rules` / `student` / `admin`) are stored. Students cannot self-select *Critical*. |
| Duplicate warning | Before submitting, open complaints in the same category and location from the last 14 days are shown. Nothing is merged. Students can open only their own; other students' complaints are shown as "reported by another student" with no details. |
| SLA tracking | Configurable hours per priority (admin screen), category maximum, live "time left / overdue", average resolution time and % resolved within target. All computed from server timestamps. |
| Timeline | Creation, assignment, status changes, comments, priority changes, reopen, feedback. |
| Feedback | 1-5 stars + comment after resolution; one rating per resolution cycle (a reopened-and-resolved-again complaint can be rated once more). |
| Search & filters | Server-side search, filters by category, status, priority, department, assigned staff, date range, overdue; sorting; pagination. |
| Analytics | Recharts: status, category, monthly trend, department workload; tables for department performance and staff workload; CSV export of department report. All numbers come from the database. |
| Notifications | Bell dropdown with unread count, full page, mark one / all read. |
| Admin | Users (create staff/admin, change role/department, disable), departments, categories, SLA settings, reports, feedback. Safeguards: cannot disable/demote yourself or the last admin. |
| UI | Responsive sidebar/mobile drawer, skeleton loaders, empty/error states, confirmation dialogs, toasts, accessible forms and focus states. |

## 2. Architecture and folder structure

```
campuscare/
├── backend/                      Express API (separate Vercel project)
│   ├── api/index.js              Vercel serverless entry (exports the Express app)
│   ├── vercel.json               Routes everything to the function
│   ├── src/
│   │   ├── app.js                Express app: helmet, CORS, CSRF guard, routes, errors
│   │   ├── server.js             Local server (npm run dev / start)
│   │   ├── config/               env validation (zod), cached Mongo connection, Cloudinary
│   │   ├── models/               User, Complaint, ComplaintHistory, Department, Category,
│   │   │                         Notification, Feedback, Counter, Setting
│   │   ├── middleware/           auth (JWT cookie + RBAC), validate, security, upload, error
│   │   ├── controllers/ routes/ validators/
│   │   ├── services/             complaint helpers, analytics
│   │   ├── utils/                workflow, priority rules, SLA, constants
│   │   └── scripts/              seedAdmin.js, seedDemo.js (development only)
│   └── tests/                    Vitest: unit + API integration tests
├── frontend/                     React app (separate Vercel project)
│   ├── vercel.json               SPA rewrite so refreshes on /admin/... work
│   └── src/ components/ pages/ context/ hooks/ lib/
└── package.json                  Convenience scripts
```

**Design decisions**

- **Stateless backend.** No local files, no in-memory queues. The Mongo connection promise is cached on `globalThis` and reused across warm serverless invocations.
- **Auth.** A short-lived (8 h) JWT is stored in an `HttpOnly`, `Secure` (production) cookie. On every request the user is re-loaded from the database, so disabling an account or changing a role takes effect immediately. The role is never read from the token or request body.
- **CSRF.** Cookie auth needs CSRF protection. Every non-GET request must carry `X-Requested-With: CampusCare` (the frontend client adds it) and, if an `Origin` header is present, it must be in `FRONTEND_URL`. CORS only allows those origins, so a foreign site cannot send the custom header.
- **Complaint numbers** come from an atomic per-year counter; the unique index is the final guard and creation retries on a collision.
- **Images** are uploaded to Cloudinary from memory (never to disk), limited to 3 MB, and validated by magic bytes (JPG/PNG/WebP), not by file extension. Uploads are optional.

## 3. Prerequisites

- Node.js 20 or newer (tested with Node 22) and npm
- A free [MongoDB Atlas](https://www.mongodb.com/atlas) account (or a local MongoDB for development)
- Optional: a free [Cloudinary](https://cloudinary.com) account for photo uploads
- A GitHub account and a Vercel account for deployment

## 4. Local setup

```bash
git clone <your-repo-url> campuscare && cd campuscare
npm run install:all                     # installs backend + frontend dependencies

cp backend/.env.example  backend/.env   # then edit (see section 6)
cp frontend/.env.example frontend/.env  # VITE_API_BASE_URL=http://localhost:5000/api

npm run seed:admin                      # creates the admin + default categories/departments
npm run dev:backend                     # API on http://localhost:5000
npm run dev:frontend                    # app on http://localhost:5173   (second terminal)
```

Optional demo data (development only, refuses to run with `NODE_ENV=production`):

```bash
npm run seed:demo
```

It creates clearly labelled demo accounts (`demo.admin@campuscare.test`, `demo.staff.it@campuscare.test`, `demo.student1@campuscare.test`, ... all with the password `Demo@12345`) and 8 sample complaints in different statuses, including an overdue one. **Never run it against a real/production database.**

### Commands

| Command (from repo root) | What it does |
| --- | --- |
| `npm run install:all` | Install both packages |
| `npm run dev:backend` / `dev:frontend` | Start dev servers |
| `npm run build` | Production build of the frontend (`frontend/dist`) |
| `npm test` | Backend tests (see section 8) |
| `npm run seed:admin` | Create admin from `ADMIN_*` env vars + default data |
| `npm run seed:demo` | Demo accounts and sample complaints (dev only) |

## 5. MongoDB Atlas setup

1. Create a free **M0** cluster at <https://cloud.mongodb.com>.
2. **Database Access → Add New Database User**: username + strong password, role *Read and write to any database* (or restrict to the `campuscare` database).
3. **Network Access → Add IP Address**. For local development add your IP. For Vercel, serverless functions have no fixed IP, so you must allow `0.0.0.0/0`; the database user's strong password is then your protection.
4. **Connect → Drivers** and copy the connection string. Replace `<password>` and add the database name before the `?`:
   `mongodb+srv://USER:PASSWORD@cluster0.xxxxx.mongodb.net/campuscare?retryWrites=true&w=majority`
   (URL-encode special characters in the password.)
5. Collections and indexes are created automatically by Mongoose on first use.

## 6. Environment variables

**backend/.env** (never commit; on Vercel set these in *Project → Settings → Environment Variables*)

| Variable | Required | Description |
| --- | --- | --- |
| `MONGODB_URI` | yes | Atlas connection string |
| `JWT_SECRET` | yes | ≥ 32 random characters. `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"` |
| `FRONTEND_URL` | yes | Exact frontend origin(s), comma-separated, no trailing slash (e.g. `https://campuscare.vercel.app`). Used for CORS and the CSRF origin check. |
| `NODE_ENV` | yes in prod | `production` on Vercel (enables `Secure` cookies) |
| `PORT` | no | Local port, default 5000 |
| `JWT_EXPIRES_IN_HOURS` | no | Session length, default 8 |
| `COOKIE_SAMESITE` | no | `lax` / `strict` / `none`. Default `none` in production, `lax` in development |
| `COOKIE_DOMAIN` | no | Only for sharing cookies across subdomains of your own domain |
| `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` | no | Enable photo uploads. Without them complaints work without images. |
| `ADMIN_NAME`, `ADMIN_EMAIL`, `ADMIN_PASSWORD` | local only | Read by `seed:admin`. Password ≥ 10 characters with a letter and a number. Do not set on Vercel. |

**frontend/.env**

| Variable | Description |
| --- | --- |
| `VITE_API_BASE_URL` | Backend base URL including `/api`, e.g. `http://localhost:5000/api` or `https://campuscare-api.vercel.app/api`. Falls back to `/api` (same-origin). Only this public value ever reaches the browser. |

The backend validates its environment at startup and refuses to start with a clear message if something is missing.

## 7. Creating the first admin

```bash
# backend/.env contains MONGODB_URI (Atlas), ADMIN_NAME, ADMIN_EMAIL, ADMIN_PASSWORD
npm run seed:admin
```

- Run it **from your own computer**, pointing `MONGODB_URI` at the database you want (including your Atlas production database). It never runs on Vercel.
- It will not overwrite an existing user and it refuses `NODE_ENV=production`.
- Remove `ADMIN_PASSWORD` from your `.env` afterwards.
- The admin then creates staff accounts under **Users → Add staff / admin**.

## 8. Tests

```bash
npm test
```

- `tests/unit.test.js` (11 tests): priority rules, SLA maths, workflow transitions, image magic-byte check, request schemas.
- `tests/api.test.js` (29 tests): registration/login/cookies, role forced to student, NoSQL-injection rejection, CSRF header, disabled accounts, complaint creation and **concurrent reference uniqueness**, duplicate warning privacy, student isolation, staff scope, assignment, mandatory resolution comment, timeline, notifications, feedback rules and reopen cycle, overdue SLA, priority override, SLA settings validation, analytics totals, admin safeguards, user/department/category management, JSON 404s without stack traces.
- By default the API tests start an in-memory MongoDB with `mongodb-memory-server` (it downloads a `mongod` binary on first run, so it needs internet access). To use an existing server instead, set `MONGODB_TEST_URI=mongodb://127.0.0.1:27017`. Tests use their own throw-away database.

## 9. API documentation

Base path `/api`. Responses use `{ success, message, data, pagination? }`; errors use `{ success: false, message, errors? }`. All non-GET requests need the header `X-Requested-With: CampusCare`. All routes except `register`, `login`, `logout` and `health` require the session cookie.

| Method & path | Roles | Purpose |
| --- | --- | --- |
| `GET /health` | public | Liveness check |
| `POST /auth/register` | public | Create a **student** account (role cannot be chosen) |
| `POST /auth/login` | public | Log in, sets cookie (20 attempts / 15 min / IP) |
| `POST /auth/logout` | any | Clear cookie |
| `GET /auth/me` | any | Current user |
| `PATCH /auth/me` | any | Update name, phone, or password (`currentPassword` + `newPassword`) |
| `GET /meta` | any | Active categories, departments, SLA hours (+ staff list for admins) |
| `GET /dashboard` | student, staff | Scoped statistics and recent complaints |
| `GET /complaints/precheck?category&location&title&description` | student | Suggested priority with reasons + duplicate warnings |
| `POST /complaints` | student | Create (JSON or multipart with `image`) |
| `GET /complaints` | any (scoped) | List. Query: `page, limit(≤50), search, status, priority, category, department, assignedTo (id\|me\|unassigned), from, to, overdue, sort(newest\|oldest\|due\|updated), scope(open\|done)` |
| `GET /complaints/:id` | owner, assigned staff / their department, admin | Detail + history + feedback + allowed actions |
| `PATCH /complaints/:id` | student (own, while Submitted: title/description/location) · staff (notes) · admin (priority override, `targetHours`, notes) | Update |
| `PATCH /complaints/:id/status` | student (cancel), staff, admin | Status transition `{status, comment}` |
| `PATCH /complaints/:id/assign` | admin | `{departmentId?, staffId?, comment?}` |
| `POST /complaints/:id/comments` | anyone with access | Add comment |
| `POST /complaints/:id/reopen` | owner | `{reason}`, within 7 days of resolution |
| `POST /complaints/:id/feedback` | owner | `{rating 1-5, comment?}` |
| `DELETE /complaints/:id` | owner (cancelled) · admin (cancelled/rejected) | Delete with history |
| `GET /notifications`, `GET /notifications/unread-count`, `PATCH /notifications/:id/read`, `PATCH /notifications/read-all` | any | Own notifications only |
| `GET /admin/dashboard`, `GET /admin/reports?from&to` | admin | Analytics |
| `GET /admin/users`, `POST /admin/users`, `PATCH /admin/users/:id` | admin | Manage users (create staff/admin, role, department, enable/disable) |
| `GET/POST /admin/departments`, `PATCH /admin/departments/:id` | admin | Departments |
| `GET/POST /admin/categories`, `PATCH /admin/categories/:id` | admin | Categories |
| `GET/PATCH /admin/sla-settings` | admin | Hours per priority (`critical ≤ high ≤ medium ≤ low`) |
| `GET /admin/feedback` | admin | Ratings, distribution and reviews |

**Allowed status transitions**

| Role | From → To |
| --- | --- |
| Student | Submitted/Under Review → Cancelled. Reopen is a separate action |
| Staff (own or unclaimed department complaints) | Assigned → In Progress · In Progress → Resolved (comment required) · Reopened → In Progress |
| Admin | Submitted → Under Review/Rejected · Under Review → Rejected · Assigned → In Progress/Under Review · In Progress → Resolved · Resolved → Closed · Reopened → Under Review/In Progress. *Assigned* happens through the assign action. |

## 10. Deploying to Vercel (two projects)

1. Push the repository to GitHub (`.env` files are git-ignored).
2. **Backend project** - Vercel → *Add New → Project* → import the repo:
   - **Root Directory:** `backend`
   - **Framework Preset:** Other
   - **Build Command:** leave empty · **Output Directory:** leave empty · **Install Command:** `npm install`
   - **Environment Variables:** `MONGODB_URI`, `JWT_SECRET`, `NODE_ENV=production`, `FRONTEND_URL` (put a placeholder now), optional Cloudinary variables.
   - Deploy, then open `https://<backend>.vercel.app/api/health` - you should see `"db": true`.
3. **Frontend project** - add another project from the same repo:
   - **Root Directory:** `frontend`
   - **Framework Preset:** Vite · **Build Command:** `npm run build` · **Output Directory:** `dist`
   - **Environment Variable:** `VITE_API_BASE_URL=https://<backend>.vercel.app/api`
   - Deploy. `frontend/vercel.json` rewrites all routes to `index.html`, so refreshing `/admin/users` works.
4. Go back to the backend project, set `FRONTEND_URL=https://<frontend>.vercel.app` (exact origin, no trailing slash), and **redeploy** the backend.
5. From your computer run `npm run seed:admin` against the Atlas URI, then log in.

### Recommended: make the API same-origin (fixes Safari / strict cookie settings)

`*.vercel.app` projects are different "sites", so the session cookie is a third-party cookie (`SameSite=None; Secure`). Chrome and Firefox accept this by default, but **Safari and some privacy settings block it, which looks like "login works, then I'm logged out"**. The reliable fix is to proxy the API through the frontend domain (or, better, use your own custom domain for both):

1. In `frontend/vercel.json` add this rewrite **above** the existing one (replace the host):
   ```json
   { "source": "/api/:path*", "destination": "https://<backend>.vercel.app/api/:path*" }
   ```
2. Set the frontend env var `VITE_API_BASE_URL=/api`, redeploy the frontend.
3. Keep `FRONTEND_URL` as the frontend origin. Cookies are now first-party.

## 11. Troubleshooting

| Symptom | Cause / fix |
| --- | --- |
| Backend exits with "Invalid or missing environment variables" | Fill `backend/.env`; `JWT_SECRET` must be ≥ 32 chars |
| `MongooseServerSelectionError` | Wrong URI/password, or your IP is not in Atlas **Network Access** (use `0.0.0.0/0` for Vercel) |
| Browser: CORS error | `FRONTEND_URL` must exactly equal the page origin (scheme + host, no trailing slash); redeploy the backend after changing it |
| `403 Missing CSRF header` | A custom client must send `X-Requested-With: CampusCare` on POST/PATCH/DELETE |
| Login succeeds, then 401 on the next request | Cross-site cookie blocked: use the same-origin proxy above, or test in Chrome. Locally, keep both apps on `localhost` |
| `Too many attempts` on login | Auth rate limit. Wait 15 minutes. (The limiter is in-memory per serverless instance, so on Vercel it is best-effort; use an external store such as Upstash for strict limits) |
| Image upload says "not configured" | Add the three `CLOUDINARY_*` variables; photos are optional |
| 404 when refreshing a page on Vercel | The frontend project needs its Root Directory set to `frontend` so `vercel.json` is applied |
| `npm test` hangs on first run | `mongodb-memory-server` is downloading `mongod`; or set `MONGODB_TEST_URI` |
| Seeding says it refuses to run | You have `NODE_ENV=production` set; run it locally without it |

## 12. Known limitations

- The login rate limiter is in-memory per serverless instance, so on Vercel it is best-effort (see Troubleshooting).
- Email/SMS notifications are not implemented; notifications are in-app and refresh every 60 seconds (no websockets, because the backend is stateless).
- Password reset by email is not implemented; an admin can create a replacement account, or you can reset a hash directly in the database.
- Uploaded photos live in Cloudinary and are not deleted when a complaint is deleted.
- Light theme only.
