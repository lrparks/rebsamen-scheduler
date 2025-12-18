# Reports & Analytics Implementation Plan

## Overview

Add a comprehensive Reports/Analytics system to the Rebsamen Tennis Center scheduler with three report tiers:
1. **Daily Dashboard** - Real-time operational metrics for staff
2. **Weekly Summary** - Week-over-week comparison for managers
3. **Monthly Performance** - Board-level reporting with YoY & MoM analysis

---

## Current State Analysis

### Data Already Available (Phase 1 MVP)
From existing booking schema:
- `booking_type` - open, contractor, team_*, tournament, maintenance, hold
- `status` - active, cancelled, no_show, completed
- `cancel_reason` - customer, weather, facility, no_show, other
- `check_in_time`, `checked_in_by` - check-in tracking
- `payment_status`, `payment_amount`, `payment_method` - revenue tracking
- `entity_id` - links to contractor/team/tournament
- `time_start`, `time_end`, `court`, `date` - utilization calculation

### Data Gaps (Phase 2 - New Fields)
Missing for participation metrics:
- `participant_count` - number of players (default 2)
- `is_youth` - all players under 18

### Reporting Configuration (to add)
- `monthly_revenue_target` - configurable target for revenue comparison
- `operating_expenses` - for cost recovery % calculation

---

## Implementation Phases

### Phase 1: MVP Reports (Existing Data)
**Effort: ~2-3 days**

Build reports using only existing booking data:

#### 1.1 Create Reports View & Navigation
- Add "Reports" tab to Navigation (between Search and Maintenance)
- Create `src/components/views/ReportsView.jsx` with sub-navigation:
  - Daily Dashboard (default)
  - Weekly Summary
  - Monthly Report

#### 1.2 Utility Functions (`src/utils/reportUtils.js`)
```javascript
// Time period classification
const TIME_PERIODS = {
  MORNING: { start: '08:30', end: '12:00', label: 'Morning (8:30am-12pm)' },
  AFTERNOON: { start: '12:00', end: '17:00', label: 'Afternoon (12pm-5pm)' },
  PRIME: { start: '17:00', end: '21:00', label: 'Prime (5pm-9pm)' },
};

// Slot calculations
getTotalSlotsForPeriod(period) // Returns available slots
getBookedSlotsForPeriod(bookings, date, period) // Returns booked count
calculateUtilization(booked, total) // Returns percentage

// Revenue calculations
calculateExpectedRevenue(bookings) // Based on booking amounts
calculateCollectedRevenue(bookings) // Where payment_status = 'paid'
calculatePendingRevenue(bookings) // Where payment_status = 'pending'

// Booking efficiency
getCompletedBookings(bookings) // status = 'completed' or 'active' (past)
getCancelledBookings(bookings) // status = 'cancelled'
getNoShowBookings(bookings) // status = 'no_show'
getCheckedInBookings(bookings) // has check_in_time

// Contractor hours
getContractorHours(bookings, contractorId?) // Sum of contractor booking durations
```

#### 1.3 Daily Dashboard Component
`src/components/reports/DailyDashboard.jsx`

Sections:
1. **Utilization by Time Period**
   - Table: Period | Booked | Available | Utilization %
   - Morning/Afternoon/Prime breakdown
   - Total for day
   - "View Available Slots" expandable panel

2. **Available Slots Panel** (collapsible)
   - Grouped by time period
   - Shows: Time → Available courts list
   - Highlights limited availability (<3 courts)

3. **Revenue Summary**
   - Expected / Collected / Pending
   - Simple bar or number display

4. **Today's Activity**
   - Bookings made today
   - Check-ins completed
   - No-shows
   - Cancellations (by reason breakdown)

5. **Contractors Today**
   - List of contractors with bookings today
   - Courts and time ranges
   - Total hours per contractor

6. **Maintenance Summary**
   - Weekly grid (Mon-Sun) with task completion status
   - Pull from existing maintenance log
   - Follow-up issues panel (items with follow_up_needed = TRUE)

#### 1.4 Weekly Summary Component
`src/components/reports/WeeklySummary.jsx`

Sections:
1. **Utilization Comparison**
   - This Week vs Last Week
   - Overall / Prime / Non-Prime / Weekend
   - Change indicators (+/- %)

