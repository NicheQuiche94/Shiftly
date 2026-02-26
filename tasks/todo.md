# Shiftly V4 R2 — Task Tracker

## Execution Order: 6 → 3 → 2 → 4 → 5 → 1 → 7 → 8 → 9

---

## Prompt 6: Rota Builder — Data Fix + Template Preview ✅

### Step 1: Audit (subagent) - DONE
- [x] OR-Tools expects: { staff, shifts, rules, weeks } with AM/PM availability
- [x] Frontend sends: { startDate, weekCount, team_id, showAllTeams } to generate-rota route
- [x] sync-shifts writes: shift_name, day_of_week, start_time (HH:MM), end_time (HH:MM), staff_required
- [x] No field name mismatches; availability_grid priority was the main fix

### Step 2: Fix data pipeline - DONE (prior session)
- [x] availability_grid now preferred over legacy availability field
- [x] No remaining field name mismatches

### Step 3: Add template preview - DONE
- [x] Visual WeekOverview (vertical, compact, readOnly) below team selector
- [x] Shows Mon-Sun shift bars using shared getBlockColor()
- [x] Shows "Needed: Xh / week" total + "Edit in Workspace →" link

### Step 4: Pre-generation validation - DONE
- [x] Checks: templates configured, active days exist, staff exist, coverage >= 80%
- [x] Each error has code prefix for actionable routing

### Step 5: Error diagnostics - DONE
- [x] Error codes parsed → action links (Go to Templates / Go to Staff & Shifts)
- [x] Scheduler diagnostics show suggestions + dual action links
- [x] Build passes

### Files modified:
- `app/api/generate-rota/route.js` — availability_grid priority (prior session)
- `app/components/rota/RotaConfigPanel.jsx` — visual template preview with WeekOverview
- `app/(auth)/dashboard/generate/page.js` — pre-generation validation with error codes
- `app/components/rota/RotaAlerts.jsx` — error code parsing, action links, scheduler diagnostics

---

## Prompt 3: Keyholder Coverage Warning

### Audit - DONE
- [x] Staff field: `keyholder` (boolean)
- [x] No per-shift keyholder flag — inferred from timing (open/close shifts)
- [x] Coverage calc already exists in StaffShiftsSection.jsx (lines 92-145)
- [x] CoverageGauge already renders keyholder warnings

### Implementation - DONE
- [x] CoverageGauge already shows "Coverage gaps" when keyholder warnings present
- [x] Added keyholder pre-gen check to handleGenerate
- [x] KEYHOLDER error code routes to "Go to Staff & Shifts" in RotaAlerts
- [x] Build compiles successfully

## Prompt 2: Staff Card Collapsed Layout ✅

### Implementation - DONE
- [x] Rewrote collapsed card with structured column layout
- [x] Columns: Avatar | Name+email | h/wk | max | £/hr | 🔑 | slots ▼ | → chevron
- [x] Column headers: `text-[10px] text-gray-400 font-medium` above values
- [x] Values: `text-sm font-semibold text-gray-900`
- [x] Keyholder moved to own column after Rate
- [x] Availability styled as clickable trigger with hover:bg + chevron
- [x] Expand chevron (→) on far right
- [x] Build compiles successfully

### Files modified:
- `app/components/workspace/StaffShiftsSection.jsx` — collapsed card rewrite (lines 509-578)

## Prompt 4: Template Cards — Shift Bar Visual Fix + Save & Sync Placement ✅

### Audit - DONE
- [x] ShiftMiniPreview uses `getShiftBlockColor(shift.length, shiftLengths)` — color by duration (correct)
- [x] WeekOverview uses `getBlockColor(i)` — color by array position (inconsistent)
- [x] Save & Sync visible on BOTH tabs — should be Weekly Schedule only

### Implementation - DONE
- [x] WeekOverview: replaced `getBlockColor(i)` with `getShiftBlockColor(s.length, shiftLengths)` in both vertical and horizontal layouts
- [x] TemplatesSection: moved top bar (business hours info + Save & Sync) behind `activeTab === 'week'` guard
- [x] Build compiles successfully (✓ Compiled successfully in 21.1s)

### Files modified:
- `app/components/template/WeekOverview.jsx` — import + color function fix (lines 3, 39, 80)
- `app/components/workspace/TemplatesSection.jsx` — top bar conditional on Weekly Schedule tab (lines 238-292)

## Prompt 5: Settings Page Fixes ✅

### Implementation - DONE
- [x] Pill colors: replaced hardcoded `#FF1F7D` with `c.fill` / `c.border` from `getColorForLength()` — now 4h=pink, 6h=purple, 8h=teal, etc.
- [x] Label: confirmed already "Team Name" (was fixed previously), updated comment to match
- [x] Build compiles successfully (✓ Compiled successfully in 10.2s)

