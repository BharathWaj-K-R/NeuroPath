# PostgreSQL Connection Fix for Render

## ⚠️ CRITICAL: Internal vs External Link

Your database connection is FAILING because you're using the INTERNAL link.

### The Problem

**Internal Link** (WRONG):
```
postgresql://neuropath_s6s3_user:PASSWORD@dpg-d9nd6061egvs73frc7qg-a/neuropath_s6s3
```
- Only works INSIDE Render's private network
- Backend service CANNOT reach it externally
- Results in: `Connection refused` or `Host not found` errors

**External Link** (CORRECT):
```
postgresql://neuropath_s6s3_user:PASSWORD@dpg-d9nd6061egvs73frc7qg-a.onrender.com/neuropath_s6s3
```
- Works from anywhere (including Render)
- Backend can connect from any environment
- Fully publicly routable

---

## ✅ How to Fix

### Step 1: Get External Link
1. Go to Render Dashboard → PostgreSQL database
2. Click "Connections" tab
3. Copy the **External Database URL** (contains `.onrender.com`)

### Step 2: Update Backend Environment Variable
1. Go to Render Dashboard → `neuropath-backend` service
2. Click "Environment" tab
3. Find `DATABASE_URL` variable
4. Replace value with external link:
   ```
   postgresql://neuropath_s6s3_user:PASSWORD@dpg-d9nd6061egvs73frc7qg-a.onrender.com/neuropath_s6s3
   ```
5. Save/Deploy

### Step 3: Verify Connection
1. Backend will restart
2. Check logs for: `"tables created"` or successful startup
3. Try login/register again

---

## 🔍 How to Check Current Connection

**In Render Backend Logs**, you'll see errors like:
- ❌ `(psycopg2.OperationalError) could not translate host name "dpg-d9nd6061egvs73frc7qg-a" to address`
- ❌ `Connection refused`
- ❌ `Host not found`

**After Fix**, you'll see:
- ✅ `CREATE TABLE IF NOT EXISTS users...`
- ✅ `Application startup complete`
- ✅ Health check responding `{"status": "healthy"}`

---

## 📋 Full CONNECTION STRING FORMAT

```
postgresql://USERNAME:PASSWORD@HOST:PORT/DATABASE

Example:
postgresql://neuropath_s6s3_user:WyTSkQDcNQhl9HORr9Y9Pa5JeoyGsYK1@dpg-d9nd6061egvs73frc7qg-a.onrender.com:5432/neuropath_s6s3
```

**Note**: Port (5432) is usually optional, Render adds it automatically.

---

## 🚀 After Updating DATABASE_URL

1. Render auto-deploys
2. Database tables created on first startup
3. Auth endpoints ready
4. Registration works
5. Login works

---

## ❓ Why Does Internal Link Fail?

- Internal link = Render internal DNS (`*.internal`)
- Only accessible via Render's private network
- Backend runs in container that can access external network
- Internal link resolves to `127.0.0.1` or fails immediately
- External link routes through public PostgreSQL endpoint

---

## ✅ Checklist

- [ ] Copy External Database URL from Render
- [ ] Update `DATABASE_URL` in Backend Environment
- [ ] Save and trigger redeploy
- [ ] Check logs for successful connection
- [ ] Test register/login
- [ ] Verify health endpoint: `/api/health`

