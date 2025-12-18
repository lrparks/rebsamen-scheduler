import { BOOKING_TYPES } from '../config.js';
import { parseHour, parseTimeToMinutes } from './timeUtils.js';

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
  const hour = parseHour(timeStart);

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
 * Calculate total for multiple time slots with mixed prime/non-prime rates
 * @param {Date|string} date
 * @param {string|number} timeStart - HH:MM format
 * @param {string|number} timeEnd - HH:MM format
 * @param {string} bookingType
 * @param {number} courts - Number of courts
 * @returns {number}
 */
export function calculateTotalRate(date, timeStart, timeEnd, bookingType, courts = 1) {
  // Free categories
  if (isFreeBooking(bookingType)) {
    return 0;
  }

  const startMinutes = parseTimeToMinutes(timeStart);
  const endMinutes = parseTimeToMinutes(timeEnd);

  if (startMinutes === 0 && endMinutes === 0) {
    // Fallback to simple calculation if times can't be parsed
    const baseRate = calculateRate(date, timeStart, bookingType);
    return baseRate * courts;
  }

  // Calculate each hour's rate separately to handle prime/non-prime transitions
  let totalRate = 0;
  const d = new Date(date);
  const dayOfWeek = d.getDay(); // 0=Sun, 6=Sat
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

  // Iterate through each hour of the booking
  for (let mins = startMinutes; mins < endMinutes; mins += 60) {
    const hour = Math.floor(mins / 60);

    // Weekend = all prime, Weekday = 17:00+ is prime
    const isPrime = isWeekend || hour >= 17;
    const hourlyRate = isPrime ? 12.00 : 10.00;

    totalRate += hourlyRate;
  }

  return totalRate * courts;
}

/**
 * Get detailed rate breakdown for display
 * @param {Date|string} date
 * @param {string} timeStart - HH:MM
 * @param {string} timeEnd - HH:MM
 * @param {string} bookingType
 * @param {number} courts
 * @returns {{ totalHours: number, primeHours: number, nonPrimeHours: number, primeRate: number, nonPrimeRate: number, total: number, description: string }}
 */
export function getRateBreakdown(date, timeStart, timeEnd, bookingType, courts = 1) {
  if (isFreeBooking(bookingType)) {
    return {
      totalHours: 0,
      primeHours: 0,
      nonPrimeHours: 0,
      primeRate: 12.00,
      nonPrimeRate: 10.00,
      total: 0,
      description: 'No charge',
    };
  }

  const startMinutes = parseTimeToMinutes(timeStart);
  const endMinutes = parseTimeToMinutes(timeEnd);
  const totalHours = (endMinutes - startMinutes) / 60;

  if (totalHours <= 0) {
    return {
      totalHours: 0,
      primeHours: 0,
      nonPrimeHours: 0,
      primeRate: 12.00,
      nonPrimeRate: 10.00,
      total: 0,
      description: 'Invalid time range',
    };
  }

  const d = new Date(date);
  const dayOfWeek = d.getDay();
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

  let primeHours = 0;
  let nonPrimeHours = 0;

  for (let mins = startMinutes; mins < endMinutes; mins += 60) {
    const hour = Math.floor(mins / 60);
    const isPrime = isWeekend || hour >= 17;
    if (isPrime) {
      primeHours++;
    } else {
      nonPrimeHours++;
    }
  }

  const total = ((primeHours * 12.00) + (nonPrimeHours * 10.00)) * courts;

  // Build description
  let description = '';
  if (primeHours > 0 && nonPrimeHours > 0) {
    description = `${nonPrimeHours}hr @ $10 + ${primeHours}hr @ $12`;
    if (courts > 1) description += ` × ${courts} courts`;
  } else if (primeHours > 0) {
    description = `${primeHours}hr @ $12 (Prime)`;
    if (courts > 1) description += ` × ${courts} courts`;
  } else {
    description = `${nonPrimeHours}hr @ $10 (Non-Prime)`;
    if (courts > 1) description += ` × ${courts} courts`;
  }

  return {
    totalHours,
    primeHours,
    nonPrimeHours,
    primeRate: 12.00,
    nonPrimeRate: 10.00,
    total,
    description,
  };
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
