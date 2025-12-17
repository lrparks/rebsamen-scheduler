import { BOOKING_TYPES } from '../config.js';

/**
 * Determine if a time slot is prime time
 * Prime: M-F 5pm-9pm, Sat-Sun all day
 * @param {Date|string} date - Booking date
 * @param {string} timeStart - Start time in HH:MM format
 * @returns {boolean}
 */
export function isPrimeTime(date, timeStart) {
  const d = new Date(date);
  const dayOfWeek = d.getDay(); // 0=Sun, 6=Sat
  const hour = parseInt(timeStart.split(':')[0], 10);

  // Weekend (Sat=6, Sun=0) = all prime
  if (dayOfWeek === 0 || dayOfWeek === 6) {
    return true;
  }

  // Weekday: 5pm (17:00) and later is prime
  return hour >= 17;
}

/**
 * Calculate rate for a standard booking
 * @param {Date|string} date
 * @param {string} timeStart - HH:MM
 * @param {string} bookingType
 * @returns {number} Rate in dollars
 */
export function calculateRate(date, timeStart, bookingType) {
  // Free categories
  if ([BOOKING_TYPES.MAINTENANCE, BOOKING_TYPES.HOLD].includes(bookingType)) {
    return 0;
  }

  // High school teams typically waived per city policy
  if (bookingType === BOOKING_TYPES.TEAM_HS) {
    return 0;
  }

  // Standard rate based on prime/non-prime
  return isPrimeTime(date, timeStart) ? 12.00 : 10.00;
}

/**
 * Get rate description for display
 * @param {Date|string} date
 * @param {string} timeStart
 * @returns {string}
 */
export function getRateDescription(date, timeStart) {
  if (isPrimeTime(date, timeStart)) {
    return 'Prime Time ($12.00)';
  }
  return 'Non-Prime ($10.00)';
}

/**
 * Calculate total for multiple time slots
 * @param {Date|string} date
 * @param {string} timeStart
 * @param {string} timeEnd
 * @param {string} bookingType
 * @param {number} courts - Number of courts
 * @returns {number}
 */
export function calculateTotalRate(date, timeStart, timeEnd, bookingType, courts = 1) {
  const baseRate = calculateRate(date, timeStart, bookingType);

  // Calculate duration in 30-min slots
  const [startHour, startMin] = timeStart.split(':').map(Number);
  const [endHour, endMin] = timeEnd.split(':').map(Number);

  const startMinutes = startHour * 60 + startMin;
  const endMinutes = endHour * 60 + endMin;
  const durationSlots = (endMinutes - startMinutes) / 30;

  // First 1.5 hours (3 slots) is base rate, then additional time
  // For simplicity, we'll just use flat rate for now
  return baseRate * courts;
}

/**
 * Check if booking type is free
 * @param {string} bookingType
 * @returns {boolean}
 */
export function isFreeBooking(bookingType) {
  return [
    BOOKING_TYPES.MAINTENANCE,
    BOOKING_TYPES.HOLD,
    BOOKING_TYPES.TEAM_HS,
  ].includes(bookingType);
}
