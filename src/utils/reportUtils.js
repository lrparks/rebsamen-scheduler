import { CONFIG, BOOKING_TYPES, BOOKING_STATUS, CANCEL_REASONS } from '../config.js';
import { parseTimeToMinutes } from './timeUtils.js';
import { formatDateISO } from './dateHelpers.js';

/**
 * Time periods for utilization reporting
 * Using 1-hour slots: 13 slots per day (8am-9pm)
 */
export const TIME_PERIODS = {
  MORNING: {
    start: '08:00',
    end: '12:00',
    label: 'Morning (8am-12pm)',
    slots: 4, // 8:00, 9:00, 10:00, 11:00 (4 hour-slots, ends at 12:00)
  },
  AFTERNOON: {
    start: '12:00',
    end: '17:00',
    label: 'Afternoon (12pm-5pm)',
    slots: 5, // 12:00, 13:00, 14:00, 15:00, 16:00 (5 hour-slots, ends at 17:00)
  },
  PRIME: {
    start: '17:00',
    end: '21:00',
    label: 'Prime (5pm-9pm)',
    slots: 4, // 17:00, 18:00, 19:00, 20:00 (4 hour-slots, ends at 21:00)
  },
};

// Total 1-hour slots per day: 13 (from 8:00 to 21:00)
export const TOTAL_SLOTS_PER_DAY = 13;
export const TOTAL_COURTS = CONFIG.TOTAL_COURTS; // 17

/**
 * Get total available slots for a time period (all courts)
 * @param {string} period - 'MORNING', 'AFTERNOON', or 'PRIME'
 * @returns {number}
 */
export function getTotalSlotsForPeriod(period) {
  const periodConfig = TIME_PERIODS[period];
  if (!periodConfig) return 0;
  return periodConfig.slots * TOTAL_COURTS;
}

/**
 * Get total available slots for a full day (all courts)
 * @returns {number}
 */
export function getTotalSlotsForDay() {
  return TOTAL_SLOTS_PER_DAY * TOTAL_COURTS; // 221
}

/**
 * Check if a time falls within a period
 * @param {string} time - Time in HH:MM format
 * @param {object} period - Period config with start/end
 * @returns {boolean}
 */
function isTimeInPeriod(time, period) {
  const timeMinutes = parseTimeToMinutes(time);
  const startMinutes = parseTimeToMinutes(period.start);
  const endMinutes = parseTimeToMinutes(period.end);
  return timeMinutes >= startMinutes && timeMinutes < endMinutes;
}

/**
 * Calculate booking duration in hours
 * @param {object} booking
 * @returns {number}
 */
export function getBookingDurationHours(booking) {
  const startMinutes = parseTimeToMinutes(booking.time_start);
  const endMinutes = parseTimeToMinutes(booking.time_end);
  return (endMinutes - startMinutes) / 60;
}

/**
 * Calculate how many 1-hour slots a booking occupies in a given period
 * @param {object} booking
 * @param {object} period - Period config
 * @returns {number}
 */
function getBookingSlotsInPeriod(booking, period) {
  const bookingStart = parseTimeToMinutes(booking.time_start);
  const bookingEnd = parseTimeToMinutes(booking.time_end);
  const periodStart = parseTimeToMinutes(period.start);
  const periodEnd = parseTimeToMinutes(period.end);

  // Find overlap
  const overlapStart = Math.max(bookingStart, periodStart);
  const overlapEnd = Math.min(bookingEnd, periodEnd);

  if (overlapStart >= overlapEnd) return 0;

  // Convert to hours (1-hour slots)
  return (overlapEnd - overlapStart) / 60;
}

/**
 * Get booked slots for a specific date and period
 * @param {Array} bookings - All bookings
 * @param {string} date - Date in YYYY-MM-DD format
 * @param {string} periodKey - 'MORNING', 'AFTERNOON', or 'PRIME'
 * @returns {number}
 */
export function getBookedSlotsForPeriod(bookings, date, periodKey) {
  const period = TIME_PERIODS[periodKey];
  if (!period) return 0;

  const dayBookings = bookings.filter(b =>
    b.date === date &&
    b.status !== BOOKING_STATUS.CANCELLED
  );

  let totalSlots = 0;
  dayBookings.forEach(booking => {
    totalSlots += getBookingSlotsInPeriod(booking, period);
  });

  return Math.round(totalSlots); // Round to handle any floating point issues
}

/**
 * Get booked slots for a full day
 * @param {Array} bookings
 * @param {string} date
 * @returns {number}
 */
export function getBookedSlotsForDay(bookings, date) {
  return Object.keys(TIME_PERIODS).reduce((total, periodKey) => {
    return total + getBookedSlotsForPeriod(bookings, date, periodKey);
  }, 0);
}

/**
 * Calculate utilization percentage
 * @param {number} booked
 * @param {number} total
 * @returns {number} Percentage 0-100
 */
export function calculateUtilization(booked, total) {
  if (total === 0) return 0;
  return Math.round((booked / total) * 100);
}

/**
 * Get utilization stats for a date
 * @param {Array} bookings
 * @param {string} date
 * @returns {object}
 */
export function getDailyUtilization(bookings, date) {
  const stats = {};

  Object.keys(TIME_PERIODS).forEach(periodKey => {
    const total = getTotalSlotsForPeriod(periodKey);
    const booked = getBookedSlotsForPeriod(bookings, date, periodKey);
    stats[periodKey] = {
      label: TIME_PERIODS[periodKey].label,
      booked,
      total,
      available: total - booked,
      utilization: calculateUtilization(booked, total),
    };
  });

  // Total for day
  const totalSlots = getTotalSlotsForDay();
  const totalBooked = getBookedSlotsForDay(bookings, date);
  stats.TOTAL = {
    label: 'Total',
    booked: totalBooked,
    total: totalSlots,
    available: totalSlots - totalBooked,
    utilization: calculateUtilization(totalBooked, totalSlots),
  };

  return stats;
}

