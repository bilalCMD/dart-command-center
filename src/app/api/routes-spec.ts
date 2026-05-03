// src/app/api — API Route Specifications
// Subhan: implement each of these as Next.js API routes (app router)
// All routes require authentication via NextAuth session
// Admin routes require role === 'ADMIN'

// ═══════════════════════════════════════════════════════════
// ROUTE: /api/clock
// ═══════════════════════════════════════════════════════════

// POST /api/clock — Clock in or out
// Body: { type: "CLOCK_IN" | "CLOCK_OUT", note?: string }
// Logic:
//   - Validate user is authenticated
//   - Check last event — if CLOCK_IN, only allow CLOCK_OUT and vice versa
//   - Create ClockEvent record
//   - Return the event + today's summary (total hours, idle time)
// Response: { event: ClockEvent, todaySummary: { totalSeconds, idleSeconds, engagedSeconds } }

// GET /api/clock — Get clock history
// Query: ?userId=xxx&from=2026-04-01&to=2026-04-08
// Logic:
//   - Members can only see their own data (ignore userId param)
//   - Admins can see any user (pass userId)
//   - Return events within date range
// Response: { events: ClockEvent[], summary: { totalHours, avgClockIn, lateCount } }

// GET /api/clock/today — Get today's status for current user
// Response: { isClockedIn: boolean, clockInTime?: string, elapsed: number, events: ClockEvent[] }


// ═══════════════════════════════════════════════════════════
// ROUTE: /api/activity (Phase 2 — Desktop Agent)
// ═══════════════════════════════════════════════════════════

// POST /api/activity/heartbeat — Receive heartbeat from desktop agent
// Body: { appName: string, windowTitle?: string, url?: string, isIdle: boolean }
// Logic:
//   - Authenticated via API key (agent sends user's token)
//   - Upsert into ActivityLog — if same app within last 60s, increment duration
//   - Otherwise create new log entry
// Response: { ok: true }

// GET /api/activity — Get activity summary
// Query: ?userId=xxx&date=2026-04-08
// Logic:
//   - Members see own data only, Admins see any user
//   - Aggregate by appName: total duration, percentage of day
// Response: { apps: [{ name, totalSeconds, pct }], tabs: [{ title, url, duration }] }


// ═══════════════════════════════════════════════════════════
// ROUTE: /api/leaves
// ═══════════════════════════════════════════════════════════

// POST /api/leaves — Submit leave request
// Body: { type: "ANNUAL"|"SICK"|etc, fromDate: string, toDate: string, reason: string }
// Logic:
//   - Check leave balance — reject if insufficient
//   - Create LeaveRequest with status PENDING
// Response: { request: LeaveRequest }

// GET /api/leaves — Get leave requests
// Query: ?status=PENDING (admin sees all, member sees own)
// Response: { requests: LeaveRequest[], balances: LeaveBalance[] }

// PATCH /api/leaves/[id] — Approve or reject (ADMIN only)
// Body: { status: "APPROVED" | "REJECTED" }
// Logic:
//   - Set status, set approvedBy to current admin
//   - If APPROVED, increment LeaveBalance.used for the user
// Response: { request: LeaveRequest }

// GET /api/leaves/balance — Get current user's leave balance
// Response: { balances: [{ type, total, used, remaining }] }


// ═══════════════════════════════════════════════════════════
// ROUTE: /api/kpis
// ═══════════════════════════════════════════════════════════

// GET /api/kpis — Get KPI definitions + progress
// Query: ?userId=xxx&period=Q2+2026
// Logic:
//   - Get all active KpiDefinitions
//   - For each, calculate current value = SUM of kpiLogs.valueDelta for the period
//   - Return with target, current, percentage
// Response: { kpis: [{ ...definition, current, pct }] }

// POST /api/kpis/log — Log daily KPI activity
// Body: { kpiId: string, date: string, valueDelta: number, description: string }
// Logic:
//   - Create KpiLog entry
//   - Return updated KPI progress
// Response: { log: KpiLog, updatedKpi: { current, pct } }


