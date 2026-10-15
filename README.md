# CareFlow

CareFlow is a compact, production-minded clinic operations dashboard for managing patients, doctors, and appointments. It is a modular monolith designed as the application foundation for Docker, Kubernetes, CI/CD, logging, monitoring, and deployment exercises.

> **Demonstration software only.** CareFlow includes role-based authentication, but it has not been audited for healthcare compliance. Do not expose it publicly or use real patient information. Use synthetic data only.

## Features

- Live dashboard metrics, today's schedule, recent registrations, and appointment status chart
- Administrator and doctor logins using signed JWT bearer tokens that expire after 48 hours
- Searchable, paginated patient CRUD, appointment history, validation, and safe deletion rules
- Searchable doctor directory with per-doctor accounts, working hours, CRUD, and relationship protection
- Appointment scheduling with existing-patient search or inline patient registration, plus date/status filters, editing, status transitions, and cancellation
- Doctor dashboards for viewing appointments, managing weekly hours and time off, and marking elapsed appointments complete
- Schedule protection for working hours, doctor time off, and overlapping appointments using service validation, per-doctor transaction locks, and a PostgreSQL exclusion constraint
- Separate `GET /health` liveness and database-aware `GET /ready` readiness probes
- Responsive React UI with loading, empty, error, confirmation, and validation states
- Idempotent, deterministic synthetic development seed

## Architecture

The FastAPI backend follows route → service → repository → SQLAlchemy model separation. Routes own HTTP contracts, services enforce business rules and transaction boundaries, and repositories contain query logic. The React frontend is feature-oriented and uses a single typed API client plus TanStack Query for server state.

PostgreSQL stores the following principal entities:

- `patients` has many `appointments`; deletion is restricted when history exists.
- `doctors` has many `appointments`; deletion is restricted when history exists.
- `appointments` references exactly one patient and doctor. Active statuses are `SCHEDULED` and `CONFIRMED`; terminal statuses are `COMPLETED` and `CANCELLED`.
- `users` contains administrator and doctor credentials. Passwords are Argon2 hashes; doctor users have a one-to-one doctor profile.
- `doctor_working_hours` contains recurring weekly availability windows, while `doctor_time_off` contains dated exceptions.

All persisted datetimes are timezone-aware and stored by PostgreSQL as UTC instants. API clients must send an explicit offset. `CLINIC_TIMEZONE` determines dashboard day boundaries and date-filter interpretation; the browser displays instants in the user's local timezone.

For concurrent scheduling, the service takes a PostgreSQL transaction-scoped advisory lock keyed by doctor, validates working hours and time off, checks true interval overlap (`existing_start < new_end AND existing_end > new_start`), and the database independently enforces a partial GiST exclusion constraint for active appointments. This protects both CareFlow writes and other database clients. The migration requires permission to install the standard `btree_gist` extension.

## Repository layout

```text
backend/
  app/
    api/routes/        HTTP endpoints
    core/              settings, authentication, errors, logging
    db/                metadata and session lifecycle
    models/            SQLAlchemy entities
    schemas/           Pydantic request/response contracts
    repositories/      database queries
    services/          business rules and transactions
    main.py             FastAPI application
    seed.py             deterministic development seed
  alembic/versions/     executable migrations
  tests/                unit and PostgreSQL integration tests
frontend/
  src/app/              router and providers
  src/components/       layout and small shared UI pieces
  src/features/         dashboard, patients, doctors, appointments
  src/lib/              API client and shared types
```

## Prerequisites

- Python 3.12 (3.11+ should also work)
- PostgreSQL 14+ with permission to create `btree_gist` in the application database
- Node.js 20 or 22 LTS and npm

Node 26 was used successfully for the checks recorded below, but an LTS release is recommended for local and CI environments.

## PostgreSQL setup

### Recommended local Docker stack

The repository includes a Compose stack for PostgreSQL, migrations, administrator bootstrap, the API, and the Nginx-served frontend:

```bash
cp .env.example .env
# Replace the placeholder local passwords in .env.
docker compose up --build -d
docker compose ps
```

Open the application at <http://localhost:3000> and the API documentation at <http://localhost:8000/docs>. Sign in with `ADMIN_USERNAME` and `ADMIN_PASSWORD` from the root `.env`. PostgreSQL is published only on the loopback interface at `localhost:55432` because ports 5432 and 5433 may already be used by other local projects. Containers connect to it using the Compose service hostname `db` and internal port 5432.

Alembic runs as a one-shot `migrate` service after PostgreSQL becomes healthy. The one-shot `bootstrap` service then creates or updates the single administrator account before the backend starts. To run all backend tests against the dedicated `careflow_test` database:

```bash
docker compose --profile test run --build --rm test
```

Optional pgAdmin is available through the `tools` profile:

```bash
docker compose --profile tools up -d pgadmin
```