/**
 * Get available slots grouped by time for a date
 * @param {Array} bookings
 * @param {Array} closures
 * @param {string} date
 * @returns {object} Grouped by period, then by time
 */
export function getAvailableSlots(bookings, closures, date) {
  const dayBookings = bookings.filter(b =>
    b.date === date &&
    b.status !== BOOKING_STATUS.CANCELLED
  );

  // Generate all 1-hour time slots starting from 8am
  const slots = ['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00'];

  const result = {
    MORNING: {},
    AFTERNOON: {},
    PRIME: {},
  };

  slots.forEach(time => {
    // Determine which period this slot belongs to
    let periodKey = null;
    Object.keys(TIME_PERIODS).forEach(key => {
      if (isTimeInPeriod(time, TIME_PERIODS[key])) {
        periodKey = key;
      }
    });

    if (!periodKey) return;

    // Find which courts are available at this time
    const availableCourts = [];
    for (let court = 1; court <= TOTAL_COURTS; court++) {
      // Check if court is booked at this time
      const isBooked = dayBookings.some(b => {
        if (parseInt(b.court, 10) !== court) return false;
        const bookingStart = parseTimeToMinutes(b.time_start);
        const bookingEnd = parseTimeToMinutes(b.time_end);
        const slotStart = parseTimeToMinutes(time);
        const slotEnd = slotStart + 60; // 1-hour slot
        return slotStart < bookingEnd && slotEnd > bookingStart;
      });

      // Check if court is closed
      const isClosed = closures?.some(c => {
        if (c.date !== date) return false;
        if (c.court !== 'all' && parseInt(c.court, 10) !== court) return false;
        const closureStart = parseTimeToMinutes(c.time_start);
        const closureEnd = parseTimeToMinutes(c.time_end);
        const slotStart = parseTimeToMinutes(time);
        return slotStart >= closureStart && slotStart < closureEnd;
      });

      if (!isBooked && !isClosed) {
        availableCourts.push(court === CONFIG.STADIUM_COURT_NUMBER ? 'Stadium' : `${court}`);
      }
    }

    if (availableCourts.length > 0) {
      result[periodKey][time] = availableCourts;
    }
  });

  return result;
}

// ============================================
// REVENUE CALCULATIONS
// ============================================

/**
 * Calculate expected revenue for bookings
 * @param {Array} bookings
 * @returns {number}
 */
export function calculateExpectedRevenue(bookings) {
  return bookings
    .filter(b => b.status !== BOOKING_STATUS.CANCELLED)
    .reduce((total, b) => {
      const amount = parseFloat(b.payment_amount) || 0;
      return total + amount;
    }, 0);
}

/**
 * Calculate collected revenue (paid bookings)
 * @param {Array} bookings
 * @returns {number}
 */
export function calculateCollectedRevenue(bookings) {
  return bookings
    .filter(b => b.payment_status === 'paid')
    .reduce((total, b) => {
      const amount = parseFloat(b.payment_amount) || 0;
      return total + amount;
    }, 0);
}

/**
 * Calculate pending revenue
 * @param {Array} bookings
 * @returns {number}
 */
export function calculatePendingRevenue(bookings) {
  return bookings
    .filter(b =>
      b.status !== BOOKING_STATUS.CANCELLED &&
      b.payment_status === 'pending'
    )
    .reduce((total, b) => {
      const amount = parseFloat(b.payment_amount) || 0;
      return total + amount;
    }, 0);
}

/**
 * Get revenue breakdown for a date
 * @param {Array} bookings
 * @param {string} date
 * @returns {object}
 */
export function getDailyRevenue(bookings, date) {
  const dayBookings = bookings.filter(b => b.date === date);
  return {
    expected: calculateExpectedRevenue(dayBookings),
    collected: calculateCollectedRevenue(dayBookings),
    pending: calculatePendingRevenue(dayBookings),
  };
}

// ============================================
// BOOKING ACTIVITY / EFFICIENCY
// ============================================

/**
 * Get booking activity stats for a date
 * @param {Array} bookings
 * @param {string} date
 * @returns {object}
 */
export function getDailyActivity(bookings, date) {
  const dayBookings = bookings.filter(b => b.date === date);

  const total = dayBookings.length;
  const checkedIn = dayBookings.filter(b => b.check_in_time).length;
  const noShows = dayBookings.filter(b => b.status === BOOKING_STATUS.NO_SHOW).length;
  const cancelled = dayBookings.filter(b => b.status === BOOKING_STATUS.CANCELLED);

  // Breakdown cancellations by reason
  const cancelByReason = {
    weather: cancelled.filter(b => b.cancel_reason === CANCEL_REASONS.WEATHER).length,
    customer: cancelled.filter(b => b.cancel_reason === CANCEL_REASONS.CUSTOMER).length,
    facility: cancelled.filter(b => b.cancel_reason === CANCEL_REASONS.FACILITY).length,
    other: cancelled.filter(b =>
      !b.cancel_reason ||
      b.cancel_reason === CANCEL_REASONS.OTHER
    ).length,
  };

  return {
    total,
    checkedIn,
    noShows,
    cancellations: cancelled.length,
    cancelByReason,
    active: dayBookings.filter(b => b.status === BOOKING_STATUS.ACTIVE || !b.status).length,
  };
}

