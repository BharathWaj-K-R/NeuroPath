# NeuroPath Deployment Checklist

## Pre-Deployment

### 1. Local Testing
- [ ] Backend runs: `cd api && python app.py`
- [ ] Frontend runs: `cd frontend && npm run dev`
- [ ] Login/Register flow works
- [ ] API endpoints respond (http://localhost:8000/api/health)
- [ ] Lovable frontend integrated into `frontend/src/`

### 2. Environment Setup
- [ ] `.env` file created (copy from `.env.example`)
- [ ] `DATABASE_URL` set (MySQL connection string)
- [ ] `JWT_SECRET_KEY` generated (`openssl rand -base64 32`)
- [ ] `GEMINI_API_KEY` obtained from Google MakerSuite
- [ ] All secrets NOT committed to GitHub

### 3. GitHub Push
- [ ] All changes committed
- [ ] Pushed to `main` branch
- [ ] Repo is public (or Render has access)

## Render Deployment

### 1. Backend Service Setup
- [ ] Visit https://dashboard.render.com
- [ ] Create Web Service → Connect GitHub
- [ ] Select `BharathWaj-K-R/NeuroPath` repo
- [ ] Name: `neuropath-backend`
- [ ] Branch: `main`
- [ ] Build Cmd: `pip install -r api/requirements.txt`
- [ ] Start Cmd: `cd api && uvicorn app:app --host 0.0.0.0 --port 8000`
- [ ] Plan: Free
- [ ] Add env vars:
  - [ ] `DATABASE_URL`
  - [ ] `JWT_SECRET_KEY`
  - [ ] `GEMINI_API_KEY`
  - [ ] `ENVIRONMENT=production`
  - [ ] `DEBUG=false`
  - [ ] `FRONTEND_URL=https://neuropath-frontend.onrender.com`
- [ ] Deploy
- [ ] Wait for build to complete (5-10 min)
- [ ] Note backend URL: `https://neuropath-backend.onrender.com`

### 2. Frontend Service Setup
- [ ] Create another Web Service
- [ ] Select same repo
- [ ] Name: `neuropath-frontend`
- [ ] Branch: `main`
- [ ] Build Cmd: `cd frontend && npm install && npm run build`
- [ ] Start Cmd: `cd frontend && npm run preview`
- [ ] Plan: Free
- [ ] Add env var:
  - [ ] `VITE_API_URL=https://neuropath-backend.onrender.com`
- [ ] Deploy
- [ ] Wait for build (3-5 min)
- [ ] Note frontend URL: `https://neuropath-frontend.onrender.com`

### 3. Database Setup (if not already provisioned)
- [ ] MySQL database created + accessible
- [ ] DB name: `neuropath`
- [ ] User credentials set
- [ ] Connection string in `DATABASE_URL`

## Post-Deployment Testing

### 1. Health Checks
- [ ] Backend health: `curl https://neuropath-backend.onrender.com/api/health`
  - Expected: `{"status":"healthy"}`
- [ ] Frontend loads: visit `https://neuropath-frontend.onrender.com`

### 2. API Tests
- [ ] Register new user
  - POST `/api/auth/register`
  - Body: `{"email":"test@test.com","password":"test123","full_name":"Test User"}`
- [ ] Login with new user
  - POST `/api/auth/login`
  - Body: `{"email":"test@test.com","password":"test123"}`
  - Get `access_token`
- [ ] Create learning path
  - POST `/api/learning-paths`
  - Header: `Authorization: Bearer {token}`
  - Body: `{"topic":"Python","difficulty_level":"beginner"}`
- [ ] Generate AI path
  - POST `/api/ai/generate-path`
  - Header: `Authorization: Bearer {token}`
  - Body: `{"topic":"Web Development","difficulty_level":"intermediate","goals":"Build a REST API"}`

### 3. Frontend Flow
- [ ] Login form appears
- [ ] Can register + login
- [ ] Dashboard shows after login
- [ ] Can generate learning path
- [ ] AI response appears

### 4. Logs Check
- [ ] Backend logs (Render → service → Logs)
  - No 500 errors
  - No CORS errors
  - DB connection successful
- [ ] Frontend logs (Browser DevTools)
  - No API fetch errors
  - Authorization header sent

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Build fails | Check logs, verify build command syntax, ensure Python version |
| API 502 error | Backend crashed, check logs, verify env vars, DB connection |
| CORS error | Check backend CORS origins, verify frontend URL |
| Login fails | Check JWT_SECRET_KEY, verify DB connectivity |
| Blank page | Check frontend build, verify VITE_API_URL, check browser console |
| Slow deployment | Free tier can be slow, patience needed |

## Monitoring

- [ ] Render Dashboard: https://dashboard.render.com
- [ ] Check service health regularly
- [ ] Monitor logs for errors
- [ ] Test endpoints periodically

## Auto-Redeploy on Push

Once deployed:
- Any push to `main` auto-triggers rebuild
- Both services redeploy simultaneously
- Zero downtime (if possible)
- Check Render Dashboard for deploy status

## Production Considerations (Future)

- [ ] Upgrade to paid plans for reliability
- [ ] Add error monitoring (Sentry, etc)
- [ ] Set up logging pipeline
- [ ] Configure backup for MySQL
- [ ] Add rate limiting
- [ ] SSL/TLS (auto on Render)
- [ ] CDN for frontend static assets
- [ ] Database query optimization
