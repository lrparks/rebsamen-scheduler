import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { fetchBookings as apiFetchBookings, fetchClosures } from '../utils/api.js';
import { CONFIG } from '../config.js';

const BookingsContext = createContext(null);

/**
 * Bookings Context Provider
 * Manages bookings state with auto-refresh
 */
export function BookingsProvider({ children }) {
  const [bookings, setBookings] = useState([]);
  const [closures, setClosures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastRefresh, setLastRefresh] = useState(null);

  const fetchBookings = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('[BookingsContext] Fetching bookings and closures...');
      const [bookingsData, closuresData] = await Promise.all([
        apiFetchBookings(),
        fetchClosures().catch(() => []), // Gracefully handle missing closures sheet
      ]);
      console.log('[BookingsContext] Received bookings:', bookingsData.length);
      console.log('[BookingsContext] Received closures:', closuresData.length);
      setBookings(bookingsData);
      setClosures(closuresData.filter(c => c.is_active === 'TRUE'));
      setLastRefresh(new Date());
    } catch (err) {
      console.error('[BookingsContext] Error fetching data:', err);
      setError(err.message || 'Failed to fetch data');
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
   * Get conflicting bookings for a proposed booking
   * @param {string} date
   * @param {number} court
   * @param {string} timeStart
   * @param {string} timeEnd
   * @param {string} excludeId - Booking ID to exclude (for edits)
   * @returns {Array} - List of conflicting bookings
   */
  const getConflicts = useCallback((date, court, timeStart, timeEnd, excludeId = null) => {
    const courtBookings = getBookingsForDateAndCourt(date, court)
      .filter(b => b.status === 'active' && b.booking_id !== excludeId);

    const [startHour, startMin] = timeStart.split(':').map(Number);
    const [endHour, endMin] = timeEnd.split(':').map(Number);
    const newStart = startHour * 60 + startMin;
    const newEnd = endHour * 60 + endMin;

    const conflicts = [];
    for (const booking of courtBookings) {
      const [bStartHour, bStartMin] = booking.time_start.split(':').map(Number);
      const [bEndHour, bEndMin] = booking.time_end.split(':').map(Number);
      const bStart = bStartHour * 60 + bStartMin;
      const bEnd = bEndHour * 60 + bEndMin;

      // Check for overlap
      if (newStart < bEnd && newEnd > bStart) {
        conflicts.push(booking);
      }
    }

    return conflicts;
  }, [getBookingsForDateAndCourt]);

  /**
   * Check if a slot is closed
   * @param {string} date
   * @param {number} court
   * @param {string} time - HH:MM format
   * @returns {{ isClosed: boolean, reason: string | null }}
   */
  const isSlotClosed = useCallback((date, court, time) => {
    const timeMinutes = parseTimeToMinutes(time);

    for (const closure of closures) {
      if (closure.date !== date) continue;

      const closureCourt = closure.court?.toLowerCase();
      if (closureCourt !== 'all' && parseInt(closureCourt, 10) !== court) continue;

      const startMinutes = parseTimeToMinutes(closure.time_start || '00:00');
      const endMinutes = parseTimeToMinutes(closure.time_end || '21:00');

      if (timeMinutes >= startMinutes && timeMinutes < endMinutes) {
        return { isClosed: true, reason: closure.reason || 'Closed' };
      }
    }

    return { isClosed: false, reason: null };
  }, [closures]);

  /**
   * Get closures that overlap with a proposed booking
   * @param {string} date
   * @param {number} court
   * @param {string} timeStart
   * @param {string} timeEnd
   * @returns {Array} - Array of closure objects that overlap
   */
  const getClosureConflicts = useCallback((date, court, timeStart, timeEnd) => {
    const startMinutes = parseTimeToMinutes(timeStart);
    const endMinutes = parseTimeToMinutes(timeEnd);

    const conflicts = [];
    for (const closure of closures) {
      if (closure.date !== date) continue;

      const closureCourt = closure.court?.toLowerCase();
      if (closureCourt !== 'all' && parseInt(closureCourt, 10) !== court) continue;

      const closureStart = parseTimeToMinutes(closure.time_start || '00:00');
      const closureEnd = parseTimeToMinutes(closure.time_end || '21:00');

      // Check overlap
      if (startMinutes < closureEnd && endMinutes > closureStart) {
        conflicts.push({
          ...closure,
          type: 'closure',
        });
      }
    }

    return conflicts;
  }, [closures]);

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
    closures,
    loading,
    error,
    lastRefresh,
    fetchBookings,
    refreshBookings,
    getBookingsForDate,
    getBookingsForDateAndCourt,
    getBookingById,
    isSlotAvailable,
    getConflicts,
    isSlotClosed,
    getClosureConflicts,
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

/**
 * Parse time string to minutes since midnight
 * @param {string} time - HH:MM format
 * @returns {number}
 */
function parseTimeToMinutes(time) {
  if (!time) return 0;
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + (minutes || 0);
}
