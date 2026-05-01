# LIHTC Project Tracker

A private web app for managing LIHTC construction and leasing projects.
Stack: React + Vite · Supabase (database + file storage) · Vercel (hosting)

---

## Deploy in 6 steps (~20 minutes)

### Step 1 — Supabase database

1. Go to [supabase.com](https://supabase.com) and open your project
2. Click **SQL Editor** in the left sidebar
3. Paste the entire contents of `supabase/migrations/001_initial_schema.sql` and click **Run**
4. Go to **Settings → API** and copy:
   - **Project URL** (looks like `https://abcdefgh.supabase.co`)
   - **anon public** key
   - **service_role** key (keep this secret — only used for seeding)

### Step 2 — Supabase Storage bucket

The SQL script creates the bucket automatically. If it errors, do it manually:
1. Go to **Storage** in the left sidebar
2. Click **New bucket**
3. Name: `project-docs` · Public: **off** · File size limit: **50 MB**
4. Click **Create bucket**
5. Go to **Policies** and add a policy: allow all operations, authenticated users

### Step 3 — GitHub repo

```bash
# In your terminal:
cd lihtc-app
git init
git add .
git commit -m "Initial LIHTC tracker"
git branch -M main

# Create a new repo at github.com, then:
git remote add origin https://github.com/YOUR_USERNAME/lihtc-tracker.git
git push -u origin main
```

### Step 4 — Seed your data

```bash
# In the lihtc-app directory:
cp .env.example .env.local
# Edit .env.local and add your Supabase URL and keys

npm install
node --experimental-vm-modules seed.js
# This populates Centerpoint Depot with all project data
```

### Step 5 — Deploy to Vercel

1. Go to [vercel.com](https://vercel.com) and click **Add New Project**
2. Import your `lihtc-tracker` GitHub repo
3. Framework preset: **Vite**
4. Add environment variables:
   - `VITE_SUPABASE_URL` = your Supabase project URL
   - `VITE_SUPABASE_ANON_KEY` = your anon key
5. Click **Deploy**

Vercel gives you a URL like `lihtc-tracker-abc123.vercel.app` — bookmark it.

### Step 6 — Upload your closing binder

1. Open the app in your browser
2. Click on Centerpoint Depot → expand → **Documents** tab
3. Each document in the closing binder is pre-listed
4. Click **Upload** next to any document, or drag multiple files at the top
5. Files upload directly to Supabase Storage — no size worries

---

## Monthly workflow

**New draw spreadsheet:**
- Upload tab → drop the xlsx → dashboard auto-parses and updates draw data

**New PM financials:**
- Upload tab → drop the PDF → dashboard auto-parses and updates leasing snapshot

**New rent roll:**
- Upload tab → drop the xlsx → occupancy numbers update automatically

**New document (any type):**
- Documents tab → Upload button → file goes straight to Supabase

---

## Add more projects

Edit `seed.js` — copy the Centerpoint block and fill in your other project data.
Run `node seed.js` again (it won't duplicate Centerpoint).

Or add directly in Supabase: **Table Editor → projects → Insert row**

---

## Private URL

Your Vercel URL is already unguessable (contains a random hash). For extra security:
- Go to Vercel → Settings → Domains → add a custom domain
- Or set a password via Vercel's **Password Protection** feature (Pro plan)

---

## File structure

```
lihtc-app/
├── src/
│   ├── App.jsx              # Main dashboard
│   ├── main.jsx             # React entry
│   ├── components/
│   │   ├── ui.jsx           # Shared UI primitives
│   │   └── DocsTab.jsx      # Document management tab
│   └── lib/
│       ├── supabase.js      # Database + storage client
│       └── helpers.js       # Formatters, constants
├── supabase/migrations/
│   └── 001_initial_schema.sql
├── seed.js                  # One-time data import
├── .env.example             # Copy to .env.local
├── index.html
├── vite.config.js
└── package.json
```
