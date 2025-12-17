import { CANCEL_REASONS, REFUND_STATUS } from '../config.js';

/**
 * Auto-suggest refund status based on cancellation policy
 * @param {string} reason - cancel reason
 * @param {string} bookingDate - original booking date (YYYY-MM-DD)
 * @param {string} bookingTime - original booking start time (HH:MM)
 * @returns {object} { suggestedRefund, explanation }
 */
export function suggestRefund(reason, bookingDate, bookingTime) {
  // Weather always gets full refund
  if (reason === CANCEL_REASONS.WEATHER) {
    return {
      suggestedRefund: REFUND_STATUS.FULL,
      explanation: 'Weather cancellations receive full refund per policy',
    };
  }

  // No-shows never get refund
  if (reason === CANCEL_REASONS.NO_SHOW) {
    return {
      suggestedRefund: REFUND_STATUS.NONE,
      explanation: 'No-shows do not receive refunds',
    };
  }

  // Facility issues get full refund
  if (reason === CANCEL_REASONS.FACILITY) {
    return {
      suggestedRefund: REFUND_STATUS.FULL,
      explanation: 'Facility issues receive full refund',
    };
  }

  // Customer cancellation - check 24 hour rule
  if (reason === CANCEL_REASONS.CUSTOMER) {
    const bookingDateTime = new Date(`${bookingDate}T${bookingTime}`);
    const now = new Date();
    const hoursUntilBooking = (bookingDateTime - now) / (1000 * 60 * 60);

    if (hoursUntilBooking >= 24) {
      return {
        suggestedRefund: REFUND_STATUS.FULL,
        explanation: 'Cancelled 24+ hours in advance - full refund per policy',
      };
    } else {
      return {
        suggestedRefund: REFUND_STATUS.NONE,
        explanation: 'Cancelled less than 24 hours before - no refund per policy',
      };
    }
  }

  // Default for 'other'
  return {
    suggestedRefund: REFUND_STATUS.NONE,
    explanation: 'Staff discretion',
  };
}

/**
 * Get cancel reason label
 * @param {string} reason
 * @returns {string}
 */
export function getCancelReasonLabel(reason) {
  const labels = {
    [CANCEL_REASONS.CUSTOMER]: 'Customer Request',
    [CANCEL_REASONS.WEATHER]: 'Weather',
    [CANCEL_REASONS.FACILITY]: 'Facility Issue',
    [CANCEL_REASONS.NO_SHOW]: 'No-Show',
    [CANCEL_REASONS.OTHER]: 'Other',
  };
  return labels[reason] || reason;
}

/**
 * Get refund status label
 * @param {string} status
 * @returns {string}
 */
export function getRefundStatusLabel(status) {
  const labels = {
    [REFUND_STATUS.NONE]: 'No Refund',
    [REFUND_STATUS.PARTIAL]: 'Partial Refund',
    [REFUND_STATUS.FULL]: 'Full Refund',
    [REFUND_STATUS.CREDIT]: 'Credit for Future',
    [REFUND_STATUS.NA]: 'N/A',
  };
  return labels[status] || status;
}

/**
 * Check if booking is past no-show threshold
 * @param {string} bookingDate
 * @param {string} bookingEndTime
 * @param {number} graceMinutes - Grace period in minutes (default 15)
 * @returns {boolean}
 */
export function isPastNoShowThreshold(bookingDate, bookingEndTime, graceMinutes = 15) {
  const endDateTime = new Date(`${bookingDate}T${bookingEndTime}`);
  endDateTime.setMinutes(endDateTime.getMinutes() + graceMinutes);
  return new Date() > endDateTime;
}

/**
 * Check if booking can be marked as no-show
 * @param {object} booking
 * @returns {boolean}
 */
export function canMarkNoShow(booking) {
  if (booking.status !== 'active') return false;
  if (booking.checked_in) return false;

  // Must be past start time
  const startDateTime = new Date(`${booking.date}T${booking.time_start}`);
  return new Date() > startDateTime;
}