2. **Booking Types Breakdown**
   - Pie chart or bar showing hours by type
   - Open Play, Contractors, Teams (HS/USTA/College), Tournament, Maintenance

3. **Revenue Summary**
   - Total revenue vs target (if configured)
   - Breakdown: Court Rentals, League Fees, Tournament

4. **Booking Efficiency**
   - Total bookings / Completed / Cancelled / No-shows
   - Percentage rates
   - Check-in rate

5. **Top Contractors**
   - Ranked by hours booked
   - Shows: Name, Hours, Trend vs prior week

#### 1.5 Print Functionality
- Add print button to each report view
- Print-optimized CSS (already have patterns from DailyGrid)
- Generates clean, professional output

---

### Phase 2: Participation Tracking (New Fields)
**Effort: ~1 day**

#### 2.1 Update Booking Form
Add to `BookingForm.jsx` after Customer Info section:

```jsx
{/* Participation Info */}
<div className="grid grid-cols-2 gap-3">
  <Select
    label="Number of Players"
    value={formData.participantCount}
    onChange={handleFieldChange('participantCount')}
    options={[1,2,3,4,5,6,7,8].map(n => ({ value: n, label: String(n) }))}
    defaultValue={2}
  />
  <div className="flex items-center gap-2 pt-6">
    <input
      type="checkbox"
      id="isYouth"
      checked={formData.isYouth || false}
      onChange={(e) => onChange({ isYouth: e.target.checked })}
    />
    <label htmlFor="isYouth">Youth booking (all under 18)</label>
  </div>
</div>
```

#### 2.2 Update Google Sheets Schema
Add columns to Bookings sheet:
- `participant_count` (number, default 2)
- `is_youth` (TRUE/FALSE, default FALSE)

#### 2.3 Update Apps Script
Modify `createBooking` and `updateBooking` to handle new fields.

#### 2.4 Update Reports
Add participation metrics to Weekly/Monthly:
- Total participants (sum of participant_count)
- Youth vs Adult breakdown
- Participants by booking type

---

### Phase 3: Monthly Performance Report
**Effort: ~2 days**

#### 3.1 Monthly Report Component
`src/components/reports/MonthlyReport.jsx`

Full implementation of the board report format:

1. **Executive Summary**
   - Court Hours Booked (with YoY and MoM if prior year data exists)
   - Total Revenue
   - Cost Recovery % (requires manual input or config)

2. **Utilization Metrics**
   - Overall utilization with target comparison
   - By time period (Prime, Non-Prime, Weekend, Early Morning)
   - By court section (1-8, 9-16, Stadium)

3. **Financial Metrics**
   - Revenue by source (Open, Contractor, League, Tournament)
   - Revenue per court hour
   - Waived value tracking (HS teams, youth)

4. **Participation Metrics** (Phase 2 dependent)
   - Total participants
   - Adults vs Youth breakdown

5. **Booking Patterns**
   - Efficiency rate
   - Cancellation analysis by reason
   - No-show rate

6. **Contractor Utilization**
   - Table: Contractor | Hours | Revenue | $/Hr
   - % of total court hours

7. **Tournaments & Events**
   - Events hosted this month
   - Courts used, participants
   - YTD totals

#### 3.2 Export Functionality
- "Export to PDF" button (using browser print-to-PDF)
- Clean, professional formatting
- Header with facility name, report period, generation date

#### 3.3 Config for Targets
Add to config or separate sheet:
- Monthly revenue target
- Utilization targets (overall, prime, non-prime)
- Operating expenses (for cost recovery calculation)

---

### Phase 4: Analytics & Trends (Future)
**Effort: ~2-3 days (future phase)**

Not in immediate scope, but planned:
- YoY and MoM comparison charts
- Seasonal pattern analysis
- Forecasting/predictions
- Custom date range reports
- Dashboard with KPI cards

---

## File Structure

