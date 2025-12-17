import { useBookingsContext } from '../context/BookingsContext.jsx';

/**
 * Hook for managing bookings
 * Wraps BookingsContext with additional functionality
 * Note: Initial fetch and auto-refresh are handled by the BookingsProvider
 */
export function useBookings() {
  return useBookingsContext();
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