/**
 * Get booking efficiency stats for a date range
 * @param {Array} bookings
 * @param {string} startDate
 * @param {string} endDate
 * @returns {object}
 */
export function getBookingEfficiency(bookings, startDate, endDate) {
  const rangeBookings = bookings.filter(b =>
    b.date >= startDate && b.date <= endDate
  );

  const total = rangeBookings.length;
  if (total === 0) {
    return {
      total: 0,
      completed: 0,
      cancelled: 0,
      noShows: 0,
      checkedIn: 0,
      completedRate: 0,
      cancelledRate: 0,
      noShowRate: 0,
      checkInRate: 0,
    };
  }

  const completed = rangeBookings.filter(b =>
    b.status === BOOKING_STATUS.COMPLETED ||
    (b.status === BOOKING_STATUS.ACTIVE && b.date < formatDateISO(new Date()))
  ).length;
  const cancelled = rangeBookings.filter(b => b.status === BOOKING_STATUS.CANCELLED).length;
  const noShows = rangeBookings.filter(b => b.status === BOOKING_STATUS.NO_SHOW).length;
  const checkedIn = rangeBookings.filter(b => b.check_in_time).length;

  return {
    total,
    completed,
    cancelled,
    noShows,
    checkedIn,
    completedRate: calculateUtilization(completed, total),
    cancelledRate: calculateUtilization(cancelled, total),
    noShowRate: calculateUtilization(noShows, total),
    checkInRate: completed > 0 ? calculateUtilization(checkedIn, completed) : 0,
  };
}

// ============================================
// CONTRACTOR CALCULATIONS
// ============================================

/**
 * Get contractor hours for a date
 * @param {Array} bookings
 * @param {Array} contractors
 * @param {string} date
 * @returns {Array}
 */
export function getContractorHoursForDate(bookings, contractors, date) {
  const dayBookings = bookings.filter(b =>
    b.date === date &&
    b.booking_type === BOOKING_TYPES.CONTRACTOR &&
    b.status !== BOOKING_STATUS.CANCELLED
  );

  // Group by contractor
  const contractorMap = new Map();

  dayBookings.forEach(booking => {
    const contractorId = booking.entity_id;
    if (!contractorMap.has(contractorId)) {
      // Find contractor name
      const contractor = contractors?.find(c => c.contractor_id === contractorId);
      contractorMap.set(contractorId, {
        id: contractorId,
        name: contractor?.name || booking.customer_name || 'Unknown',
        bookings: [],
        totalHours: 0,
      });
    }

    const entry = contractorMap.get(contractorId);
    entry.bookings.push(booking);
    entry.totalHours += getBookingDurationHours(booking);
  });

  // Convert to array and sort by hours
  return Array.from(contractorMap.values())
    .sort((a, b) => b.totalHours - a.totalHours);
}

/**
 * Get contractor hours for a date range
 * @param {Array} bookings
 * @param {Array} contractors
 * @param {string} startDate
 * @param {string} endDate
 * @returns {Array}
 */
export function getContractorHoursForRange(bookings, contractors, startDate, endDate) {
  const rangeBookings = bookings.filter(b =>
    b.date >= startDate &&
    b.date <= endDate &&
    b.booking_type === BOOKING_TYPES.CONTRACTOR &&
    b.status !== BOOKING_STATUS.CANCELLED
  );

  const contractorMap = new Map();

  rangeBookings.forEach(booking => {
    const contractorId = booking.entity_id;
    if (!contractorMap.has(contractorId)) {
      const contractor = contractors?.find(c => c.contractor_id === contractorId);
      contractorMap.set(contractorId, {
        id: contractorId,
        name: contractor?.name || booking.customer_name || 'Unknown',
        totalHours: 0,
        revenue: 0,
      });
    }

    const entry = contractorMap.get(contractorId);
    entry.totalHours += getBookingDurationHours(booking);
    entry.revenue += parseFloat(booking.payment_amount) || 0;
  });

  return Array.from(contractorMap.values())
    .sort((a, b) => b.totalHours - a.totalHours);
}

// ============================================
// TEAM CALCULATIONS
// ============================================

/**
 * Get team hours for a date range
 * @param {Array} bookings
 * @param {Array} teams
 * @param {string} startDate
 * @param {string} endDate
 * @returns {Array}
 */
export function getTeamHoursForRange(bookings, teams, startDate, endDate) {
  const rangeBookings = bookings.filter(b =>
    b.date >= startDate &&
    b.date <= endDate &&
    b.booking_type?.startsWith('team_') &&
    b.status !== BOOKING_STATUS.CANCELLED
  );

  const teamMap = new Map();

  rangeBookings.forEach(booking => {
    const teamId = booking.entity_id;
    if (!teamMap.has(teamId)) {
      const team = teams?.find(t => t.team_id === teamId);
      teamMap.set(teamId, {
        id: teamId,
        name: team?.team_name || team?.name || booking.customer_name || 'Unknown Team',
        type: booking.booking_type, // booking_type like team_usta, team_hs
        displayType: team?.team_type || '', // Display type like "Spring", "Mixed Doubles"
        category: team?.team_category || '', // Category like usta_adult, team_hs
        totalHours: 0,
        revenue: 0,
      });
    }

    const entry = teamMap.get(teamId);
    entry.totalHours += getBookingDurationHours(booking);
    entry.revenue += parseFloat(booking.payment_amount) || 0;
  });

  return Array.from(teamMap.values())
    .sort((a, b) => b.totalHours - a.totalHours);
}

// ============================================
// BOOKING TYPE BREAKDOWN
// ============================================

/**
 * Get hours breakdown by booking type for a date range
 * @param {Array} bookings
 * @param {string} startDate
 * @param {string} endDate
 * @returns {object}
 */
