# Zuvigo

Professional Notion-inspired SaaS workspace (Next.js 16 + MySQL + Redis + DigitalOcean Spaces).

## Setup

1. Copy env:

```bash
cp .env.example .env.local
```

2. Fill MySQL, Redis, `AUTH_SECRET`, and DigitalOcean Spaces values.

3. Install & migrate:

```bash
npm install
npm run db:migrate
```

4. Run app (and optionally the worker):

```bash
npm run dev
npm run worker
```

5. Open `http://localhost:3000` — sign up creates a user + default workspace in MySQL.

## Client demo

Seed a polished showcase workspace (projects, tasks, subtasks, tags, comments, pages):

```bash
npm run db:migrate
npm run db:seed
```

Then open `http://localhost:3000/login`:

| | |
|---|---|
| Email | `demo@zuvigo.test` |
| Password | `Demo1234!` |
| Workspace | `/w/acme-demo` |

Teammates (same password): `alex@zuvigo.test`, `sam@zuvigo.test`. Re-run `npm run db:seed` anytime to reset the demo.

## Production (EC2 + nginx + PM2)

This app is a **Next.js monolith** — UI, Server Actions, and `/api/*` all run in one process. There is **no separate API server**. nginx proxies `https://todo.zuvigo.com` → `127.0.0.1:3017` (port **3017** avoids clashes with other PM2 apps on `:3000`).

### 1. Server prep

- Node 20+, nginx, MySQL, PM2 (`npm i -g pm2`)
- DNS: `todo.zuvigo.com` A-record → EC2 IP; security group **80/443** (not 3306)
- Create DB user (not root):

```sql
CREATE DATABASE zuvigotodo CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'zuvigo'@'127.0.0.1' IDENTIFIED BY 'STRONG_PASSWORD_HERE';
GRANT ALL ON zuvigotodo.* TO 'zuvigo'@'127.0.0.1';
FLUSH PRIVILEGES;
```

### 2. App + env

```bash
cd /var/www/zuvigotodo   # or your deploy path
git clone <repo> .
npm ci
cp .env.example .env.local
# edit .env.local — required:
#   APP_URL=https://todo.zuvigo.com
#   NODE_ENV=production
#   AUTH_SECRET=$(openssl rand -base64 48)
#   DATABASE_* + DO_SPACES_*
```

### 3. Migrate (production-safe) + build

```bash
npm run db:migrate   # idempotent; only applies new migrations
# optional staging demo: npm run db:seed
npm run build
```

### 4. PM2

```bash
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup
curl -s http://127.0.0.1:3017/api/health
```

### 5. nginx + TLS

```bash
sudo cp deploy/nginx.todo.zuvigo.com.conf /etc/nginx/sites-available/todo.zuvigo.com
sudo ln -sf /etc/nginx/sites-available/todo.zuvigo.com /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d todo.zuvigo.com
```

After certbot, confirm HTTPS loads and `https://todo.zuvigo.com/api/health` is OK.

### 6. Redeploy updates

```bash
cd /var/www/zuvigotodo
git pull
npm ci
npm run db:migrate
npm run build
pm2 restart zuvigo-todo
```

## Architecture

- `modules/` — domain services/repositories
- `infrastructure/` — MySQL, Redis, Spaces, queue, email/AI stubs
- `shared/` — errors, logger, pagination, cache, rate-limit
- `app/` — UI + route handlers

Phase 1–2 is production-complete for auth, workspaces, RBAC, files (Spaces), and the app shell. Pages/editor DnD, tasks, AI, billing are scaffolded with real schema and honest empty states.