```
src/
├── components/
│   ├── reports/
│   │   ├── DailyDashboard.jsx      # Daily operational view
│   │   ├── WeeklySummary.jsx       # Week comparison view
│   │   ├── MonthlyReport.jsx       # Board report view
│   │   ├── AvailableSlotsPanel.jsx # Expandable available slots
│   │   ├── UtilizationTable.jsx    # Reusable utilization display
│   │   ├── RevenueCard.jsx         # Revenue summary card
│   │   ├── ActivitySummary.jsx     # Bookings/check-ins/etc
│   │   ├── ContractorSummary.jsx   # Contractor hours table
│   │   └── MaintenanceGrid.jsx     # Weekly maintenance status
│   └── views/
│       └── ReportsView.jsx         # Main reports container
├── utils/
│   └── reportUtils.js              # All calculation functions
└── hooks/
    └── useReportData.js            # Data fetching for reports
```

---

## UI/UX Design Notes

### Daily Dashboard Layout
```
┌─────────────────────────────────────────────────────────────┐
│ Reports    [Daily ▼]  [< Prev Day] Dec 18, 2024 [Next >]    │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─ UTILIZATION ────────────────────────────────────────┐  │
│  │ Morning    24/68   ████████░░░░░░░░░░░░  35%         │  │
│  │ Afternoon  34/85   ██████████░░░░░░░░░░  40%         │  │
│  │ Prime      61/68   █████████████████░░░  90%         │  │
│  │ ─────────────────────────────────────────────        │  │
│  │ TOTAL      119/221 ██████████████░░░░░░  54%         │  │
│  │                                                      │  │
│  │ [▼ View Available Slots]                             │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌─ REVENUE ─────────┐  ┌─ TODAY'S ACTIVITY ────────────┐  │
│  │ Expected:  $486   │  │ Bookings:     28              │  │
│  │ Collected: $342   │  │ Check-ins:    19              │  │
│  │ Pending:   $144   │  │ No-shows:     2               │  │
│  └───────────────────┘  │ Cancellations: 3              │  │
│                         └───────────────────────────────┘  │
│                                                             │
│  ┌─ CONTRACTORS TODAY ──────────────────────────────────┐  │
│  │ Ace Tennis Academy   Courts 1-3    8am-12pm   8 hrs  │  │
│  │ Pro Tennis LR        Court 7       3pm-7pm    4 hrs  │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌─ MAINTENANCE ────────────────────────────────────────┐  │
│  │        Mon  Tue  Wed  Thu  Fri  Sat  Sun             │  │
│  │ Task1   ✓    ✓    ✓    ○    ○    ○    ○              │  │
│  │ Task2   ✓    ⚠    ✓    ○    ○    ○    ○              │  │
│  │                                                      │  │
│  │ ⚠ FOLLOW-UPS (2)                                     │  │
│  │ • Court 4: Winch mechanism needs repair              │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### Report Type Selector
Simple dropdown or tab navigation:
- Daily Dashboard (default)
- Weekly Summary
- Monthly Report

### Date Navigation
- Daily: Prev/Next day buttons + date picker
- Weekly: Prev/Next week buttons + week display
- Monthly: Prev/Next month buttons + month/year picker

---

## Implementation Order

### Week 1: Phase 1 MVP
1. Create `reportUtils.js` with core calculation functions
2. Build `ReportsView.jsx` shell with navigation
3. Implement `DailyDashboard.jsx`
4. Implement `WeeklySummary.jsx`
5. Add print styling

### Week 2: Phase 2 + Polish
1. Add participation fields to booking form
2. Update Google Sheets + Apps Script
3. Build `MonthlyReport.jsx`
4. Add export functionality
5. Testing and refinement

---

## Decisions (Resolved)

1. **Slot Definition**: Use **1-hour slots** (13 per day × 17 courts = 221 total) for easier reporting math ✓

2. **Revenue Targets**: Configurable in Google Sheets Config tab ✓

3. **Operating Expenses**: Configurable in Google Sheets Config tab (for cost recovery %) ✓

4. **Customer Tracking**: **Removed from scope** - not tracking new vs returning customers ✓

5. **Maintenance on Daily Dashboard**: **Yes** - include weekly completion grid + follow-up items (summary only, not detailed logs) ✓

---

## Approval Status

- [x] Phase 1 scope (Daily + Weekly with existing data)
- [x] Phase 2 scope (participant_count, is_youth fields)
- [x] Phase 3 scope (Monthly report format)
- [x] UI layout approach
- [x] Slot definition (1-hour slots)
- [x] Config for revenue targets and operating expenses

**APPROVED - Ready for implementation**
