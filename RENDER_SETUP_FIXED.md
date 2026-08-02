# NeuroPath Render Deployment Guide (Fixed)

## Quick Deploy

### Backend Service (FastAPI)
1. **New Web Service**
   - Name: `neuropath-backend`
   - GitHub repo: `BharathWaj-K-R/NeuroPath`
   - Branch: `main`
   - Build Command: `pip install -r api/requirements.txt`
   - Start Command: `cd api && uvicorn app:app --host 0.0.0.0 --port 8000`
   - Plan: Free

2. **Environment Variables**
   ```
   DATABASE_URL=mysql+pymysql://user:pass@host:3306/neuropath
   JWT_SECRET_KEY=<random-32-chars>
   GROK_API_KEY=<your-grok-key>
   ENVIRONMENT=production
   DEBUG=false
   FRONTEND_URL=https://neuropath-frontend.onrender.com
   ```

### Frontend Service (Static HTML/CSS/JS)
1. **New Static Site**
   - Name: `neuropath-frontend`
   - GitHub repo: `BharathWaj-K-R/NeuroPath`
   - Branch: `main`
   - Publish directory: `frontend/public`
   - Build Command: (leave blank or `echo 'Static'`)

### Database
- MySQL database with connection string → DATABASE_URL

## Post-Deploy Testing

1. Backend health: `curl https://neuropath-backend.onrender.com/api/health`
   - Expected: `{"status":"healthy"}`

2. Frontend loads: `https://neuropath-frontend.onrender.com`
   - Should show login page (white theme, purple accents)

3. Register → Login → Generate Path flow

## How Frontend Works

- **Pure HTML/CSS/JS** (no build step needed)
- Served from Render Static Site (CDN-backed)
- Calls backend API via `/api` (relative URL)
- Works offline (service worker + localStorage)
- ~960 bytes JS + 254 bytes CSS = super fast

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Frontend blank page | Check browser console, verify API URL, clear localStorage |
| 404 on assets | Ensure `frontend/public/` contains `index.html`, `app.js`, `styles.css` |
| API 502 | Backend crashed, check backend logs + env vars |
| Login fails | Check JWT_SECRET_KEY, verify database connected |
| CORS errors | Backend CORS includes frontend URL |

