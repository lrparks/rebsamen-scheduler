// useBookings Hook - Manage booking data with CRUD operations

const useBookings = () => {
    const [bookings, setBookings] = React.useState([]);
    const [loading, setLoading] = React.useState(true);
    const [error, setError] = React.useState(null);
    const [lastUpdated, setLastUpdated] = React.useState(null);

    // Load bookings from API
    const loadBookings = React.useCallback(async () => {
        try {
            setLoading(true);
            const data = await SheetsApi.fetchData('bookings');
            setBookings(data);
            setLastUpdated(new Date());
            setError(null);
        } catch (err) {
            setError(err.message);
            console.error('Error loading bookings:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    // Get bookings for a specific date
    const getBookingsForDate = React.useCallback((date) => {
        return bookings.filter(b => b.date === date && b.status !== 'cancelled');
    }, [bookings]);

    // Get bookings for a specific court
    const getBookingsForCourt = React.useCallback((courtNumber) => {
        return bookings.filter(b => parseInt(b.court) === parseInt(courtNumber));
    }, [bookings]);

    // Get bookings for a specific date and court
    const getBookingsForDateAndCourt = React.useCallback((date, courtNumber) => {
        return bookings.filter(
            b => b.date === date &&
            parseInt(b.court) === parseInt(courtNumber) &&
            b.status !== 'cancelled'
        );
    }, [bookings]);

    // Get booking by ID
    const getBookingById = React.useCallback((bookingId) => {
        return bookings.find(b => b.booking_id === bookingId);
    }, [bookings]);

    // Get bookings for date range
    const getBookingsForDateRange = React.useCallback((startDate, endDate) => {
        return bookings.filter(b => {
            return b.date >= startDate && b.date <= endDate && b.status !== 'cancelled';
        });
    }, [bookings]);

    // Get bookings by booking type
    const getBookingsByType = React.useCallback((type) => {
        return bookings.filter(b => b.booking_type === type && b.status !== 'cancelled');
    }, [bookings]);

    // Get bookings for contractor
    const getBookingsForContractor = React.useCallback((contractorId) => {
        return bookings.filter(
            b => b.entity_id === contractorId &&
            b.booking_type === 'contractor' &&
            b.status !== 'cancelled'
        );
    }, [bookings]);

    // Get bookings for team
    const getBookingsForTeam = React.useCallback((teamId) => {
        return bookings.filter(
            b => b.entity_id === teamId &&
            b.booking_type.startsWith('team_') &&
            b.status !== 'cancelled'
        );
    }, [bookings]);

    // Search bookings
    const searchBookings = React.useCallback((query) => {
        if (!query) return [];
        return SheetsApi.searchBookings(bookings, query);
    }, [bookings]);

    // Check if a time slot is available
    const isSlotAvailable = React.useCallback((date, courtNumber, startTime, endTime, excludeBookingId = null) => {
        const courtBookings = getBookingsForDateAndCourt(date, courtNumber)
            .filter(b => b.booking_id !== excludeBookingId);

        // Parse times for comparison
        const newStart = startTime.replace(':', '');
        const newEnd = endTime.replace(':', '');

        for (const booking of courtBookings) {
            const existingStart = booking.time_start.replace(':', '');
            const existingEnd = booking.time_end.replace(':', '');

            // Check for overlap
            if (!(newEnd <= existingStart || newStart >= existingEnd)) {
                return false;
            }
        }

        return true;
    }, [getBookingsForDateAndCourt]);

    // Create booking (local + API)
    const createBooking = React.useCallback(async (bookingData, currentStaff) => {
        try {
            // Generate booking ID
            const bookingId = BookingId.generate(
                bookingData.date,
                bookingData.court,
                bookingData.time_start
            );

            const newBooking = {
                ...bookingData,
                booking_id: bookingId,
                status: 'active',
                created_by: currentStaff?.staff_id || 'unknown',
                created_at: new Date().toISOString(),
                modified_at: new Date().toISOString()
            };

            // Add to local state immediately
            setBookings(prev => [...prev, newBooking]);

            // Send to API
            await SheetsApi.createBooking(newBooking);

            return { success: true, booking: newBooking };
        } catch (err) {
            console.error('Error creating booking:', err);
            return { success: false, error: err.message };
        }
    }, []);

    // Update booking
    const updateBooking = React.useCallback(async (bookingId, updates) => {
        try {
            const updatedBooking = {
                ...updates,
                modified_at: new Date().toISOString()
            };

            // Update local state
            setBookings(prev => prev.map(b =>
                b.booking_id === bookingId
                    ? { ...b, ...updatedBooking }
                    : b
            ));

            // Send to API
            await SheetsApi.updateBooking(bookingId, updatedBooking);

            return { success: true };
        } catch (err) {
            console.error('Error updating booking:', err);
            return { success: false, error: err.message };
        }
    }, []);

    // Check in booking
    const checkInBooking = React.useCallback(async (bookingId, currentStaff) => {
        try {
            const now = new Date().toISOString();

            // Update local state
            setBookings(prev => prev.map(b =>
                b.booking_id === bookingId
                    ? {
                        ...b,
                        checked_in: 'TRUE',
                        checked_in_at: now,
                        checked_in_by: currentStaff?.staff_id || 'unknown',
                        modified_at: now
                    }
                    : b
            ));

            // Send to API
            await SheetsApi.checkIn(bookingId, currentStaff?.staff_id);

            return { success: true };
        } catch (err) {
            console.error('Error checking in:', err);
            return { success: false, error: err.message };
        }
    }, []);

    // Cancel booking
    const cancelBooking = React.useCallback(async (bookingId, currentStaff, reason, refundInfo) => {
        try {
            const now = new Date().toISOString();

            // Update local state
            setBookings(prev => prev.map(b =>
                b.booking_id === bookingId
                    ? {
                        ...b,
                        status: 'cancelled',
                        cancelled_at: now,
                        cancelled_by: currentStaff?.staff_id || 'unknown',
                        cancel_reason: reason,
                        refund_status: refundInfo.status,
                        refund_amount: refundInfo.amount,
                        refund_note: refundInfo.note,
                        modified_at: now
                    }
                    : b
            ));

            // Send to API
            await SheetsApi.cancelBooking(bookingId, currentStaff?.staff_id, reason, refundInfo);

            return { success: true };
        } catch (err) {
            console.error('Error cancelling booking:', err);
            return { success: false, error: err.message };
        }
    }, []);

    // Mark as no-show
    const markNoShow = React.useCallback(async (bookingId, currentStaff) => {
        try {
            const now = new Date().toISOString();

            // Update local state
            setBookings(prev => prev.map(b =>
                b.booking_id === bookingId
                    ? {
                        ...b,
                        status: 'no_show',
                        cancel_reason: 'no_show',
                        refund_status: 'none',
                        cancelled_at: now,
                        cancelled_by: currentStaff?.staff_id || 'unknown',
                        modified_at: now
                    }
                    : b
            ));

            // Send to API
            await SheetsApi.markNoShow(bookingId, currentStaff?.staff_id);

            return { success: true };
        } catch (err) {
            console.error('Error marking no-show:', err);
            return { success: false, error: err.message };
        }
    }, []);

    // Get statistics for a date
    const getStatsForDate = React.useCallback((date) => {
        const dateBookings = getBookingsForDate(date);

        const stats = {
            total: dateBookings.length,
            byType: {},
            checkedIn: 0,
            pending: 0,
            revenue: 0
        };

        dateBookings.forEach(b => {
            // Count by type
            stats.byType[b.booking_type] = (stats.byType[b.booking_type] || 0) + 1;

            // Check-in status
            if (b.checked_in === 'TRUE' || b.checked_in === true) {
                stats.checkedIn++;
            } else {
                stats.pending++;
            }

            // Revenue
            if (b.payment_amount) {
                stats.revenue += parseFloat(b.payment_amount) || 0;
            }
        });

        return stats;
    }, [getBookingsForDate]);

    // Initial load
    React.useEffect(() => {
        loadBookings();
    }, [loadBookings]);

    // Auto-refresh every 5 minutes
    React.useEffect(() => {
        const interval = setInterval(loadBookings, 5 * 60 * 1000);
        return () => clearInterval(interval);
    }, [loadBookings]);

    return {
        bookings,
        loading,
        error,
        lastUpdated,
        getBookingsForDate,
        getBookingsForCourt,
        getBookingsForDateAndCourt,
        getBookingById,
        getBookingsForDateRange,
        getBookingsByType,
        getBookingsForContractor,
        getBookingsForTeam,
        searchBookings,
        isSlotAvailable,
        createBooking,
        updateBooking,
        checkInBooking,
        cancelBooking,
        markNoShow,
        getStatsForDate,
        refresh: loadBookings
    };
};

// Make available globally
window.useBookings = useBookings;