Open <http://localhost:5050> and register a server with hostname `db`, port `5432`, database/user `careflow`, and the password from the root `.env` file.

To stop containers while preserving PostgreSQL data, run `docker compose down`. Adding `--volumes` permanently deletes the local database volume.

Create an application role and database using your normal PostgreSQL administration process. Keep credentials out of Git. A development URL using Psycopg 3 looks like:

```text
postgresql+psycopg://careflow:URL_ENCODED_PASSWORD@localhost:5432/careflow
```

Percent-encode reserved characters in user names and passwords. The role must own the database or otherwise be allowed to create tables, indexes, enum types, and `btree_gist` during the initial migration.

## Backend setup

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate             # Windows PowerShell: .venv\Scripts\Activate.ps1
pip install -r requirements.txt
cp .env.example .env
# Edit DATABASE_URL and local settings in .env
alembic upgrade head
python -m app.bootstrap_admin
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

OpenAPI UI: <http://localhost:8000/docs>  
OpenAPI schema: <http://localhost:8000/openapi.json>

### Migrations

Run all Alembic commands from `backend/`:

```bash
alembic history                         # inspect revision history
alembic current                         # revision applied to this database
alembic revision --autogenerate -m "describe change"
alembic upgrade head
alembic downgrade -1
```

Review autogenerated migrations before applying them. The application does not call `create_all()`; schema changes happen only through Alembic.

### Synthetic seed data

After migrating a development database:

```bash
python -m app.seed
```

The command uses stable UUIDs and `merge`, so rerunning it updates the same synthetic records instead of duplicating them. It is never invoked automatically. The two synthetic doctor logins are `doctor.kapoor` and `doctor.rao`, both with development-only password `Doctor123!`; change or remove these credentials outside local demonstrations.

## Authentication and roles

The login screen is shared by both roles. A successful login stores a bearer token in tab-scoped browser session storage; the token expires after `JWT_EXPIRATION_HOURS` (48 hours by default). Separate tabs can therefore stay signed in as different roles, and closing a tab clears its session. A `401` response signs that tab out. Changing `JWT_SECRET` invalidates every previously issued token.

- `ADMIN` can access the operational dashboard and manage patients, doctors, and appointments. Creating a doctor also creates that doctor's login and initial working hours.
- `DOCTOR` can access only their own dashboard, appointments, working hours, and time-off records. A doctor can mark one of their own active appointments complete only after its scheduled start time.

The root `.env` is for local development only. Use a randomly generated secret and strong passwords in any deployed environment, and supply secrets through the deployment platform rather than committing them.

## Frontend setup

```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

Open <http://localhost:5173>. `VITE_API_BASE_URL` must include `/api/v1`, for example `http://localhost:8000/api/v1`. API URLs are centralized in `src/lib/api-client.ts`.

## API summary

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/health` | Process liveness (`{"status":"ok"}`) |
| GET | `/ready` | PostgreSQL connectivity readiness |
| POST | `/api/v1/auth/login` | Exchange username/password for a 48-hour JWT |
| GET | `/api/v1/auth/me` | Return the authenticated user |
| GET, POST | `/api/v1/patients` | Paginated search and creation |
| GET, PUT, DELETE | `/api/v1/patients/{id}` | Detail, replacement, safe deletion |
| GET | `/api/v1/patients/{id}/appointments` | Patient appointment history |
| GET, POST | `/api/v1/doctors` | Paginated search and creation |
| GET, PUT, DELETE | `/api/v1/doctors/{id}` | Detail, replacement, safe deletion |
| GET, POST | `/api/v1/appointments` | Filtered list and scheduling |
| POST | `/api/v1/appointments/with-new-patient` | Atomically register a patient and schedule their appointment |
| GET, PUT, DELETE | `/api/v1/appointments/{id}` | Detail, replacement, cancellation |
| GET | `/api/v1/dashboard/summary` | Aggregated dashboard data |
| GET | `/api/v1/doctor/dashboard` | Current doctor's appointments and availability |
| PUT | `/api/v1/doctor/working-hours` | Replace current doctor's weekly hours |
| POST, DELETE | `/api/v1/doctor/time-off` | Add or remove current doctor's time off |
| PATCH | `/api/v1/doctor/appointments/{id}/complete` | Complete an elapsed appointment owned by the doctor |

Appointment `DELETE` is a cancellation workflow: it changes an active appointment to `CANCELLED` and returns `204`. Completed records are immutable. A cancelled record is idempotently accepted by DELETE but cannot be edited. Patient and doctor DELETE returns `409` when appointment history exists.

Inline patient registration and appointment creation use one database transaction. If availability validation, collision protection, or the appointment insert fails, the new patient insert is rolled back as well.

All patient, doctor, appointment, and administrator-dashboard endpoints require an administrator token. Doctor-portal endpoints require a doctor token. `/health`, `/ready`, and `/api/v1/auth/login` are public.

## Configuration

| Variable | Default/example | Meaning |
| --- | --- | --- |
| `DATABASE_URL` | `postgresql+psycopg://...` | Required PostgreSQL connection URL |
| `APP_ENV` | `development` | Runtime environment label |
| `LOG_LEVEL` | `INFO` | Python logging level |
| `CORS_ORIGINS` | `["http://localhost:5173"]` | Explicit JSON origin allow-list |
| `CLINIC_TIMEZONE` | `Asia/Kolkata` | IANA clinic timezone |
| `MIN_APPOINTMENT_DURATION` | `15` | Service validation lower bound |
| `MAX_APPOINTMENT_DURATION` | `240` | Service validation upper bound |
| `JWT_SECRET` | no safe default | Secret used to sign access tokens; use at least 32 random characters |
| `JWT_EXPIRATION_HOURS` | `48` | Access-token lifetime; 48 hours is two days |
| `ADMIN_USERNAME` | `admin` | Username created by the bootstrap service |
| `ADMIN_PASSWORD` | no safe default | Password applied to the administrator account by bootstrap |
| `VITE_API_BASE_URL` | `http://localhost:8000/api/v1` | Browser API root |

