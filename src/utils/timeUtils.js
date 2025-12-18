/**
 * Centralized Time Utilities
 *
 * This module provides canonical functions for handling time values across the application.
 * Google Sheets stores times in multiple formats:
 * - Decimal (0.395833 = 9:30 AM) - fraction of 24 hours
 * - Date objects - when read via Apps Script
 * - Strings ("09:30") - after normalization
 *
 * All functions in this module handle these formats gracefully.
 */

/**
 * Normalize any time value to "HH:MM" string format
 * Handles: Date objects, decimal (0-1), strings with colons, null/undefined
 *
 * @param {Date|number|string|null|undefined} value - Time value in any format
 * @returns {string} Time in "HH:MM" format, or empty string if invalid
 */
export function normalizeTime(value) {
  // Handle null/undefined
  if (value === null || value === undefined) {
    return '';
  }

  // Handle Date objects
  if (value instanceof Date) {
    const hours = value.getHours();
    const minutes = value.getMinutes();
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
  }

  // Handle numbers (decimal format from Google Sheets: 0.395833 = 9:30)
  if (typeof value === 'number') {
    // Decimal represents fraction of 24 hours
    if (value >= 0 && value < 1) {
      const totalMinutes = Math.round(value * 24 * 60);
      const hours = Math.floor(totalMinutes / 60);
      const minutes = totalMinutes % 60;
      return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
    }
    // Could be minutes since midnight
    if (value >= 0 && value < 1440) {
      const hours = Math.floor(value / 60);
      const minutes = Math.round(value % 60);
      return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
    }
    return '';
  }

  // Handle strings
  if (typeof value === 'string') {
    const trimmed = value.trim();

    // Already in HH:MM format
    if (/^\d{1,2}:\d{2}$/.test(trimmed)) {
      const [hours, minutes] = trimmed.split(':').map(Number);
      if (hours >= 0 && hours < 24 && minutes >= 0 && minutes < 60) {
        return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
      }
    }

    // Handle HH:MM:SS format
    if (/^\d{1,2}:\d{2}:\d{2}$/.test(trimmed)) {
      const [hours, minutes] = trimmed.split(':').map(Number);
      if (hours >= 0 && hours < 24 && minutes >= 0 && minutes < 60) {
        return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
      }
    }

    // Handle decimal string (e.g., "0.395833")
    const decimal = parseFloat(trimmed);
    if (!isNaN(decimal) && decimal >= 0 && decimal < 1) {
      const totalMinutes = Math.round(decimal * 24 * 60);
      const hours = Math.floor(totalMinutes / 60);
      const minutes = totalMinutes % 60;
      return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
    }

    // Handle AM/PM format (e.g., "9:30 AM", "10:00 PM")
    const ampmMatch = trimmed.match(/^(\d{1,2}):(\d{2})\s*(AM|PM|am|pm)$/);
    if (ampmMatch) {
      let hours = parseInt(ampmMatch[1], 10);
      const minutes = parseInt(ampmMatch[2], 10);
      const period = ampmMatch[3].toUpperCase();

      if (period === 'PM' && hours !== 12) hours += 12;
      if (period === 'AM' && hours === 12) hours = 0;

      if (hours >= 0 && hours < 24 && minutes >= 0 && minutes < 60) {
        return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
      }
    }
  }

  // Unable to parse
  return '';
}

/**
 * Parse any time value to minutes since midnight
 *
 * @param {Date|number|string|null|undefined} value - Time value in any format
 * @returns {number} Minutes since midnight (0-1439), or 0 if invalid
 */
export function parseTimeToMinutes(value) {
  // Handle null/undefined
  if (value === null || value === undefined) {
    return 0;
  }

  // Handle Date objects
  if (value instanceof Date) {
    return value.getHours() * 60 + value.getMinutes();
  }

  // Handle numbers
  if (typeof value === 'number') {
    // Decimal format (0-1)
    if (value >= 0 && value < 1) {
      return Math.round(value * 24 * 60);
    }
    // Already in minutes
    if (value >= 0 && value < 1440) {
      return Math.round(value);
    }
    return 0;
  }

  // Handle strings
  if (typeof value === 'string') {
    const trimmed = value.trim();

    // HH:MM or HH:MM:SS format
    if (trimmed.includes(':')) {
      const parts = trimmed.split(':');
      const hours = parseInt(parts[0], 10);
      const minutes = parseInt(parts[1], 10);
      if (!isNaN(hours) && !isNaN(minutes) && hours >= 0 && hours < 24 && minutes >= 0 && minutes < 60) {
        return hours * 60 + minutes;
      }
    }

    // Decimal string
    const decimal = parseFloat(trimmed);
    if (!isNaN(decimal) && decimal >= 0 && decimal < 1) {
      return Math.round(decimal * 24 * 60);
    }
  }

  return 0;
}

