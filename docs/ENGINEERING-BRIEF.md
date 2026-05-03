# DART COMMAND CENTER — Engineering Implementation Brief

**For:** Subhan (Software Engineer)
**From:** Umair (CEO)
**Date:** April 2026
**Status:** Ready for implementation

---

## WHAT THIS IS

An internal team performance and activity platform for Dart Marketing (17 people). Two user types: **Admin** (Umair + Aizaz see everything) and **Member** (sees only their own data). The complete frontend prototype is built — you need to wire it to a real backend and deploy it.

---

## STACK (chosen for simplest deployment)

| Layer | Tool | Why |
|-------|------|-----|
| Frontend | Next.js 14 (App Router) + Tailwind | Already built as React, trivial to port |
| Backend | Next.js API Routes | Same repo, no separate server |
| Database | PostgreSQL via **Supabase** | Free tier, managed, instant setup |
| ORM | Prisma | Schema already written, type-safe |
| Auth | NextAuth + Google OAuth | Team uses GSuite, zero password management |
| Hosting | **Vercel** | Free tier, auto-deploy from GitHub |
| Notion Sync | @notionhq/client | Read-only, already coded |
| Desktop Agent | Electron (Phase 2) | NOT in Phase 1 |

---

## SETUP (do this first, takes ~30 minutes)

### 1. Create Supabase Project
- Go to supabase.com → New Project → name it "dart-command-center"
- Region: closest to Karachi (ap-south-1 or ap-southeast-1)
- Copy the DATABASE_URL and DIRECT_URL from Settings → Database → Connection String
- Use "Transaction" mode URL for DATABASE_URL, "Session" mode for DIRECT_URL

### 2. Create Google OAuth Credentials
- Go to console.cloud.google.com → APIs & Services → Credentials
- Create OAuth 2.0 Client ID (Web application)
- Authorized redirect URI: `http://localhost:3000/api/auth/callback/google` (dev)
- Later add: `https://command.dartmarketing.io/api/auth/callback/google` (prod)
- Restrict to `dartmarketing.io` domain in the OAuth consent screen

### 3. Create Notion Integration
- Go to notion.so/my-integrations → New Integration
- Name: "Dart Command Center"
- Capabilities: Read content only
- Copy the Internal Integration Token
- Go to the Notion tasks database → Share → Invite the integration
- Copy the database ID from the URL

### 4. Clone & Setup
```bash
git clone [repo-url]
cd dart-command-center
cp .env.example .env.local
# Fill in all values in .env.local
npm install
npx prisma db push    # creates all tables in Supabase
npx tsx prisma/seed.ts # populates team, badges, balances, KPIs
npm run dev            # starts at localhost:3000
```

### 5. Deploy to Vercel
```bash
npm i -g vercel
vercel
# Add all env vars in Vercel dashboard → Settings → Environment Variables
# Set custom domain: command.dartmarketing.io
```

---

## FILES I'VE GIVEN YOU

| File | What it does |
|------|-------------|
| `prisma/schema.prisma` | Complete database schema — all 12 tables |
| `prisma/seed.ts` | Seeds 17 team members, 8 badges, leave balances, KPI definitions |
| `src/lib/db.ts` | Prisma client singleton |
| `src/lib/auth.ts` | NextAuth config with Google OAuth, role checking |
| `src/lib/notion.ts` | Notion API integration with caching |
| `src/app/api/routes-spec.ts` | Every API endpoint specified with request/response shapes |
| `tailwind.config.ts` | Dart brand colors, fonts, gradient |
| `.env.example` | All required environment variables |
| `package.json` | All dependencies |
| `dart-command-center-fixed.jsx` | Complete frontend prototype (React) |

---

## BUILD ORDER (implement in this exact sequence)

### Phase 1 — Week 1: Auth + Core (SHIP THIS)
Priority: Get people logging in and submitting EODs immediately.

1. **Auth** — Wire NextAuth with Google OAuth. Test login with your @dartmarketing.io account. Middleware to protect all routes except /login.

2. **EOD Reports** — This is the #1 priority module.
   - POST /api/eod — submit daily report
   - GET /api/eod — get user's reports
   - GET /api/eod/compliance — admin compliance view
   - Frontend: EOD form (tasks, KPI focus, blockers, tomorrow)
   - Auto-detect if today's EOD is already submitted
   - Streak calculation: count consecutive days with submissions

3. **Clock In/Out** — Manual for now (no desktop agent yet).
   - POST /api/clock — clock in or out
   - GET /api/clock — history
   - GET /api/clock/today — current status
   - Validate: can't clock in if already clocked in, etc.

### Phase 2 — Week 2: Leave + Evaluation
4. **Leave Management**
   - POST /api/leaves — submit request
   - GET /api/leaves — list (member sees own, admin sees all)
   - PATCH /api/leaves/[id] — approve/reject (admin only)
   - GET /api/leaves/balance — remaining days
   - Auto-deduct balance when approved

5. **Monthly Evaluation**
   - POST /api/evaluations — admin submits scores (5 criteria, 1-4 each)
   - GET /api/evaluations — member sees their scores, admin sees all
   - Auto-calculate averageScore
   - "My Score" page shows evaluation history

6. **Badges**
   - POST /api/badges/award — admin awards badge
   - DELETE /api/badges/award — admin removes badge
   - GET /api/badges — user's badges (all badges + earned status)

### Phase 3 — Week 3: KPIs + Notion
7. **KPIs & Objectives**
   - GET /api/kpis — definitions + progress per user
   - POST /api/kpis/log — daily progress entry
   - Current value = SUM of all kpiLog.valueDelta for the period