// ═══════════════════════════════════════════════════════════
// ROUTE: /api/eod
// ═══════════════════════════════════════════════════════════

// POST /api/eod — Submit EOD report
// Body: { tasksCompleted: string, kpiFocus?: string, blockers?: string, tomorrowPlan?: string }
// Logic:
//   - Validate one per user per day (unique constraint)
//   - Create EodReport
//   - Check if this triggers "7-Day Streak" badge (query last 7 days)
// Response: { report: EodReport }

// GET /api/eod — Get EOD reports
// Query: ?userId=xxx&from=2026-04-01&to=2026-04-08
// Logic:
//   - Members see own, Admins see any user
// Response: { reports: EodReport[] }

// GET /api/eod/compliance — Get EOD compliance stats (ADMIN)
// Query: ?month=2026-04
// Logic:
//   - For each user: count submitted days vs working days in month
//   - Calculate compliance %, current streak
// Response: { compliance: [{ userId, name, submitted, total, pct, streak }] }


// ═══════════════════════════════════════════════════════════
// ROUTE: /api/evaluations
// ═══════════════════════════════════════════════════════════

// POST /api/evaluations — Submit monthly evaluation (ADMIN only)
// Body: {
//   evaluateeId: string,
//   month: "April 2026",
//   satisfaction: 3.5,
//   quality: 3.0,
//   understanding: 3.5,
//   approach: 3.0,
//   ethic: 3.5,
//   notes?: string
// }
// Logic:
//   - Calculate averageScore = mean of all 5 criteria
//   - Upsert (one eval per evaluator per evaluatee per month)
// Response: { evaluation: Evaluation }

// GET /api/evaluations — Get evaluations
// Query: ?userId=xxx&month=April+2026
// Logic:
//   - Members see their own evaluations only
//   - Admins see all evaluations
// Response: { evaluations: Evaluation[] }

// GET /api/evaluations/leaderboard — Get ranked list (ADMIN)
// Query: ?month=April+2026
// Logic:
//   - Get all evaluations for the month
//   - Rank by averageScore descending
// Response: { leaderboard: [{ userId, name, avg, rank }] }


// ═══════════════════════════════════════════════════════════
// ROUTE: /api/badges
// ═══════════════════════════════════════════════════════════

// POST /api/badges/award — Award badge to user (ADMIN only)
// Body: { userId: string, badgeId: string }
// Logic:
//   - Create UserBadge entry (idempotent via unique constraint)
// Response: { userBadge: UserBadge }

// DELETE /api/badges/award — Remove badge (ADMIN only)
// Body: { userId: string, badgeId: string }
// Response: { ok: true }

// GET /api/badges — Get badges for user
// Query: ?userId=xxx
// Logic:
//   - Return all badges + which ones this user has earned
// Response: { badges: [{ ...badge, earned: boolean, awardedAt?: string }] }


// ═══════════════════════════════════════════════════════════
// ROUTE: /api/tasks (Notion Integration — Read Only)
// ═══════════════════════════════════════════════════════════

// GET /api/tasks — Get tasks from Notion
// Query: ?userId=xxx
// Logic:
//   - Use @notionhq/client to query the tasks database
//   - Filter by "Assigned To" person property matching user email
//   - Map Notion properties to: title, status, priority, project, dueDate
//   - Cache in memory or Redis for 5 minutes
// Response: { tasks: [{ id, title, status, priority, project, due }] }


// ═══════════════════════════════════════════════════════════
// ROUTE: /api/admin/team (ADMIN only)
// ═══════════════════════════════════════════════════════════

// GET /api/admin/team — Get full team overview
// Logic:
//   - For each user: today's clock status, EOD status, leave balance, latest eval score
// Response: { team: [{ user, clockedIn, todayEod, evalScore, leaveBalance }] }

// GET /api/admin/dashboard — Aggregated admin stats
// Response: {
//   teamSize: number,
//   presentToday: number,
//   eodComplianceMTD: number,
//   pendingLeaves: number,
//   avgEvalScore: number,
// }


export {};
