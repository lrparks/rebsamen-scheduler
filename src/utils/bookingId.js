import { normalizeTime } from './dateHelpers.js';

/**
 * Generate booking ID from date, court, and time
 * Format: DDCC-HHMM
 * DD = Day of month (01-31)
 * CC = Court number (01-17, 17=Stadium)
 * HH = Hour (08-21)
 * MM = Minutes (00 or 30)
 *
 * @param {Date|string} date - Booking date
 * @param {number} court - Court number (1-17)
 * @param {string|number} timeStart - Start time in HH:MM format or decimal
 * @returns {string} Booking ID in DDCC-HHMM format
 */
export function generateBookingId(date, court, timeStart) {
  const d = new Date(date);
  const day = String(d.getDate()).padStart(2, '0');
  const courtStr = String(court).padStart(2, '0');
  const normalized = normalizeTime(timeStart);
  const [hour, minute] = normalized.split(':');

  return `${day}${courtStr}-${hour}${minute}`;
}

/**
 * Parse booking ID back to components
 * @param {string} bookingId - ID in DDCC-HHMM format
 * @returns {object} { day, court, hour, minute }
 */
export function parseBookingId(bookingId) {
  if (!bookingId || bookingId.length !== 9) {
    return null;
  }

  const [dayCourt, time] = bookingId.split('-');
  if (!dayCourt || !time) {
    return null;
  }

  return {
    day: parseInt(dayCourt.substring(0, 2), 10),
    court: parseInt(dayCourt.substring(2, 4), 10),
    hour: parseInt(time.substring(0, 2), 10),
    minute: parseInt(time.substring(2, 4), 10),
  };
}

/**
 * Validate booking ID format
 * @param {string} bookingId
 * @returns {boolean}
 */
export function isValidBookingId(bookingId) {
  // Format: DDCC-HHMM
  // DD: 01-31, CC: 01-17, HH: 08-21, MM: 00 or 30
  const pattern = /^(0[1-9]|[12][0-9]|3[01])(0[1-9]|1[0-7])-(0[89]|1[0-9]|2[01])(00|30)$/;
  return pattern.test(bookingId);
}

/**
 * Generate group ID for multi-court bookings
 * Format: GRP-MMDD-XXX
 * @param {Date} date - Booking date
 * @returns {string} Group ID
 */
export function generateGroupId(date) {
  const d = new Date(date);
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const random = String(Math.floor(Math.random() * 1000)).padStart(3, '0');

  return `GRP-${month}${day}-${random}`;
}

/**
 * Format booking ID for display
 * @param {string} bookingId
 * @returns {string}
 */
export function formatBookingIdForDisplay(bookingId) {
  return bookingId || 'N/A';
}
