import { BOOKING_TYPES } from '../config.js';
import { normalizeTime } from './dateHelpers.js';

/**
 * Safely parse hour from time string
 * @param {string} normalized - Normalized time string (HH:MM)
 * @returns {number} Hour or 0 if invalid
 */
function safeParseHour(normalized) {
  if (!normalized || typeof normalized !== 'string' || !normalized.includes(':')) {
    return 0;
  }
  const parts = normalized.split(':');
  return parts.length >= 1 ? (parseInt(parts[0], 10) || 0) : 0;
}

/**
 * Determine if a time slot is prime time
 * Prime: M-F 5pm-9pm, Sat-Sun all day
 * @param {Date|string} date - Booking date
 * @param {string|number} timeStart - Start time in HH:MM format or decimal
 * @returns {boolean}
 */
export function isPrimeTime(date, timeStart) {
  if (!date || (!timeStart && timeStart !== 0)) return false;
  const d = new Date(date);
  const dayOfWeek = d.getDay(); // 0=Sun, 6=Sat
  const normalized = normalizeTime(timeStart);
  const hour = safeParseHour(normalized);

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
  if (!date || !timeStart) return 0;

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
 * Safely parse time string to minutes
 * @param {string} normalized - Normalized time string (HH:MM)
 * @returns {number} Minutes since midnight or 0 if invalid
 */
function safeParseMinutes(normalized) {
  if (!normalized || typeof normalized !== 'string' || !normalized.includes(':')) {
    return 0;
  }
  const parts = normalized.split(':');
  if (parts.length < 2) return 0;
  const hours = parseInt(parts[0], 10) || 0;
  const minutes = parseInt(parts[1], 10) || 0;
  return hours * 60 + minutes;
}

/**
 * Calculate total for multiple time slots
 * @param {Date|string} date
 * @param {string|number} timeStart
 * @param {string|number} timeEnd
 * @param {string} bookingType
 * @param {number} courts - Number of courts
 * @returns {number}
 */
export function calculateTotalRate(date, timeStart, timeEnd, bookingType, courts = 1) {
  const baseRate = calculateRate(date, timeStart, bookingType);

  // Calculate duration in 30-min slots
  const normalizedStart = normalizeTime(timeStart);
  const normalizedEnd = normalizeTime(timeEnd);

  if (!normalizedStart || !normalizedEnd) return baseRate * courts;

  const startMinutes = safeParseMinutes(normalizedStart);
  const endMinutes = safeParseMinutes(normalizedEnd);
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