export function getBookingTypeBreakdown(bookings, startDate, endDate) {
  const rangeBookings = bookings.filter(b =>
    b.date >= startDate &&
    b.date <= endDate &&
    b.status !== BOOKING_STATUS.CANCELLED
  );

  const breakdown = {
    [BOOKING_TYPES.OPEN]: { hours: 0, label: 'Open Play' },
    [BOOKING_TYPES.CONTRACTOR]: { hours: 0, label: 'Contractors' },
    team: { hours: 0, label: 'Teams' }, // Combined teams
    [BOOKING_TYPES.TOURNAMENT]: { hours: 0, label: 'Tournament' },
    [BOOKING_TYPES.MAINTENANCE]: { hours: 0, label: 'Maintenance' },
    [BOOKING_TYPES.HOLD]: { hours: 0, label: 'Hold' },
  };

  let totalHours = 0;

  rangeBookings.forEach(booking => {
    const hours = getBookingDurationHours(booking);
    totalHours += hours;

    if (booking.booking_type?.startsWith('team_')) {
      breakdown.team.hours += hours;
    } else if (breakdown[booking.booking_type]) {
      breakdown[booking.booking_type].hours += hours;
    }
  });

  // Calculate percentages
  Object.keys(breakdown).forEach(key => {
    breakdown[key].percentage = totalHours > 0
      ? Math.round((breakdown[key].hours / totalHours) * 100)
      : 0;
  });

  return { breakdown, totalHours };
}

// ============================================
// WEEKLY COMPARISON
// ============================================

/**
 * Get week start (Monday) for a date
 * @param {Date|string} date
 * @returns {Date}
 */
export function getWeekStart(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(d.setDate(diff));
}

/**
 * Get week end (Sunday) for a date
 * @param {Date|string} date
 * @returns {Date}
 */
export function getWeekEnd(date) {
  const weekStart = getWeekStart(date);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);
  return weekEnd;
}

/**
 * Get utilization comparison between two weeks
 * @param {Array} bookings
 * @param {Date} currentWeekStart
 * @returns {object}
 */
export function getWeeklyComparison(bookings, currentWeekStart) {
  const thisWeekStart = formatDateISO(currentWeekStart);
  const thisWeekEnd = formatDateISO(getWeekEnd(currentWeekStart));

  const lastWeekStartDate = new Date(currentWeekStart);
  lastWeekStartDate.setDate(lastWeekStartDate.getDate() - 7);
  const lastWeekStart = formatDateISO(lastWeekStartDate);
  const lastWeekEnd = formatDateISO(getWeekEnd(lastWeekStartDate));

  // Calculate total slots for week (7 days)
  const weekTotalSlots = getTotalSlotsForDay() * 7;
  const weekPrimeSlots = getTotalSlotsForPeriod('PRIME') * 7;
  const weekNonPrimeSlots = (getTotalSlotsForPeriod('MORNING') + getTotalSlotsForPeriod('AFTERNOON')) * 7;
  const weekendSlots = getTotalSlotsForDay() * 2; // Sat + Sun

  // This week stats
  const thisWeekBookings = bookings.filter(b =>
    b.date >= thisWeekStart &&
    b.date <= thisWeekEnd &&
    b.status !== BOOKING_STATUS.CANCELLED
  );

  // Last week stats
  const lastWeekBookings = bookings.filter(b =>
    b.date >= lastWeekStart &&
    b.date <= lastWeekEnd &&
    b.status !== BOOKING_STATUS.CANCELLED
  );

  // Helper to calculate booked slots for date range
  const calculateWeekSlots = (weekBookings) => {
    let total = 0;
    let prime = 0;
    let nonPrime = 0;
    let weekend = 0;

    weekBookings.forEach(b => {
      const hours = getBookingDurationHours(b);
      total += hours;

      // Check if prime time
      const startMinutes = parseTimeToMinutes(b.time_start);
      if (startMinutes >= parseTimeToMinutes('17:00')) {
        prime += hours;
      } else {
        nonPrime += hours;
      }

      // Check if weekend
      const bookingDate = new Date(b.date + 'T12:00:00');
      const dayOfWeek = bookingDate.getDay();
      if (dayOfWeek === 0 || dayOfWeek === 6) {
        weekend += hours;
      }
    });

    return { total, prime, nonPrime, weekend };
  };

  const thisWeekSlots = calculateWeekSlots(thisWeekBookings);
  const lastWeekSlots = calculateWeekSlots(lastWeekBookings);

  return {
    thisWeek: {
      overall: calculateUtilization(thisWeekSlots.total, weekTotalSlots),
      prime: calculateUtilization(thisWeekSlots.prime, weekPrimeSlots),
      nonPrime: calculateUtilization(thisWeekSlots.nonPrime, weekNonPrimeSlots),
      weekend: calculateUtilization(thisWeekSlots.weekend, weekendSlots),
    },
    lastWeek: {
      overall: calculateUtilization(lastWeekSlots.total, weekTotalSlots),
      prime: calculateUtilization(lastWeekSlots.prime, weekPrimeSlots),
      nonPrime: calculateUtilization(lastWeekSlots.nonPrime, weekNonPrimeSlots),
      weekend: calculateUtilization(lastWeekSlots.weekend, weekendSlots),
    },
    change: {
      overall: calculateUtilization(thisWeekSlots.total, weekTotalSlots) - calculateUtilization(lastWeekSlots.total, weekTotalSlots),
      prime: calculateUtilization(thisWeekSlots.prime, weekPrimeSlots) - calculateUtilization(lastWeekSlots.prime, weekPrimeSlots),
      nonPrime: calculateUtilization(thisWeekSlots.nonPrime, weekNonPrimeSlots) - calculateUtilization(lastWeekSlots.nonPrime, weekNonPrimeSlots),
      weekend: calculateUtilization(thisWeekSlots.weekend, weekendSlots) - calculateUtilization(lastWeekSlots.weekend, weekendSlots),
    },
  };
}

