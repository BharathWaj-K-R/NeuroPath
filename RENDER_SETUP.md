# NeuroPath Render Deployment Guide

## Quick Deploy (One-Click Blueprint)

1. Go to [Render Blueprints](https://dashboard.render.com/blueprints)
2. Click "New Blueprint"
3. Connect GitHub → select `BharathWaj-K-R/NeuroPath`
4. Upload `render-blueprint.json` or paste config
5. Fill required env vars (see below)
6. Deploy

## Manual Setup (Step-by-Step)

### Service 1: Backend (FastAPI)

1. **New Web Service**
   - Name: `neuropath-backend`
   - GitHub repo: `BharathWaj-K-R/NeuroPath`
   - Branch: `main`
   - Build Command: `pip install -r api/requirements.txt`
   - Start Command: `cd api && uvicorn app:app --host 0.0.0.0 --port 8000`
   - Plan: Free

2. **Environment Variables**
   ```
   DATABASE_URL=mysql+pymysql://user:pass@mysql-host:3306/neuropath
   JWT_SECRET_KEY=your-random-secret-key-min-32-chars
   GROK_API_KEY=your-google-gemini-api-key
   ENVIRONMENT=production
   DEBUG=false
   FRONTEND_URL=https://neuropath-frontend.onrender.com
   ```

### Service 2: Frontend (React)

1. **New Web Service**
   - Name: `neuropath-frontend`
   - GitHub repo: `BharathWaj-K-R/NeuroPath`
   - Branch: `main`
   - Build Command: `cd frontend && npm install && npm run build`
   - Start Command: `cd frontend && npm run preview`
   - Plan: Free

2. **Environment Variables**
   ```
   VITE_API_URL=https://neuropath-backend.onrender.com
   ```

## Environment Variables Details

### Backend (.env)
- **DATABASE_URL**: MySQL connection string
  - Format: `mysql+pymysql://username:password@host:port/database`
  - Example: `mysql+pymysql://admin:pass123@sql.c.neuropath.internal:3306/neuropath`
  
- **JWT_SECRET_KEY**: Secret for JWT signing
  - Generate: `openssl rand -base64 32`
  - Min 32 chars, keep safe
  
- **GROK_API_KEY**: Grok API key
  - Get from: https://console.x.ai/app/apikey
  - Requires billing enabled

- **FRONTEND_URL**: Frontend service URL
  - Format: `https://neuropath-frontend.onrender.com`

### Frontend (.env)
- **VITE_API_URL**: Backend API endpoint
  - Value: `https://neuropath-backend.onrender.com`

## Database Setup (MySQL on Render)

1. Create new MySQL database on Render or use external DB
2. DB name: `neuropath`
3. User: create admin user
4. Get connection string → add to `DATABASE_URL`

## Deployment Checklist

- [ ] GitHub repo connected
- [ ] Backend service created + env vars set
- [ ] Frontend service created + env vars set
- [ ] MySQL database provisioned + connection verified
- [ ] GROK_API_KEY configured
- [ ] JWT_SECRET_KEY generated
- [ ] Services deployed (auto-builds on push to main)
- [ ] Health check: `https://neuropath-backend.onrender.com/api/health`
- [ ] Frontend accessible: `https://neuropath-frontend.onrender.com`

## Post-Deploy

1. Test API health endpoint
2. Try register/login flow
3. Check browser console for CORS/API errors
4. Monitor logs in Render dashboard

## Auto-Deploy on Push

Once set up, pushing to `main` branch auto-triggers:
- Backend rebuild + redeploy
- Frontend rebuild + redeploy

## Troubleshooting

**Service won't start**
- Check logs: Render Dashboard → service → Logs tab
- Verify env vars set correctly
- Check build command syntax

**CORS errors**
- Backend CORS origins include frontend URL
- Check `api/app.py` for CORS middleware config

**API calls fail**
- Verify `VITE_API_URL` matches backend service URL
- Check network tab → request headers (Bearer token)

**Database connection fails**
- Verify `DATABASE_URL` format
- Test connection locally first
- Check MySQL service is running

## Render Links
- Dashboard: https://dashboard.render.com
- Blueprints: https://dashboard.render.com/blueprints
- Docs: https://render.com/docs
