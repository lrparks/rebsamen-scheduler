import { CONFIG } from '../config.js';

/**
 * Normalize time to HH:MM format
 * Handles: HH:MM, H:MM, decimal (0.375), 12-hour AM/PM
 * @param {string|number} time
 * @returns {string} Time in HH:MM format
 */
export function normalizeTime(time) {
  if (!time) return '';

  const str = String(time).trim();

  // Already in HH:MM or H:MM format
  const timeMatch = str.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
  if (timeMatch) {
    const [, hours, minutes] = timeMatch;
    return `${hours.padStart(2, '0')}:${minutes}`;
  }

  // Handle decimal format (Google Sheets stores times as fractions of a day)
  const decimal = parseFloat(str);
  if (!isNaN(decimal) && decimal >= 0 && decimal < 1) {
    const totalMinutes = Math.round(decimal * 24 * 60);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  }

  // Handle 12-hour format with AM/PM
  const ampmMatch = str.match(/^(\d{1,2}):(\d{2})\s*(AM|PM|am|pm)$/i);
  if (ampmMatch) {
    let [, hours, minutes, period] = ampmMatch;
    let h = parseInt(hours, 10);
    if (period.toLowerCase() === 'pm' && h !== 12) h += 12;
    if (period.toLowerCase() === 'am' && h === 12) h = 0;
    return `${h.toString().padStart(2, '0')}:${minutes}`;
  }

  return str;
}

/**
 * Parse time string to hours and minutes
 * @param {string|number} time
 * @returns {{ hours: number, minutes: number }}
 */
function parseTime(time) {
  const normalized = normalizeTime(time);
  if (!normalized || !normalized.includes(':')) {
    return { hours: 0, minutes: 0 };
  }
  const [hours, minutes] = normalized.split(':').map(Number);
  return { hours: hours || 0, minutes: minutes || 0 };
}

/**
 * Format date as YYYY-MM-DD
 * @param {Date} date
 * @returns {string}
 */
export function formatDateISO(date) {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Format date for display (e.g., "Monday, December 16, 2024")
 * @param {Date|string} date
 * @returns {string}
 */
export function formatDateDisplay(date) {
  // Handle string dates by adding time to prevent timezone issues
  const d = typeof date === 'string' ? parseDate(date) : new Date(date);
  return d.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

/**
 * Format date short (e.g., "Dec 16")
 * @param {Date} date
 * @returns {string}
 */
export function formatDateShort(date) {
  const d = new Date(date);
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Format time for display (e.g., "9:00 AM")
 * @param {string|number} time24 - Time in HH:MM format or decimal
 * @returns {string}
 */
export function formatTimeDisplay(time24) {
  if (!time24) return '';
  const { hours, minutes } = parseTime(time24);
  const period = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 || 12;
  return `${displayHours}:${String(minutes).padStart(2, '0')} ${period}`;
}

/**
 * Format time short (e.g., "9:00a")
 * @param {string|number} time24 - Time in HH:MM format or decimal
 * @returns {string}
 */
export function formatTimeShort(time24) {
  if (!time24) return '';
  const { hours, minutes } = parseTime(time24);
  const period = hours >= 12 ? 'p' : 'a';
  const displayHours = hours % 12 || 12;
  return `${displayHours}:${String(minutes).padStart(2, '0')}${period}`;
}

/**
 * Get all time slots for the day
 * @returns {Array<string>} Array of times in HH:MM format
 */
export function getTimeSlots() {
  const slots = [];
  let hour = CONFIG.DAY_START_HOUR;
  let minute = CONFIG.DAY_START_MINUTE;

  while (hour < CONFIG.DAY_END_HOUR || (hour === CONFIG.DAY_END_HOUR && minute < CONFIG.DAY_END_MINUTE)) {
    slots.push(`${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`);
    minute += CONFIG.SLOT_MINUTES;
    if (minute >= 60) {
      minute = 0;
      hour++;
    }
  }

  return slots;
}

/**
 * Get end time options based on start time
 * @param {string} startTime - Start time in HH:MM format
 * @returns {Array<string>} Array of valid end times
 */
export function getEndTimeOptions(startTime) {
  const allSlots = getTimeSlots();
  const startIndex = allSlots.indexOf(startTime);

  if (startIndex === -1) return [];

  // Return slots after start time, plus end of day
  const endSlots = allSlots.slice(startIndex + 1);

  // Add end of day if not already included
  const endOfDay = `${String(CONFIG.DAY_END_HOUR).padStart(2, '0')}:${String(CONFIG.DAY_END_MINUTE).padStart(2, '0')}`;
  if (!endSlots.includes(endOfDay)) {
    endSlots.push(endOfDay);
  }

  return endSlots;
}

/**
 * Check if date is today
 * @param {Date|string} date
 * @returns {boolean}
 */
export function isToday(date) {
  // Handle string dates by adding time to prevent timezone issues
  const d = typeof date === 'string' ? parseDate(date) : new Date(date);
  const today = new Date();
  return d.toDateString() === today.toDateString();
}

/**
 * Get date for navigation
 * @param {Date} currentDate
 * @param {number} days - Number of days to add (negative for past)
 * @returns {Date}
 */
export function addDays(currentDate, days) {
  const result = new Date(currentDate);
  result.setDate(result.getDate() + days);
  return result;
}

/**
 * Get start of week (Monday)
 * @param {Date} date
 * @returns {Date}
 */
export function getStartOfWeek(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  return d;
}

/**
 * Get days of week starting from a date
 * @param {Date} startDate
 * @returns {Array<Date>}
 */
export function getWeekDays(startDate) {
  const days = [];
  for (let i = 0; i < 7; i++) {
    days.push(addDays(startDate, i));
  }
  return days;
}

/**
 * Get current time in HH:MM format
 * @returns {string}
 */
export function getCurrentTime() {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
}

/**
 * Calculate position percentage for current time line
 * @param {string|number} currentTime - Current time in HH:MM format or decimal
 * @returns {number|null} Percentage position, or null if outside operating hours
 */
export function getTimePosition(currentTime) {
  const { hours: hour, minutes: minute } = parseTime(currentTime);
  const currentMinutes = hour * 60 + minute;

  const startMinutes = CONFIG.DAY_START_HOUR * 60 + CONFIG.DAY_START_MINUTE;
  const endMinutes = CONFIG.DAY_END_HOUR * 60 + CONFIG.DAY_END_MINUTE;

  if (currentMinutes < startMinutes || currentMinutes > endMinutes) {
    return null;
  }

  return ((currentMinutes - startMinutes) / (endMinutes - startMinutes)) * 100;
}

/**
 * Parse date string to Date object handling timezone
 * @param {string} dateStr - Date string (YYYY-MM-DD)
 * @returns {Date}
 */
export function parseDate(dateStr) {
  // Add time to prevent timezone issues
  return new Date(dateStr + 'T12:00:00');
}
