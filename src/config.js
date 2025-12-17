// Configuration for Rebsamen Tennis Center Court Scheduler

export const CONFIG = {
  SHEET_ID: '1gcGdi1H7rI51msICntX2WrEYP14JXwxYmhMDshAtwLw',

  CSV_URLS: {
    bookings: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vS9iggYOib3RykXB9pLf-GrS7IcZiuaOLy6e7Ve25z_PQEEc8Z4fBiPDu03_e7__jMK3GBfCHEpXyNA/pub?gid=2047840747&single=true&output=csv',
    courts: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vS9iggYOib3RykXB9pLf-GrS7IcZiuaOLy6e7Ve25z_PQEEc8Z4fBiPDu03_e7__jMK3GBfCHEpXyNA/pub?gid=1236681655&single=true&output=csv',
    staff: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vS9iggYOib3RykXB9pLf-GrS7IcZiuaOLy6e7Ve25z_PQEEc8Z4fBiPDu03_e7__jMK3GBfCHEpXyNA/pub?gid=269134827&single=true&output=csv',
    config: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vS9iggYOib3RykXB9pLf-GrS7IcZiuaOLy6e7Ve25z_PQEEc8Z4fBiPDu03_e7__jMK3GBfCHEpXyNA/pub?gid=1002653546&single=true&output=csv',
    maintenanceLog: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vS9iggYOib3RykXB9pLf-GrS7IcZiuaOLy6e7Ve25z_PQEEc8Z4fBiPDu03_e7__jMK3GBfCHEpXyNA/pub?gid=1598592918&single=true&output=csv',
    contractors: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vS9iggYOib3RykXB9pLf-GrS7IcZiuaOLy6e7Ve25z_PQEEc8Z4fBiPDu03_e7__jMK3GBfCHEpXyNA/pub?gid=52721266&single=true&output=csv',
    teams: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vS9iggYOib3RykXB9pLf-GrS7IcZiuaOLy6e7Ve25z_PQEEc8Z4fBiPDu03_e7__jMK3GBfCHEpXyNA/pub?gid=1667747238&single=true&output=csv',
  },

  // Apps Script URL (LIVE)
  APPS_SCRIPT_URL: 'https://script.google.com/macros/s/AKfycbxL-Ox9W67VmpSa60kk2SNoqA76HxveHzcpdsgFysVQRYmpAYRYAfQ6gUFIAr1q3scjQw/exec',

  // Time configuration
  DAY_START_HOUR: 8,
  DAY_START_MINUTE: 30,
  DAY_END_HOUR: 21,
  DAY_END_MINUTE: 0,
  SLOT_MINUTES: 30,

  // Courts
  TOTAL_COURTS: 17,
  STADIUM_COURT_NUMBER: 17,

  // Refresh interval in ms
  REFRESH_INTERVAL: 60000, // 1 minute
};

// Booking type enum values
export const BOOKING_TYPES = {
  OPEN: 'open',
  CONTRACTOR: 'contractor',
  TEAM_USTA: 'team_usta',
  TEAM_HS: 'team_hs',
  TEAM_COLLEGE: 'team_college',
  TEAM_OTHER: 'team_other',
  TOURNAMENT: 'tournament',
  MAINTENANCE: 'maintenance',
  HOLD: 'hold',
};

// Booking status values
export const BOOKING_STATUS = {
  ACTIVE: 'active',
  CANCELLED: 'cancelled',
  NO_SHOW: 'no_show',
  COMPLETED: 'completed',
};

// Cancel reason values
export const CANCEL_REASONS = {
  CUSTOMER: 'customer',
  WEATHER: 'weather',
  FACILITY: 'facility',
  NO_SHOW: 'no_show',
  OTHER: 'other',
};

// Refund status values
export const REFUND_STATUS = {
  NONE: 'none',
  PARTIAL: 'partial',
  FULL: 'full',
  CREDIT: 'credit',
  NA: 'na',
};

// Payment status values
export const PAYMENT_STATUS = {
  PENDING: 'pending',
  PAID: 'paid',
  WAIVED: 'waived',
  INVOICED: 'invoiced',
  REFUNDED: 'refunded',
  NA: 'na',
};

// Payment methods
export const PAYMENT_METHODS = {
  POS: 'pos',
  CASH: 'cash',
  CHECK: 'check',
  INVOICE: 'invoice',
  CARD: 'card',
  NA: 'na',
};