The database check constraint currently matches the documented 15–240 minute defaults. Changing those bounds also requires a migration so application and database validation remain aligned.

## Tests and verification

Backend fast tests:

```bash
cd backend
.venv/bin/pytest -q
```

PostgreSQL integration tests require a dedicated disposable database whose name contains `test`. This guard prevents accidental use of a normal developer database:

```bash
export TEST_DATABASE_URL='postgresql+psycopg://careflow:careflow@localhost:5432/careflow_test'
.venv/bin/pytest -q
```

The suite migrates that database to `head`, clears only CareFlow-owned tables between cases, and verifies CRUD, authentication, the two-day expiry, role protection, patient history, working hours, time-off blocking, overlap rules, transitions, foreign references, and doctor completion rules.

Frontend checks:

```bash
cd frontend
npm test
npm run build
npm audit --omit=dev --audit-level=high
```

## Troubleshooting

- **`/ready` returns 503:** confirm PostgreSQL is running and `DATABASE_URL` is reachable from the API process.
- **Migration cannot create `btree_gist`:** have a database administrator install the extension once, then rerun `alembic upgrade head`.
- **Browser reports a network error:** start the API, verify `/health`, then check `VITE_API_BASE_URL` and `CORS_ORIGINS`.
- **Login returns 401:** verify the administrator values in `.env`; for a doctor, use the username and password entered when that doctor was created.
- **Appointment returns 409:** the doctor is disabled, outside working hours, on time off, already booked during that interval, or the requested status transition is not permitted.
- **Changed PostgreSQL credentials do not take effect:** the official image initializes credentials only for an empty volume. For disposable local data, run `docker compose down --volumes`, then start the stack again.
- **Integration tests skip:** set `TEST_DATABASE_URL` to a dedicated database containing `test` in its name.

## Current limitations

- No refresh tokens, password-reset/change flow, login rate limiting, audit trail, encryption policy, backup automation, or healthcare compliance controls.
- Single-clinic design; no tenancy, recurring visits, billing, prescriptions, medical records, or reminders.
- Patient/doctor deletion intentionally preserves any entity with appointment history; there is no archival UI yet.
- List selectors load up to 100 patients/doctors, appropriate for this demonstration scope but not a large clinic.
- Backend integration and migration execution require a running PostgreSQL instance; SQLite is deliberately not used as a substitute.

## Infrastructure decision record

### EKS worker instance compromise — 14 October 2026

The original deployment requirement specified two `t3.medium` EKS worker nodes. During the first Terraform apply, AWS rejected the managed node group because `t3.medium` is not eligible under this account's Free Plan. The deployment therefore uses two `m7i-flex.large` x86_64 workers, which AWS reported as Free Tier eligible for this account and which fit its five-vCPU EC2 On-Demand quota.

This preserves the intended two-worker EKS architecture and provides sufficient memory for CareFlow and the monitoring stack, but it does not satisfy a rubric that requires the literal `t3.medium` instance type. If that exact type becomes mandatory, the account must first be moved to a plan that permits it, the cost impact must be approved, and `terraform/main.tf`, `STEPS.md`, and the deployment evidence must be updated together.

The same account policy explicitly denies creation of IAM OIDC providers, so IRSA is disabled. The EBS CSI controller receives its required AWS permissions through a dedicated EKS Pod Identity role instead; this avoids the blocked OIDC operation and avoids exposing the worker-node IAM role to controller pods through EC2 instance metadata.

## DevOps extension path

The next recommended step is to run the existing container builds, health probes, migrations, integration tests, frontend tests/build, and dependency audit in GitHub Actions. Kubernetes manifests, secret management, observability, backup validation, and deployment promotion can follow without changing the modular application boundary.
