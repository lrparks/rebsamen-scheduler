import { BOOKING_TYPES } from '../config.js';

/**
 * Color definitions for each booking type
 */
export const BOOKING_COLORS = {
  [BOOKING_TYPES.OPEN]: {
    bg: 'bg-blue-100',
    border: 'border-blue-500',
    text: 'text-blue-800',
    hex: '#3B82F6',
    name: 'Blue',
  },
  [BOOKING_TYPES.CONTRACTOR]: {
    bg: 'bg-purple-100',
    border: 'border-purple-500',
    text: 'text-purple-800',
    hex: '#8B5CF6',
    name: 'Purple',
  },
  [BOOKING_TYPES.TEAM_USTA]: {
    bg: 'bg-green-100',
    border: 'border-green-500',
    text: 'text-green-800',
    hex: '#10B981',
    name: 'Green',
  },
  [BOOKING_TYPES.TEAM_HS]: {
    bg: 'bg-orange-100',
    border: 'border-orange-500',
    text: 'text-orange-800',
    hex: '#F97316',
    name: 'Orange',
  },
  [BOOKING_TYPES.TEAM_COLLEGE]: {
    bg: 'bg-orange-100',
    border: 'border-orange-500',
    text: 'text-orange-800',
    hex: '#F97316',
    name: 'Orange',
  },
  [BOOKING_TYPES.TEAM_OTHER]: {
    bg: 'bg-amber-100',
    border: 'border-amber-500',
    text: 'text-amber-800',
    hex: '#F59E0B',
    name: 'Amber',
  },
  [BOOKING_TYPES.TOURNAMENT]: {
    bg: 'bg-red-100',
    border: 'border-red-500',
    text: 'text-red-800',
    hex: '#EF4444',
    name: 'Red',
  },
  [BOOKING_TYPES.MAINTENANCE]: {
    bg: 'bg-gray-100',
    border: 'border-gray-500',
    text: 'text-gray-800',
    hex: '#6B7280',
    name: 'Gray',
  },
  [BOOKING_TYPES.HOLD]: {
    bg: 'bg-yellow-100',
    border: 'border-yellow-500',
    text: 'text-yellow-800',
    hex: '#FCD34D',
    name: 'Yellow',
  },
};

/**
 * Get color classes for a booking type
 * @param {string} bookingType
 * @returns {object} Color classes object
 */
export function getBookingColors(bookingType) {
  return BOOKING_COLORS[bookingType] || BOOKING_COLORS[BOOKING_TYPES.OPEN];
}

/**
 * Get combined CSS classes for a booking cell
 * @param {string} bookingType
 * @returns {string} Combined class string
 */
export function getBookingCellClasses(bookingType) {
  const colors = getBookingColors(bookingType);
  return `${colors.bg} ${colors.border} ${colors.text} border-l-4`;
}

/**
 * Get display label for booking type
 * @param {string} bookingType
 * @returns {string}
 */
export function getBookingTypeLabel(bookingType) {
  const labels = {
    [BOOKING_TYPES.OPEN]: 'Open Play',
    [BOOKING_TYPES.CONTRACTOR]: 'Contractor',
    [BOOKING_TYPES.TEAM_USTA]: 'USTA League',
    [BOOKING_TYPES.TEAM_HS]: 'High School',
    [BOOKING_TYPES.TEAM_COLLEGE]: 'College',
    [BOOKING_TYPES.TEAM_OTHER]: 'Team',
    [BOOKING_TYPES.TOURNAMENT]: 'Tournament',
    [BOOKING_TYPES.MAINTENANCE]: 'Maintenance',
    [BOOKING_TYPES.HOLD]: 'Hold',
  };
  return labels[bookingType] || bookingType;
}

/**
 * Get status badge classes
 * @param {string} status
 * @returns {string}
 */
export function getStatusBadgeClasses(status) {
  const statusClasses = {
    active: 'bg-green-100 text-green-800',
    cancelled: 'bg-red-100 text-red-800',
    no_show: 'bg-yellow-100 text-yellow-800',
    completed: 'bg-gray-100 text-gray-800',
  };
  return statusClasses[status] || 'bg-gray-100 text-gray-800';
}
