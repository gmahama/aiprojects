# Railway Deployment Guide

This guide walks through deploying the CRM MVP on Railway.

## Prerequisites

- Railway account (https://railway.app)
- Railway CLI (optional): `npm install -g @railway/cli`

## Architecture

The app consists of 3 services:
1. **PostgreSQL** - Database (provisioned by Railway)
2. **API** - FastAPI backend (`/api`)
3. **Web** - Next.js frontend (`/web`)

## Deployment Steps

### 1. Create a New Project on Railway

1. Go to https://railway.app/new
2. Click "Empty Project"

### 2. Add PostgreSQL Database

1. Click "Add Service" → "Database" → "PostgreSQL"
2. Railway will provision a PostgreSQL instance
3. Note: Railway automatically creates `DATABASE_URL` variable

### 3. Deploy the API Service

1. Click "Add Service" → "GitHub Repo"
2. Select your repository
3. Configure the service:
   - **Root Directory**: `api`
   - **Build Command**: (uses Dockerfile automatically)

4. Add environment variables:
   ```
   DATABASE_URL     → Reference the PostgreSQL service variable
   CORS_ORIGINS     → https://your-web-service.up.railway.app
   ```

5. After deploy, note the generated domain (e.g., `api-production-xxxx.up.railway.app`)

### 4. Deploy the Web Service

1. Click "Add Service" → "GitHub Repo" (same repo)
2. Configure the service:
   - **Root Directory**: `web`
   - **Build Command**: (uses Dockerfile automatically)

3. Add build arguments:
   ```
   NEXT_PUBLIC_API_URL → https://your-api-service.up.railway.app
   ```

4. Generate a domain for public access

### 5. Update CORS After Both Services Are Live

1. Go back to the API service
2. Update `CORS_ORIGINS` with the actual web service URL
3. Redeploy the API

## Environment Variables Reference

### API Service
| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `${{Postgres.DATABASE_URL}}` |
| `CORS_ORIGINS` | Allowed origins (comma-separated) | `https://web-prod.up.railway.app` |
| `PORT` | Server port (set automatically by Railway) | `8000` |

### Web Service
| Variable | Description | Example |
|----------|-------------|---------|
| `NEXT_PUBLIC_API_URL` | API base URL (build-time) | `https://api-prod.up.railway.app` |

## Running Database Migrations

After deploying the API, run migrations:

1. Open the API service in Railway dashboard
2. Go to "Settings" → "Deploy" → "Run Command"
3. Add a one-time command:
   ```bash
   alembic upgrade head
   ```

Or use Railway CLI:
```bash
railway run -s api alembic upgrade head
```

## Custom Domains

1. Go to service settings → "Domains"
2. Add your custom domain
3. Configure DNS records as instructed

## Monitoring

- View logs in the Railway dashboard
- Health endpoint: `GET /health`

## Troubleshooting

### API can't connect to database
- Ensure `DATABASE_URL` references the PostgreSQL service correctly
- Check that PostgreSQL is running and healthy

### CORS errors in browser
- Update `CORS_ORIGINS` in API service to match your web domain
- Redeploy the API after changing CORS settings

### Web shows API errors
- Verify `NEXT_PUBLIC_API_URL` points to the correct API domain
- Rebuild the web service if you changed the URL (it's a build-time variable)