// ============================================
// REVENUE FOR RANGES
// ============================================

/**
 * Get revenue for a date range
 * @param {Array} bookings
 * @param {string} startDate
 * @param {string} endDate
 * @returns {object}
 */
export function getRevenueForRange(bookings, startDate, endDate) {
  const rangeBookings = bookings.filter(b =>
    b.date >= startDate && b.date <= endDate
  );

  // Breakdown by type
  const byType = {
    courtRentals: 0, // open play
    contractors: 0,
    leagues: 0, // teams
    tournaments: 0,
  };

  rangeBookings.forEach(b => {
    if (b.status === BOOKING_STATUS.CANCELLED) return;
    const amount = parseFloat(b.payment_amount) || 0;

    if (b.booking_type === BOOKING_TYPES.OPEN) {
      byType.courtRentals += amount;
    } else if (b.booking_type === BOOKING_TYPES.CONTRACTOR) {
      byType.contractors += amount;
    } else if (b.booking_type?.startsWith('team_')) {
      byType.leagues += amount;
    } else if (b.booking_type === BOOKING_TYPES.TOURNAMENT) {
      byType.tournaments += amount;
    }
  });

  return {
    total: calculateExpectedRevenue(rangeBookings),
    collected: calculateCollectedRevenue(rangeBookings),
    pending: calculatePendingRevenue(rangeBookings),
    byType,
  };
}

/**
 * Format currency for display
 * @param {number} amount
 * @returns {string}
 */
export function formatCurrency(amount) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Format time for display (convert HH:MM to readable)
 * @param {string} time - HH:MM format
 * @returns {string}
 */
export function formatTimeForReport(time) {
  const [hours, minutes] = time.split(':').map(Number);
  const period = hours >= 12 ? 'pm' : 'am';
  const displayHour = hours > 12 ? hours - 12 : hours === 0 ? 12 : hours;
  return minutes === 0 ? `${displayHour}${period}` : `${displayHour}:${String(minutes).padStart(2, '0')}${period}`;
}

// ============================================
// AVAILABILITY GRID
// ============================================

/**
 * Get availability grid for color-coded display
 * Returns a grid of slot availability by time and court
 * @param {Array} bookings
 * @param {Array} closures
 * @param {string} date
 * @returns {object} { slots: [{time, label, courts: [{ court, available, closed }]}], closedCount }
 */
export function getAvailabilityGrid(bookings, closures, date) {
  const dayBookings = bookings.filter(b =>
    b.date === date &&
    b.status !== BOOKING_STATUS.CANCELLED
  );

  const dayClosures = closures?.filter(c => c.date === date) || [];

  // Generate all 1-hour time slots starting from 8am
  const timeSlots = [
    { time: '08:00', label: '8am' },
    { time: '09:00', label: '9am' },
    { time: '10:00', label: '10am' },
    { time: '11:00', label: '11am' },
    { time: '12:00', label: '12pm' },
    { time: '13:00', label: '1pm' },
    { time: '14:00', label: '2pm' },
    { time: '15:00', label: '3pm' },
    { time: '16:00', label: '4pm' },
    { time: '17:00', label: '5pm' },
    { time: '18:00', label: '6pm' },
    { time: '19:00', label: '7pm' },
    { time: '20:00', label: '8pm' },
  ];

  let closedCount = 0;

  const slots = timeSlots.map(({ time, label }) => {
    const slotStart = parseTimeToMinutes(time);
    const slotEnd = slotStart + 60;

    // Determine which period this slot belongs to
    let period = 'MORNING';
    if (slotStart >= parseTimeToMinutes('12:00') && slotStart < parseTimeToMinutes('17:00')) {
      period = 'AFTERNOON';
    } else if (slotStart >= parseTimeToMinutes('17:00')) {
      period = 'PRIME';
    }

    const courts = [];
    for (let court = 1; court <= TOTAL_COURTS; court++) {
      // Check if court is closed at this time
      const isClosed = dayClosures.some(c => {
        if (c.court !== 'all' && parseInt(c.court, 10) !== court) return false;
        const closureStart = parseTimeToMinutes(c.time_start);
        const closureEnd = parseTimeToMinutes(c.time_end);
        return slotStart < closureEnd && slotEnd > closureStart;
      });

      if (isClosed) {
        closedCount++;
        courts.push({ court, available: false, closed: true });
        continue;
      }

      // Check if court is booked at this time
      const isBooked = dayBookings.some(b => {
        if (parseInt(b.court, 10) !== court) return false;
        const bookingStart = parseTimeToMinutes(b.time_start);
        const bookingEnd = parseTimeToMinutes(b.time_end);
        return slotStart < bookingEnd && slotEnd > bookingStart;
      });

      courts.push({ court, available: !isBooked, closed: false });
    }

    return { time, label, period, courts };
  });

  return { slots, closedCount };
}

// ============================================
// PARTICIPATION METRICS
// ============================================

/**
 * Get participation metrics for a date range
 * @param {Array} bookings
 * @param {string} startDate
 * @param {string} endDate
 * @returns {object}
 */
