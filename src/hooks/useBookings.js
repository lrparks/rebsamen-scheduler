import { useEffect } from 'react';
import { useBookingsContext } from '../context/BookingsContext.jsx';
import { CONFIG } from '../config.js';

/**
 * Hook for managing bookings
 * Wraps BookingsContext with additional functionality
 */
export function useBookings() {
  const context = useBookingsContext();

  // Initial fetch on mount
  useEffect(() => {
    context.fetchBookings();
  }, []);

  // Auto-refresh every minute
  useEffect(() => {
    const interval = setInterval(() => {
      context.refreshBookings();
    }, CONFIG.REFRESH_INTERVAL);

    return () => clearInterval(interval);
  }, [context.refreshBookings]);

  return context;
}

/**
 * Hook for getting bookings for a specific date
 * @param {string} date - Date in YYYY-MM-DD format
 */
export function useBookingsForDate(date) {
  const { getBookingsForDate, loading, error } = useBookingsContext();
  return {
    bookings: getBookingsForDate(date),
    loading,
    error,
  };
}

/**
 * Hook for getting a specific booking
 * @param {string} bookingId
 */
export function useBooking(bookingId) {
  const { getBookingById, loading, error } = useBookingsContext();
  return {
    booking: getBookingById(bookingId),
    loading,
    error,
  };
}
