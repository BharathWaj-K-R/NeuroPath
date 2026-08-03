# ⚠️ CRITICAL: Fix DATABASE_URL (Internal vs External Link)

## Current Issue

Your `DATABASE_URL` is using the **EXTERNAL** link, which is WRONG for Render-to-Render communication.

**Render Warning Message (from Image):**
```
This variable references an External URL. 
Those should only be used from services outside of Render. 
🔗 Use Internal URL
```

---

## The Fix

### Option 1: Click "Use Internal URL" (Easiest)
1. Go to Render Dashboard → Backend service → Environment
2. Find `DATABASE_URL` variable
3. Click the **"Use Internal URL"** link (right side of the warning)
4. Render auto-converts to internal link
5. Click **"Save, rebuild, and deploy"**

### Option 2: Manual Update
1. Go to Render → PostgreSQL database page
2. Click **"Connections"** tab
3. Copy the **"Internal Database URL"** (no `.onrender.com`)
   ```
   postgresql://neuropath_s6s3_user:PASSWORD@dpg-d9nd6861egvs73frc7qg-a/neuropath_s6s3
   ```
4. Go back to Backend → Environment
5. Paste internal link into `DATABASE_URL`
6. Click **"Save, rebuild, and deploy"**

---

## What Changed

### BEFORE (External - WRONG):
```
postgresql://user:pass@dpg-xxx-a.onrender.com/neuropath  ← External (slow)
```
- Routes through internet
- Slower
- Only for external access

### AFTER (Internal - CORRECT):
```
postgresql://user:pass@dpg-xxx-a/neuropath  ← Internal (fast)
```
- Direct Render-to-Render connection
- Faster
- Private network
- Recommended for Render services

---

## After Update

1. Backend will redeploy
2. Check logs for successful DB connection
3. Tables will be created
4. CORS errors should resolve
5. Auth should work

---

## ✅ Quick Checklist

- [ ] Go to Backend service Environment
- [ ] Find DATABASE_URL variable
- [ ] Click "Use Internal URL" OR manually update with internal link
- [ ] Click "Save, rebuild, and deploy"
- [ ] Check logs → should see successful startup
- [ ] Test login → should work now