export function getParticipationMetrics(bookings, startDate, endDate) {
  const rangeBookings = bookings.filter(b =>
    b.date >= startDate &&
    b.date <= endDate &&
    b.status !== BOOKING_STATUS.CANCELLED
  );

  let totalParticipants = 0;
  let adultParticipants = 0;
  let youthParticipants = 0;

  // Breakdown by booking type
  const byType = {
    open: { participants: 0, youth: 0 },
    contractor: { participants: 0, youth: 0 },
    team: { participants: 0, youth: 0 },
    tournament: { participants: 0, youth: 0 },
  };

  rangeBookings.forEach(booking => {
    const count = parseInt(booking.participant_count, 10) || 2; // Default to 2 if not set
    const isYouth = booking.is_youth === 'TRUE' || booking.is_youth === true;

    totalParticipants += count;
    if (isYouth) {
      youthParticipants += count;
    } else {
      adultParticipants += count;
    }

    // Categorize by booking type
    if (booking.booking_type === BOOKING_TYPES.OPEN) {
      byType.open.participants += count;
      if (isYouth) byType.open.youth += count;
    } else if (booking.booking_type === BOOKING_TYPES.CONTRACTOR) {
      byType.contractor.participants += count;
      if (isYouth) byType.contractor.youth += count;
    } else if (booking.booking_type?.startsWith('team_')) {
      byType.team.participants += count;
      if (isYouth) byType.team.youth += count;
    } else if (booking.booking_type === BOOKING_TYPES.TOURNAMENT) {
      byType.tournament.participants += count;
      if (isYouth) byType.tournament.youth += count;
    }
  });

  const youthPercentage = totalParticipants > 0
    ? Math.round((youthParticipants / totalParticipants) * 100)
    : 0;

  return {
    total: totalParticipants,
    adults: adultParticipants,
    youth: youthParticipants,
    youthPercentage,
    byType,
    bookingCount: rangeBookings.length,
    avgPerBooking: rangeBookings.length > 0
      ? Math.round((totalParticipants / rangeBookings.length) * 10) / 10
      : 0,
  };
}

// ============================================
// MONTHLY REPORT UTILITIES
// ============================================

/**
 * Get first day of month for a date
 * @param {Date|string} date
 * @returns {Date}
 */