### Files modified:
- `app/components/workspace/SettingsSection.jsx` — pill color fix (line 136), comment fix (line 107)

## Prompt 1: Wizard Fixes ✅

### Implementation - DONE
- [x] Removed 4 em dashes: steps 2, 4, 5, 10 (rewording or replaced with -)
- [x] Highlight border: replaced `ring-[3px] ring-pink-400 ring-offset-4` with `border: 2px solid #FF1F7D` + 8px padding
- [x] Step 2 target: changed from `tour-templates-section` (entire section) to `tour-templates-tabs` (tab pills only)
- [x] Step 4 target: changed from `tour-rota-actions` (full button bar) to `tour-generate-btn` (Generate button only)
- [x] Added `id` prop support to Button component for tour targeting
- [x] Tooltip overflow fix: bottom-positioned tooltips flip above target when near viewport bottom
- [x] Build compiles successfully (✓ Compiled successfully in 22.7s)

### Files modified:
- `components/OnboardingTour.jsx` — em dashes, targets, highlight border, tooltip overflow
- `app/components/workspace/TemplatesSection.jsx` — added `id="tour-templates-tabs"` to tab pills
- `app/components/rota/RotaActions.jsx` — added `id="tour-generate-btn"` to Generate button
- `app/components/Button.js` — added `id` prop passthrough

## Prompt 7: Reports — Staff Rates ✅

### Audit - DONE
- [x] Staff.hourly_rate exists directly on Staff table (set via workspace)
- [x] payroll_info table has separate hourly_rate/annual_salary (set via payroll page)
- [x] Labour API fetched from payroll_info only — missed Staff.hourly_rate fallback
- [x] Export CSV API queried legacy Staff.hourly_rate only — missed payroll_info entirely

### Implementation - DONE
- [x] Labour API: added Staff.hourly_rate to SELECT, falls back when payroll_info empty
- [x] Export CSV API: added payroll_info relationship + same fallback logic
- [x] Overtime: both APIs now use 1.5x rate for overtime hours
- [x] Reports page display already correct (renders rate from API response)
- [x] Build compiles successfully (✓ Compiled successfully in 35.4s)

### Files modified:
- `app/api/reports/labour/route.js` — added hourly_rate fallback + 1.5x OT rate
- `app/api/reports/export-csv/route.js` — added payroll_info query + fallback + 1.5x OT rate

## Prompt 8: Dashboard Redesign ✅

### Implementation - DONE
- [x] Removed "Time Saved" (hardcoded 2.5h per rota) and "Weeks Approved" vanity metrics
- [x] New stat card 1: "This Week's Rota" - status badge (Published/Draft/Not Created), date range, click → rota
- [x] New stat card 2: "Coverage Status" - percentage gauge, green/amber, click → Staff & Shifts
- [x] New stat card 3: "Pending Requests" - count with amber highlight, click → Inbox
- [x] Enhanced Upcoming Rotas: each row shows date range, week count, Published/Draft badge, delete button
- [x] Enhanced empty state: "No rotas yet. Create your first rota →"
- [x] New Quick Actions row: "Generate Next Week" (pre-fills next Monday), "Edit Templates", "Manage Staff"
- [x] Kept "Welcome back, [Name]" greeting and PastRotasSection
- [x] Coverage calculated from team template data + staff max hours
- [x] Build compiles successfully (✓ Compiled successfully in 23.4s)

### Files modified:
- `app/(auth)/dashboard/page.js` — full rewrite (removed SectionHeader, AnnouncementComposer imports, added team/staff queries)

## Prompt 9: Help Centre FAQ Update ✅

### Implementation - DONE
- [x] Q1 "How do I set up my first rota?" - updated flow: Settings → Day Templates → Weekly Schedule → Save & Sync → Staff & Shifts → Generate
- [x] Q2 "What are shift patterns?" - updated: template cards with Edit/Rename/Delete, timeline editor, Weekly Schedule + Save & Sync
- [x] Q3 "How do I invite staff?" - updated: "Staff & Shifts tab" instead of "Staff tab"
- [x] Q4 "Set once, use forever" - removed vanity "2-3 hours per week" claim with em dash
- [x] Q5 "What if scheduler can't find a rota?" - updated: pre-generation checks, coverage/keyholder validation, error codes with action links
- [x] Q6 "How do staff submit availability?" - updated: shift-based matrix with actual shift time slots, coverage gauge, keyholder warnings
- [x] Q7 "How are weekly costs calculated?" - updated: 1.5x overtime rate, per-staff breakdowns, Labour Cost stat card
- [x] Build compiles successfully (✓ Compiled successfully in 13.1s)

### Files modified:
- `app/(auth)/dashboard/help/page.js` - 7 FAQ answers updated