8. **Notion Task Sync** (read-only)
   - GET /api/tasks — pulls from Notion, filtered by user email
   - 5-minute cache
   - Match Notion "Assigned To" person property to user email
   - Display: title, status, priority, project, due date

### Phase 4 — Week 4+ (LATER): Desktop Agent
9. **Activity Monitoring** — requires separate Electron app
   - Captures: active window title, app name, browser tabs (via extension), idle detection
   - Sends heartbeat every 60 seconds to POST /api/activity/heartbeat
   - Admin sees all data, members see only their own
   - This is a separate project — don't block Phase 1-3 on this

---

## ROLE-BASED ACCESS RULES

| Data | Member | Admin |
|------|--------|-------|
| Own clock events | ✅ Read/Write | ✅ Read all users |
| Own EOD reports | ✅ Read/Write | ✅ Read all + compliance stats |
| Own leave balance | ✅ Read | ✅ Read all |
| Leave requests | ✅ Submit own | ✅ Approve/Reject all |
| Own KPI progress | ✅ Read/Write logs | ✅ Read all users |
| Own evaluation scores | ✅ Read only | ✅ Read/Write (submit evals) |
| Own badges | ✅ Read only | ✅ Award/Remove |
| Own Notion tasks | ✅ Read only | ✅ Read all users |
| Activity monitoring | ✅ Own data only | ✅ All users |
| Team overview dashboard | ❌ | ✅ |

**CRITICAL:** Every API route MUST check `session.user.role`. If a member tries to access another user's data, return 403.

---

## PERFORMANCE SCORING — How It Works

Monthly, Umair and Aizaz evaluate each team member on 5 criteria (1.0 to 4.0 each):

1. **Client Satisfaction** — client feedback on responsiveness and quality
2. **Quality of Work** — accuracy, detail, polish
3. **Project Understanding** — brand knowledge, research, strategic thinking
4. **Work Approach** — proactiveness, initiative
5. **Work Ethic** — punctuality, EOD compliance, reliability

**Average Score** = mean of all 5. This determines the rating:
- **4.0–3.5** → Exceeds (bonus eligible, expanded scope)
- **3.5–2.5** → Meets (positive standing)
- **2.5–1.5** → Below (coaching plan, 30-day window)
- **Below 1.5** → Critical (PIP, daily check-ins)

Score 3+ required for bonus eligibility.

---

## NOTION INTEGRATION NOTES

- The Notion API key is an "internal integration token" — NOT a public API key
- The integration must be explicitly shared to the tasks database in Notion
- Property names in the code (notion.ts) must match EXACTLY what's in the Notion database
- Common property names to check: "Name"/"Task", "Status", "Priority", "Project"/"Client", "Due"/"Due Date", "Assigned To"
- If properties don't match, tasks won't show — check with Umair for exact names
- Cache is in-memory; if you add Redis later, swap the cache object

---

## DESKTOP AGENT SPEC (Phase 2 — build after web app is live)

**Tech:** Electron + Node.js
**What it captures:**
- Active window title (every 60 seconds)
- App name (process name)
- Browser tab URL (requires a Chrome extension — user installs it)
- Idle detection: no mouse/keyboard input for 3+ minutes = idle

**How it works:**
1. User logs in to the agent with their @dartmarketing.io account (same Google OAuth)
2. Agent runs in system tray (background)
3. Every 60 seconds, sends heartbeat to POST /api/activity/heartbeat:
   ```json
   {
     "appName": "Google Chrome",
     "windowTitle": "Birchtech Task Board - Notion",
     "url": "https://notion.so/...",
     "isIdle": false
   }
   ```
4. Server aggregates into ActivityLog table
5. Admin dashboard shows per-user app usage and idle %

**Visibility rules:**
- Admin: sees all users' activity data
- Member: sees ONLY their own data (or optionally hidden entirely — Umair decides)

**NOTE:** The agent requires installing software on each employee's laptop. Prepare for macOS (Aizaz, some creatives) and Windows (most of the team).

---

## DEPLOYMENT CHECKLIST

- [ ] Supabase project created, DATABASE_URL set
- [ ] Google OAuth credentials created, restricted to dartmarketing.io
- [ ] Notion integration created, shared to tasks database
- [ ] `prisma db push` — all tables created
- [ ] `prisma/seed.ts` — team, badges, balances, KPIs populated
- [ ] Verify login works with @dartmarketing.io Google account
- [ ] Verify admin sees admin pages, member doesn't
- [ ] EOD submission works (submit, view, compliance)
- [ ] Clock in/out works
- [ ] Leave request → approval flow works
- [ ] Monthly evaluation (admin) → My Score (member) works
- [ ] Badge award/removal works
- [ ] Notion tasks display correctly
- [ ] Deploy to Vercel with command.dartmarketing.io domain
- [ ] All env vars set in Vercel dashboard
- [ ] Test production login flow
- [ ] Announce to team

---

## QUESTIONS? ESCALATION

- **Database schema questions** → Ask Umair via Claude (this project has full context)
- **Brand/design questions** → Refer to dart-command-center-fixed.jsx (complete frontend)
- **Notion property names** → Ask Umair
- **Role/permission edge cases** → Default to restrictive (member sees less, not more)
- **Desktop agent** → Don't start until Phase 1-3 are deployed and stable

---

*This brief was generated with full context from Dart Marketing's restructuring, performance frameworks, KPI models, and team roster. Every schema, route spec, and data model is aligned to the actual operational structure.*