/**
 * Convert minutes since midnight to "HH:MM" format
 *
 * @param {number} minutes - Minutes since midnight (0-1439)
 * @returns {string} Time in "HH:MM" format
 */
export function minutesToTime(minutes) {
  if (typeof minutes !== 'number' || isNaN(minutes)) {
    return '00:00';
  }

  // Clamp to valid range
  const clampedMinutes = Math.max(0, Math.min(1439, Math.round(minutes)));
  const hours = Math.floor(clampedMinutes / 60);
  const mins = clampedMinutes % 60;

  return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
}

/**
 * Extract hour from any time value
 *
 * @param {Date|number|string|null|undefined} value - Time value in any format
 * @returns {number} Hour (0-23), or 0 if invalid
 */
export function parseHour(value) {
  const minutes = parseTimeToMinutes(value);
  return Math.floor(minutes / 60);
}

/**
 * Extract minutes portion from any time value
 *
 * @param {Date|number|string|null|undefined} value - Time value in any format
 * @returns {number} Minutes (0-59), or 0 if invalid
 */
export function parseMinutes(value) {
  const totalMinutes = parseTimeToMinutes(value);
  return totalMinutes % 60;
}

/**
 * Format time for display (e.g., "9:30a" or "2:00p")
 *
 * @param {Date|number|string|null|undefined} value - Time value in any format
 * @returns {string} Formatted time string, or empty string if invalid
 */
export function formatTimeShort(value) {
  const normalized = normalizeTime(value);
  if (!normalized) return '';

  const [hoursStr, minutesStr] = normalized.split(':');
  const hours = parseInt(hoursStr, 10);
  const minutes = parseInt(minutesStr, 10);

  const period = hours >= 12 ? 'p' : 'a';
  const displayHour = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;

  return `${displayHour}:${String(minutes).padStart(2, '0')}${period}`;
}

/**
 * Format time for display with full AM/PM (e.g., "9:30 AM" or "2:00 PM")
 *
 * @param {Date|number|string|null|undefined} value - Time value in any format
 * @returns {string} Formatted time string, or empty string if invalid
 */
export function formatTimeDisplay(value) {
  const normalized = normalizeTime(value);
  if (!normalized) return '';

  const [hoursStr, minutesStr] = normalized.split(':');
  const hours = parseInt(hoursStr, 10);
  const minutes = parseInt(minutesStr, 10);

  const period = hours >= 12 ? 'PM' : 'AM';
  const displayHour = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;

  return `${displayHour}:${String(minutes).padStart(2, '0')} ${period}`;
}

/**
 * Check if a time value is valid
 *
 * @param {any} value - Value to check
 * @returns {boolean} True if the value can be parsed as a valid time
 */
export function isValidTime(value) {
  if (value === null || value === undefined) return false;
  const normalized = normalizeTime(value);
  return normalized !== '';
}

/**
 * Compare two time values
 *
 * @param {Date|number|string} time1 - First time value
 * @param {Date|number|string} time2 - Second time value
 * @returns {number} Negative if time1 < time2, positive if time1 > time2, 0 if equal
 */
export function compareTimes(time1, time2) {
  return parseTimeToMinutes(time1) - parseTimeToMinutes(time2);
}

/**
 * Check if two time ranges overlap
 *
 * @param {string} start1 - Start time of first range
 * @param {string} end1 - End time of first range
 * @param {string} start2 - Start time of second range
 * @param {string} end2 - End time of second range
 * @returns {boolean} True if the ranges overlap
 */
export function timeRangesOverlap(start1, end1, start2, end2) {
  const s1 = parseTimeToMinutes(start1);
  const e1 = parseTimeToMinutes(end1);
  const s2 = parseTimeToMinutes(start2);
  const e2 = parseTimeToMinutes(end2);

  return s1 < e2 && s2 < e1;
}