export function getMonthStart(date) {
  const d = new Date(date);
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

/**
 * Get last day of month for a date
 * @param {Date|string} date
 * @returns {Date}
 */
export function getMonthEnd(date) {
  const d = new Date(date);
  return new Date(d.getFullYear(), d.getMonth() + 1, 0);
}

/**
 * Get YTD date range (Jan 1 to end of given month)
 * @param {Date|string} date
 * @returns {object} { start, end }
 */
export function getYTDRange(date) {
  const d = new Date(date);
  return {
    start: formatDateISO(new Date(d.getFullYear(), 0, 1)),
    end: formatDateISO(getMonthEnd(d)),
  };
}

/**
 * Get total court hours for a date range
 * @param {Array} bookings
 * @param {string} startDate
 * @param {string} endDate
 * @returns {number}
 */
export function getTotalCourtHours(bookings, startDate, endDate) {
  const rangeBookings = bookings.filter(b =>
    b.date >= startDate &&
    b.date <= endDate &&
    b.status !== BOOKING_STATUS.CANCELLED
  );

  return rangeBookings.reduce((total, b) => total + getBookingDurationHours(b), 0);
}

/**
 * Calculate revenue per court hour
 * @param {number} revenue
 * @param {number} hours
 * @returns {number}
 */
export function getRevenuePerCourtHour(revenue, hours) {
  if (hours === 0) return 0;
  return Math.round((revenue / hours) * 100) / 100;
}

/**
 * Get waived value tracking
 * @param {Array} bookings
 * @param {string} startDate
 * @param {string} endDate
 * @param {number} defaultHourlyRate - fallback rate if no payment_amount
 * @returns {object}
 */
export function getWaivedValue(bookings, startDate, endDate, defaultHourlyRate = 12) {
  const waivedBookings = bookings.filter(b =>
    b.date >= startDate &&
    b.date <= endDate &&
    b.status !== BOOKING_STATUS.CANCELLED &&
    b.payment_status === 'waived'
  );

  let totalValue = 0;
  waivedBookings.forEach(b => {
    // Use payment_amount if set, otherwise estimate from hours
    if (b.payment_amount && parseFloat(b.payment_amount) > 0) {
      totalValue += parseFloat(b.payment_amount);
    } else {
      totalValue += getBookingDurationHours(b) * defaultHourlyRate;
    }
  });

  return {
    count: waivedBookings.length,
    value: totalValue,
    hours: waivedBookings.reduce((sum, b) => sum + getBookingDurationHours(b), 0),
  };
}

/**
 * Get tournament metrics for a date range
 * @param {Array} bookings
 * @param {Array} tournaments
 * @param {string} startDate
 * @param {string} endDate
 * @returns {object}
 */
export function getTournamentMetrics(bookings, tournaments, startDate, endDate) {
  // Find tournaments that overlap with date range
  const rangeTournaments = tournaments.filter(t => {
    if (t.status === 'cancelled') return false;
    const tStart = t.start_date;
    const tEnd = t.end_date || t.start_date;
    return tStart <= endDate && tEnd >= startDate;
  });

  // Get tournament bookings in range
  const tournamentBookings = bookings.filter(b =>
    b.date >= startDate &&
    b.date <= endDate &&
    b.booking_type === BOOKING_TYPES.TOURNAMENT &&
    b.status !== BOOKING_STATUS.CANCELLED
  );

  const courtHours = tournamentBookings.reduce((sum, b) => sum + getBookingDurationHours(b), 0);

  // Get unique courts used
  const courtsUsed = new Set(tournamentBookings.map(b => b.court));

  return {
    eventsHosted: rangeTournaments.length,
    tournaments: rangeTournaments,
    courtHours,
    courtsUsed: courtsUsed.size,
    bookingCount: tournamentBookings.length,
  };
}

/**
 * Get monthly comparison (MoM analysis)
 * @param {Array} bookings
 * @param {Date} currentMonthStart
 * @returns {object}
 */
export function getMonthlyComparison(bookings, currentMonthStart) {
  const thisMonthStart = formatDateISO(currentMonthStart);
  const thisMonthEnd = formatDateISO(getMonthEnd(currentMonthStart));

  const lastMonthDate = new Date(currentMonthStart);
  lastMonthDate.setMonth(lastMonthDate.getMonth() - 1);
  const lastMonthStart = formatDateISO(getMonthStart(lastMonthDate));
  const lastMonthEnd = formatDateISO(getMonthEnd(lastMonthDate));

  // Calculate days in each month for fair comparison
  const thisMonthDays = new Date(currentMonthStart.getFullYear(), currentMonthStart.getMonth() + 1, 0).getDate();
  const lastMonthDays = new Date(lastMonthDate.getFullYear(), lastMonthDate.getMonth() + 1, 0).getDate();

  // Total slots per month
  const thisMonthTotalSlots = getTotalSlotsForDay() * thisMonthDays;
  const lastMonthTotalSlots = getTotalSlotsForDay() * lastMonthDays;
  const thisMonthPrimeSlots = getTotalSlotsForPeriod('PRIME') * thisMonthDays;
  const lastMonthPrimeSlots = getTotalSlotsForPeriod('PRIME') * lastMonthDays;

  // This month bookings
  const thisMonthBookings = bookings.filter(b =>
    b.date >= thisMonthStart &&
    b.date <= thisMonthEnd &&
    b.status !== BOOKING_STATUS.CANCELLED
  );

  // Last month bookings
  const lastMonthBookings = bookings.filter(b =>
    b.date >= lastMonthStart &&
    b.date <= lastMonthEnd &&
    b.status !== BOOKING_STATUS.CANCELLED
  );

  // Calculate hours
  const calcHours = (monthBookings) => {
    let total = 0;
    let prime = 0;
    monthBookings.forEach(b => {
      const hours = getBookingDurationHours(b);
      total += hours;
      const startMinutes = parseTimeToMinutes(b.time_start);
      if (startMinutes >= parseTimeToMinutes('17:00')) {
        prime += hours;
      }
    });
    return { total, prime };
  };

  const thisMonthHours = calcHours(thisMonthBookings);
  const lastMonthHours = calcHours(lastMonthBookings);

  // Revenue
  const thisMonthRevenue = calculateExpectedRevenue(thisMonthBookings);
  const lastMonthRevenue = calculateExpectedRevenue(lastMonthBookings);

  return {
    thisMonth: {
      hours: thisMonthHours.total,
      primeHours: thisMonthHours.prime,
      revenue: thisMonthRevenue,
      utilization: calculateUtilization(thisMonthHours.total, thisMonthTotalSlots),
      primeUtilization: calculateUtilization(thisMonthHours.prime, thisMonthPrimeSlots),
      bookings: thisMonthBookings.length,
    },
    lastMonth: {
      hours: lastMonthHours.total,
      primeHours: lastMonthHours.prime,
      revenue: lastMonthRevenue,
      utilization: calculateUtilization(lastMonthHours.total, lastMonthTotalSlots),
      primeUtilization: calculateUtilization(lastMonthHours.prime, lastMonthPrimeSlots),
      bookings: lastMonthBookings.length,
    },
    change: {
      hours: Math.round(thisMonthHours.total - lastMonthHours.total),
      revenue: thisMonthRevenue - lastMonthRevenue,
      utilization: calculateUtilization(thisMonthHours.total, thisMonthTotalSlots) -
        calculateUtilization(lastMonthHours.total, lastMonthTotalSlots),
      primeUtilization: calculateUtilization(thisMonthHours.prime, thisMonthPrimeSlots) -
        calculateUtilization(lastMonthHours.prime, lastMonthPrimeSlots),
    },
  };
}

/**
 * Get YoY comparison for a month
 * @param {Array} bookings
 * @param {Date} currentMonthStart
 * @returns {object}
 */
export function getYearOverYearComparison(bookings, currentMonthStart) {
  const thisMonthStart = formatDateISO(currentMonthStart);
  const thisMonthEnd = formatDateISO(getMonthEnd(currentMonthStart));

  const lastYearDate = new Date(currentMonthStart);
  lastYearDate.setFullYear(lastYearDate.getFullYear() - 1);
  const lastYearMonthStart = formatDateISO(getMonthStart(lastYearDate));
  const lastYearMonthEnd = formatDateISO(getMonthEnd(lastYearDate));

  // This year bookings
  const thisYearBookings = bookings.filter(b =>
    b.date >= thisMonthStart &&
    b.date <= thisMonthEnd &&
    b.status !== BOOKING_STATUS.CANCELLED
  );

  // Last year same month bookings
  const lastYearBookings = bookings.filter(b =>
    b.date >= lastYearMonthStart &&
    b.date <= lastYearMonthEnd &&
    b.status !== BOOKING_STATUS.CANCELLED
  );

  const thisYearHours = thisYearBookings.reduce((sum, b) => sum + getBookingDurationHours(b), 0);
  const lastYearHours = lastYearBookings.reduce((sum, b) => sum + getBookingDurationHours(b), 0);
  const thisYearRevenue = calculateExpectedRevenue(thisYearBookings);
  const lastYearRevenue = calculateExpectedRevenue(lastYearBookings);

  return {
    thisYear: {
      hours: thisYearHours,
      revenue: thisYearRevenue,
      bookings: thisYearBookings.length,
    },
    lastYear: {
      hours: lastYearHours,
      revenue: lastYearRevenue,
      bookings: lastYearBookings.length,
    },
    change: {
      hours: Math.round(thisYearHours - lastYearHours),
      revenue: thisYearRevenue - lastYearRevenue,
      hoursPercent: lastYearHours > 0 ? Math.round(((thisYearHours - lastYearHours) / lastYearHours) * 100) : 0,
      revenuePercent: lastYearRevenue > 0 ? Math.round(((thisYearRevenue - lastYearRevenue) / lastYearRevenue) * 100) : 0,
    },
    hasLastYearData: lastYearBookings.length > 0,
  };
}

/**
 * Get participation comparison (MoM and YoY)
 * @param {Array} bookings
 * @param {Date} currentMonthStart
 * @returns {object}
 */
export function getParticipationComparison(bookings, currentMonthStart) {
  const thisMonthStart = formatDateISO(currentMonthStart);
  const thisMonthEnd = formatDateISO(getMonthEnd(currentMonthStart));

  // Last month
  const lastMonthDate = new Date(currentMonthStart);
  lastMonthDate.setMonth(lastMonthDate.getMonth() - 1);
  const lastMonthStart = formatDateISO(getMonthStart(lastMonthDate));
  const lastMonthEnd = formatDateISO(getMonthEnd(lastMonthDate));

  // Last year same month
  const lastYearDate = new Date(currentMonthStart);
  lastYearDate.setFullYear(lastYearDate.getFullYear() - 1);
  const lastYearMonthStart = formatDateISO(getMonthStart(lastYearDate));
  const lastYearMonthEnd = formatDateISO(getMonthEnd(lastYearDate));

  const thisMonth = getParticipationMetrics(bookings, thisMonthStart, thisMonthEnd);
  const lastMonth = getParticipationMetrics(bookings, lastMonthStart, lastMonthEnd);
  const lastYear = getParticipationMetrics(bookings, lastYearMonthStart, lastYearMonthEnd);

  return {
    thisMonth,
    lastMonth,
    lastYear,
    momChange: {
      total: thisMonth.total - lastMonth.total,
      adults: thisMonth.adults - lastMonth.adults,
      youth: thisMonth.youth - lastMonth.youth,
    },
    yoyChange: {
      total: thisMonth.total - lastYear.total,
      adults: thisMonth.adults - lastYear.adults,
      youth: thisMonth.youth - lastYear.youth,
    },
    hasLastYearData: lastYear.total > 0,
  };
}

/**
 * Get cancellation breakdown by reason for a date range
 * @param {Array} bookings
 * @param {string} startDate
 * @param {string} endDate
 * @returns {object}
 */
export function getCancellationBreakdown(bookings, startDate, endDate) {
  const cancelled = bookings.filter(b =>
    b.date >= startDate &&
    b.date <= endDate &&
    b.status === BOOKING_STATUS.CANCELLED
  );

  const byReason = {
    weather: cancelled.filter(b => b.cancel_reason === CANCEL_REASONS.WEATHER).length,
    customer: cancelled.filter(b => b.cancel_reason === CANCEL_REASONS.CUSTOMER).length,
    facility: cancelled.filter(b => b.cancel_reason === CANCEL_REASONS.FACILITY).length,
    other: cancelled.filter(b =>
      !b.cancel_reason ||
      b.cancel_reason === CANCEL_REASONS.OTHER
    ).length,
  };

  return {
    total: cancelled.length,
    byReason,
  };
}

/**
 * Get utilization stats excluding closed courts
 * @param {Array} bookings
 * @param {Array} closures
 * @param {string} date
 * @returns {object}
 */
export function getDailyUtilizationWithClosures(bookings, closures, date) {
  const grid = getAvailabilityGrid(bookings, closures, date);
  const stats = {};

  // Group slots by period
  const periodSlots = {
    MORNING: grid.slots.filter(s => s.period === 'MORNING'),
    AFTERNOON: grid.slots.filter(s => s.period === 'AFTERNOON'),
    PRIME: grid.slots.filter(s => s.period === 'PRIME'),
  };

  Object.keys(TIME_PERIODS).forEach(periodKey => {
    const slotsInPeriod = periodSlots[periodKey] || [];

    let totalAvailableSlots = 0;
    let bookedSlots = 0;
    let closedSlots = 0;

    slotsInPeriod.forEach(slot => {
      slot.courts.forEach(court => {
        if (court.closed) {
          closedSlots++;
        } else {
          totalAvailableSlots++;
          if (!court.available) {
            bookedSlots++;
          }
        }
      });
    });

    stats[periodKey] = {
      label: TIME_PERIODS[periodKey].label,
      booked: bookedSlots,
      total: totalAvailableSlots,
      available: totalAvailableSlots - bookedSlots,
      closed: closedSlots,
      utilization: calculateUtilization(bookedSlots, totalAvailableSlots),
    };
  });

  // Total for day
  let totalAvailable = 0;
  let totalBooked = 0;
  let totalClosed = 0;

  grid.slots.forEach(slot => {
    slot.courts.forEach(court => {
      if (court.closed) {
        totalClosed++;
      } else {
        totalAvailable++;
        if (!court.available) {
          totalBooked++;
        }
      }
    });
  });

  stats.TOTAL = {
    label: 'Total',
    booked: totalBooked,
    total: totalAvailable,
    available: totalAvailable - totalBooked,
    closed: totalClosed,
    utilization: calculateUtilization(totalBooked, totalAvailable),
  };

  return stats;
}
