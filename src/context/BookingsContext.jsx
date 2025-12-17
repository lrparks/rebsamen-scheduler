import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { fetchBookings as apiFetchBookings } from '../utils/api.js';
import { CONFIG } from '../config.js';

const BookingsContext = createContext(null);

/**
 * Bookings Context Provider
 * Manages bookings state with auto-refresh
 */
export function BookingsProvider({ children }) {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastRefresh, setLastRefresh] = useState(null);

  const fetchBookings = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('[BookingsContext] Fetching bookings...');
      const data = await apiFetchBookings();
      console.log('[BookingsContext] Received bookings:', data.length, data.slice(0, 2));
      setBookings(data);
      setLastRefresh(new Date());
    } catch (err) {
      console.error('[BookingsContext] Error fetching bookings:', err);
      setError(err.message || 'Failed to fetch bookings');
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial fetch and auto-refresh setup
  useEffect(() => {
    fetchBookings();

    // Auto-refresh every minute
    const interval = setInterval(() => {
      fetchBookings();
    }, CONFIG.REFRESH_INTERVAL);

    return () => clearInterval(interval);
  }, [fetchBookings]);

  const refreshBookings = useCallback(() => {
    return fetchBookings();
  }, [fetchBookings]);

  /**
   * Get bookings for a specific date
   * @param {string} date - Date in YYYY-MM-DD format
   * @returns {Array}
   */
  const getBookingsForDate = useCallback((date) => {
    return bookings.filter(b => b.date === date);
  }, [bookings]);

  /**
   * Get bookings for a specific court on a date
   * @param {string} date
   * @param {number} court
   * @returns {Array}
   */
  const getBookingsForDateAndCourt = useCallback((date, court) => {
    return bookings.filter(b =>
      b.date === date &&
      parseInt(b.court, 10) === court
    );
  }, [bookings]);

  /**
   * Get booking by ID
   * @param {string} bookingId
   * @returns {object|null}
   */
  const getBookingById = useCallback((bookingId) => {
    return bookings.find(b => b.booking_id === bookingId) || null;
  }, [bookings]);

  /**
   * Check if a time slot is available
   * @param {string} date
   * @param {number} court
   * @param {string} timeStart
   * @param {string} timeEnd
   * @param {string} excludeId - Booking ID to exclude (for edits)
   * @returns {boolean}
   */
  const isSlotAvailable = useCallback((date, court, timeStart, timeEnd, excludeId = null) => {
    const courtBookings = getBookingsForDateAndCourt(date, court)
      .filter(b => b.status === 'active' && b.booking_id !== excludeId);

    const [startHour, startMin] = timeStart.split(':').map(Number);
    const [endHour, endMin] = timeEnd.split(':').map(Number);
    const newStart = startHour * 60 + startMin;
    const newEnd = endHour * 60 + endMin;

    for (const booking of courtBookings) {
      const [bStartHour, bStartMin] = booking.time_start.split(':').map(Number);
      const [bEndHour, bEndMin] = booking.time_end.split(':').map(Number);
      const bStart = bStartHour * 60 + bStartMin;
      const bEnd = bEndHour * 60 + bEndMin;

      // Check for overlap
      if (newStart < bEnd && newEnd > bStart) {
        return false;
      }
    }

    return true;
  }, [getBookingsForDateAndCourt]);

  /**
   * Add a new booking to local state (optimistic update)
   */
  const addBookingLocal = useCallback((booking) => {
    setBookings(prev => [...prev, booking]);
  }, []);

  /**
   * Update a booking in local state (optimistic update)
   */
  const updateBookingLocal = useCallback((bookingId, updates) => {
    setBookings(prev => prev.map(b =>
      b.booking_id === bookingId ? { ...b, ...updates } : b
    ));
  }, []);

  const value = {
    bookings,
    loading,
    error,
    lastRefresh,
    fetchBookings,
    refreshBookings,
    getBookingsForDate,
    getBookingsForDateAndCourt,
    getBookingById,
    isSlotAvailable,
    addBookingLocal,
    updateBookingLocal,
  };

  return (
    <BookingsContext.Provider value={value}>
      {children}
    </BookingsContext.Provider>
  );
}

/**
 * Hook to access bookings context
 */
export function useBookingsContext() {
  const context = useContext(BookingsContext);
  if (!context) {
    throw new Error('useBookingsContext must be used within a BookingsProvider');
  }
  return context;
}
